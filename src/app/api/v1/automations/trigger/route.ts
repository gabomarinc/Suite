import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ALL_APPS } from '@/lib/appsConfig';
import { Prisma } from '@prisma/client';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-user-id',
};

function jsonResponse(data: any, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...init?.headers,
      ...CORS_HEADERS,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const { appCode, triggerName, userId, data = {} } = await req.json();

    if (!appCode || !triggerName || !userId) {
      return jsonResponse({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    // Resolve triggerIdx from triggerName
    const appConfig = ALL_APPS[appCode];
    if (!appConfig) {
      return jsonResponse({ success: false, error: `App config not found for ${appCode}` }, { status: 404 });
    }

    const triggerIdx = appConfig.triggers.findIndex(t => t.name === triggerName);
    if (triggerIdx === -1) {
      return jsonResponse({ success: false, error: `Trigger not found: ${triggerName}` }, { status: 404 });
    }

    const cleanUserId = userId.startsWith('kinde_') ? userId.replace('kinde_', '') : userId;

    // Resolve target userId using either id or legacyId to bridge Kinde IDs with Bills legacy IDs
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { legacyId: userId },
          { id: cleanUserId },
          { legacyId: cleanUserId }
        ]
      }
    });

    const resolvedUserId = dbUser ? dbUser.id : cleanUserId;

    // Find active automation rules
    const rules = await prisma.automationRule.findMany({
      where: {
        userId: { in: [userId, cleanUserId, resolvedUserId] },
        sourceApp: appCode,
        triggerIdx,
        isActive: true
      }
    });

    const executionResults = [];

    for (const rule of rules) {
      const targetApp = rule.targetApp;
      const mappings = (rule.mappings as Record<string, string>) || {};
      const mappingTypes = (rule.mappingTypes as Record<string, 'field' | 'static'>) || {};

      // Enrich data with cross-app aliases and document attachments
      const docId = data['id'] || data['ID de Factura / Documento'] || data['invoiceId'] || data['docId'] || '';
      const enrichedData: Record<string, any> = { ...data };

      if (appCode === 'bills') {
        const docUrl = data['Documento Adjunto (URL / PDF)'] 
          || data['Documento Adjunto (URL)'] 
          || data['Documento Adjunto'] 
          || data['receiptUrl'] 
          || data['receipt_url'] 
          || (docId ? `https://bills.konsul.digital/api/v1/invoices?id=${docId}` : '');

        enrichedData['ID de Factura / Documento'] = enrichedData['ID de Factura / Documento'] || docId;
        enrichedData['Documento Adjunto (URL / PDF)'] = docUrl;
        enrichedData['Documento Adjunto (URL)'] = docUrl;
        enrichedData['Documento Adjunto'] = docUrl;
        enrichedData['Enlace de Factura en Bills'] = enrichedData['Enlace de Factura en Bills'] || (docId ? `https://bills.konsul.digital?invoiceId=${docId}` : '');
      }

      // Resolve payload
      const resolvedVariables: Record<string, string> = {};
      for (const [field, targetVal] of Object.entries(mappings)) {
        if (field === '__templateId') continue;
        
        const type = mappingTypes[field] || 'field';
        if (type === 'field') {
          let val = enrichedData[targetVal];
          
          // Smart alias resolution if not found under exact key
          if (val === undefined || val === '') {
            const lowerTarget = targetVal.toLowerCase();
            if (lowerTarget.includes('documento') || lowerTarget.includes('adjunto') || lowerTarget.includes('url') || lowerTarget.includes('pdf')) {
              val = enrichedData['Documento Adjunto (URL / PDF)'] || enrichedData['Documento Adjunto (URL)'] || enrichedData['Documento Adjunto'] || enrichedData['receiptUrl'] || enrichedData['Enlace de Factura en Bills'];
            } else if (lowerTarget.includes('cliente') && lowerTarget.includes('nombre')) {
              val = enrichedData['Nombre del Cliente'] || enrichedData['clientName'] || enrichedData['name'];
            } else if (lowerTarget.includes('email') || lowerTarget.includes('correo')) {
              val = enrichedData['Email del Cliente'] || enrichedData['clientEmail'] || enrichedData['email'];
            } else if (lowerTarget.includes('total') || lowerTarget.includes('monto')) {
              val = enrichedData['Monto Total'] || enrichedData['total'] || enrichedData['amount'];
            } else if (lowerTarget.includes('concepto') || lowerTarget.includes('descrip')) {
              val = enrichedData['Concepto de Venta'] || enrichedData['concept'] || enrichedData['description'];
            }
          }

          resolvedVariables[field] = val !== undefined && val !== null ? String(val) : '';
        } else {
          resolvedVariables[field] = targetVal || '';
        }
      }

      // Fetch target integration details using the correct rule.userId
      const targetIntegration = await prisma.integration.findUnique({
        where: {
          userId_appCode: {
            userId: rule.userId,
            appCode: targetApp
          }
        }
      });

      if (!targetIntegration || !targetIntegration.isActive || !targetIntegration.serviceKey) {
        // Record failure
        const log = await prisma.automationLog.create({
          data: {
            userId: rule.userId,
            ruleId: rule.id,
            sourceApp: appCode,
            targetApp,
            triggerName,
            actionName: ALL_APPS[targetApp]?.actions[rule.actionIdx]?.name || 'Acción',
            status: 'FAILED',
            errorDetails: `Target integration ${targetApp} not active or missing API key`,
            payloadSent: resolvedVariables,
            responseRec: Prisma.DbNull
          }
        });
        executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
        continue;
      }

      // Look up user information for identity forwarding across the ecosystem
      const ruleUser = await prisma.user.findUnique({
        where: { id: rule.userId },
        select: { email: true, name: true, firstName: true }
      });
      const userEmail = ruleUser?.email || '';
      const userName = ruleUser?.name || ruleUser?.firstName || '';

      // Call target app endpoint
      if (targetApp === 'process') {
        const templateId = mappings['__templateId'];
        if (!templateId) {
          const log = await prisma.automationLog.create({
            data: {
              userId: rule.userId,
              ruleId: rule.id,
              sourceApp: appCode,
              targetApp,
              triggerName,
              actionName: 'Ejecutar Plantilla',
              status: 'FAILED',
              errorDetails: 'Template ID (__templateId) missing from rule mappings config',
              payloadSent: resolvedVariables,
              responseRec: Prisma.DbNull
            }
          });
          executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
          continue;
        }

        try {
          const response = await fetch('https://process.konsul.digital/api/v1/templates/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': targetIntegration.serviceKey,
              'x-user-id': rule.userId,
              'x-user-email': userEmail,
              'x-user-name': userName
            },
            body: JSON.stringify({
              template_id: templateId,
              variables: resolvedVariables
            })
          });

          const resData = await response.json();

          if (response.ok && resData.success) {
            const log = await prisma.automationLog.create({
              data: {
                userId: rule.userId,
                ruleId: rule.id,
                sourceApp: appCode,
                targetApp,
                triggerName,
                actionName: 'Ejecutar Plantilla',
                status: 'SUCCESS',
                payloadSent: resolvedVariables,
                responseRec: resData
              }
            });
            executionResults.push({ ruleId: rule.id, status: 'SUCCESS', logId: log.id });
          } else {
            const log = await prisma.automationLog.create({
              data: {
                userId: rule.userId,
                ruleId: rule.id,
                sourceApp: appCode,
                targetApp,
                triggerName,
                actionName: 'Ejecutar Plantilla',
                status: 'FAILED',
                errorDetails: resData.error?.message || resData.error || 'Unknown error response from Process API',
                payloadSent: resolvedVariables,
                responseRec: resData
              }
            });
            executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
          }
        } catch (fetchErr: any) {
          const log = await prisma.automationLog.create({
            data: {
              userId: rule.userId,
              ruleId: rule.id,
              sourceApp: appCode,
              targetApp,
              triggerName,
              actionName: 'Ejecutar Plantilla',
              status: 'FAILED',
              errorDetails: fetchErr.message || 'Network error executing trigger fetch call',
              payloadSent: resolvedVariables,
              responseRec: Prisma.DbNull
            }
          });
          executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
        }
      } else if (targetApp === 'bills') {
        const actionConfig = ALL_APPS.bills.actions[rule.actionIdx];
        const actionName = actionConfig?.name || 'Acción en Bills';

        const billsUrl = process.env.NEXT_PUBLIC_BILLS_URL || 'https://bills.konsul.digital';
        let endpoint = `${billsUrl}/api/v1/invoices`;
        let method = 'POST';
        let payload: any = {};

        if (actionName === 'Crear Factura o Cotización') {
          endpoint = `${billsUrl}/api/v1/invoices`;
          method = 'POST';
          payload = {
            clientName: resolvedVariables['Nombre del Cliente'],
            clientEmail: resolvedVariables['Email del Cliente'],
            total: resolvedVariables['Monto Total'],
            concept: resolvedVariables['Concepto de Venta'],
            type: 'Invoice',
            status: 'Creada'
          };
        } else if (actionName === 'Actualizar Estado de Factura') {
          endpoint = `${billsUrl}/api/v1/invoices`;
          method = 'PUT';
          payload = {
            id: resolvedVariables['ID de Factura'],
            status: resolvedVariables['Nuevo Estado']
          };
        } else if (actionName === 'Crear o Actualizar Cliente') {
          endpoint = `${billsUrl}/api/v1/clients`;
          method = 'POST';
          payload = {
            name: resolvedVariables['Nombre del Cliente'],
            email: resolvedVariables['Email del Cliente'],
            phone: resolvedVariables['Teléfono'],
            notes: resolvedVariables['Notas']
          };
        } else if (actionName === 'Añadir etiqueta a un cliente') {
          endpoint = `${billsUrl}/api/v1/clients`;
          method = 'POST';
          payload = {
            action: 'add_tag',
            email: resolvedVariables['Email del Cliente'],
            tags: resolvedVariables['Etiquetas']
          };
        } else if (actionName === 'Añadir nota interna a un cliente') {
          endpoint = `${billsUrl}/api/v1/clients`;
          method = 'POST';
          payload = {
            action: 'add_note',
            email: resolvedVariables['Email del Cliente'],
            notes: resolvedVariables['Notas']
          };
        } else if (actionName === 'Enviar recordatorio de pago al cliente (vía email)') {
          endpoint = `${billsUrl}/api/v1/invoices`;
          method = 'POST';
          payload = {
            action: 'remind',
            id: resolvedVariables['ID de Factura']
          };
        }

        try {
          const response = await fetch(endpoint, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': targetIntegration.serviceKey,
              'x-user-id': rule.userId,
              'x-user-email': userEmail
            },
            body: JSON.stringify(payload)
          });

          const resData = await response.json();

          if (response.ok && resData.success) {
            const log = await prisma.automationLog.create({
              data: {
                userId: rule.userId,
                ruleId: rule.id,
                sourceApp: appCode,
                targetApp,
                triggerName,
                actionName,
                status: 'SUCCESS',
                payloadSent: payload,
                responseRec: resData
              }
            });
            executionResults.push({ ruleId: rule.id, status: 'SUCCESS', logId: log.id });
          } else {
            const log = await prisma.automationLog.create({
              data: {
                userId: rule.userId,
                ruleId: rule.id,
                sourceApp: appCode,
                targetApp,
                triggerName,
                actionName,
                status: 'FAILED',
                errorDetails: resData.error || 'Unknown error response from Bills API',
                payloadSent: payload,
                responseRec: resData
              }
            });
            executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
          }
        } catch (fetchErr: any) {
          const log = await prisma.automationLog.create({
            data: {
              userId: rule.userId,
              ruleId: rule.id,
              sourceApp: appCode,
              targetApp,
              triggerName,
              actionName,
              status: 'FAILED',
              errorDetails: fetchErr.message || 'Network error executing trigger fetch call to Bills',
              payloadSent: payload,
              responseRec: Prisma.DbNull
            }
          });
          executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
        }
      } else if (targetApp === 'mailing') {
        const actionConfig = ALL_APPS.mailing.actions[rule.actionIdx];
        const actionName = actionConfig?.name || 'Acción en Mailing';
        const mailingUrl = process.env.NEXT_PUBLIC_MAILING_URL || 'https://mailing.konsul.digital';

        let endpoint = `${mailingUrl}/api/v1/send`;
        let payload: any = {};

        if (actionName === 'Añadir a Lista de Envío') {
          endpoint = `${mailingUrl}/api/v1/subscribers`;
          const email = resolvedVariables['Email del Suscriptor'] || resolvedVariables['Email del Cliente'] || resolvedVariables['Email del Lead'] || resolvedVariables['email'] || '';
          const name = resolvedVariables['Nombre del Suscriptor'] || resolvedVariables['Nombre del Cliente'] || resolvedVariables['Nombre del Lead'] || resolvedVariables['name'] || '';
          payload = {
            email,
            name,
            tags: ['Kônsul Suite', appCode],
            listName: 'Clientes Kônsul',
            userId: rule.userId
          };
        } else {
          endpoint = `${mailingUrl}/api/v1/send`;
          const to = resolvedVariables['Email Destinatario'] || resolvedVariables['Email del Cliente'] || resolvedVariables['Email del Lead'] || resolvedVariables['email'] || '';
          const subject = resolvedVariables['Asunto del Correo'] || `Notificación de Kônsul (${triggerName})`;
          const body = resolvedVariables['Cuerpo del Correo'] || `Hola ${resolvedVariables['Nombre del Cliente'] || ''},\n\nTe informamos que se ha procesado tu evento en Kônsul Suite.`;
          payload = {
            to,
            subject,
            body,
            userId: rule.userId
          };
        }

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': targetIntegration.serviceKey || process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key',
              'x-user-id': rule.userId,
              'x-user-email': userEmail,
              'x-user-name': userName
            },
            body: JSON.stringify(payload)
          });

          const resData = await response.json();

          if (response.ok && resData.success) {
            const log = await prisma.automationLog.create({
              data: {
                userId: rule.userId,
                ruleId: rule.id,
                sourceApp: appCode,
                targetApp,
                triggerName,
                actionName,
                status: 'SUCCESS',
                payloadSent: payload,
                responseRec: resData
              }
            });
            executionResults.push({ ruleId: rule.id, status: 'SUCCESS', logId: log.id });
          } else {
            const log = await prisma.automationLog.create({
              data: {
                userId: rule.userId,
                ruleId: rule.id,
                sourceApp: appCode,
                targetApp,
                triggerName,
                actionName,
                status: 'FAILED',
                errorDetails: resData.error?.message || resData.error || resData.message || 'Unknown error response from Mailing API',
                payloadSent: payload,
                responseRec: resData
              }
            });
            executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
          }
        } catch (fetchErr: any) {
          const log = await prisma.automationLog.create({
            data: {
              userId: rule.userId,
              ruleId: rule.id,
              sourceApp: appCode,
              targetApp,
              triggerName,
              actionName,
              status: 'FAILED',
              errorDetails: fetchErr.message || 'Network error executing trigger fetch call to Mailing',
              payloadSent: payload,
              responseRec: Prisma.DbNull
            }
          });
          executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
        }
      } else if (targetApp === 'reactivaleads') {
        const actionConfig = ALL_APPS.reactivaleads?.actions[rule.actionIdx];
        const actionName = actionConfig?.name || 'Acción en Reactivaleads';
        const reactivaUrl = process.env.NEXT_PUBLIC_REACTIVALEADS_URL || 'https://reactivaleads.konsul.digital';

        try {
          const response = await fetch(`${reactivaUrl}/api/v1/leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': targetIntegration.serviceKey || 'konsul_ecosystem_secret_key',
              'x-user-id': rule.userId,
              'x-user-email': userEmail,
              'x-user-name': userName
            },
            body: JSON.stringify({
              action: actionName,
              variables: resolvedVariables
            })
          });

          let resData: any = {};
          try {
            resData = await response.json();
          } catch (e) {
            resData = { message: 'Respuesta recibida de Reactivaleads' };
          }

          const isSuccess = response.ok;
          const log = await prisma.automationLog.create({
            data: {
              userId: rule.userId,
              ruleId: rule.id,
              sourceApp: appCode,
              targetApp,
              triggerName,
              actionName,
              status: isSuccess ? 'SUCCESS' : 'FAILED',
              errorDetails: isSuccess ? null : (resData.error?.message || resData.error || 'Error al procesar acción en Reactivaleads'),
              payloadSent: resolvedVariables,
              responseRec: resData
            }
          });
          executionResults.push({ ruleId: rule.id, status: isSuccess ? 'SUCCESS' : 'FAILED', logId: log.id });
        } catch (fetchErr: any) {
          const log = await prisma.automationLog.create({
            data: {
              userId: rule.userId,
              ruleId: rule.id,
              sourceApp: appCode,
              targetApp,
              triggerName,
              actionName,
              status: 'FAILED',
              errorDetails: fetchErr.message || 'Error de conexión con Reactivaleads',
              payloadSent: resolvedVariables,
              responseRec: Prisma.DbNull
            }
          });
          executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
        }
      } else if (targetApp === 'kredit') {
        const actionConfig = ALL_APPS.kredit?.actions[rule.actionIdx];
        const actionName = actionConfig?.name || 'Acción en Kredit';
        const kreditUrl = process.env.NEXT_PUBLIC_KREDIT_URL || 'https://kredit.konsul.digital';

        try {
          const response = await fetch(`${kreditUrl}/api/v1/evaluations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': targetIntegration.serviceKey || 'konsul_ecosystem_secret_key',
              'x-user-id': rule.userId,
              'x-user-email': userEmail,
              'x-user-name': userName
            },
            body: JSON.stringify({
              action: actionName,
              variables: resolvedVariables
            })
          });

          let resData: any = {};
          try {
            resData = await response.json();
          } catch (e) {
            resData = { message: 'Respuesta recibida de Kredit' };
          }

          const isSuccess = response.ok;
          const log = await prisma.automationLog.create({
            data: {
              userId: rule.userId,
              ruleId: rule.id,
              sourceApp: appCode,
              targetApp,
              triggerName,
              actionName,
              status: isSuccess ? 'SUCCESS' : 'FAILED',
              errorDetails: isSuccess ? null : (resData.error?.message || resData.error || 'Error al procesar acción en Kredit'),
              payloadSent: resolvedVariables,
              responseRec: resData
            }
          });
          executionResults.push({ ruleId: rule.id, status: isSuccess ? 'SUCCESS' : 'FAILED', logId: log.id });
        } catch (fetchErr: any) {
          const log = await prisma.automationLog.create({
            data: {
              userId: rule.userId,
              ruleId: rule.id,
              sourceApp: appCode,
              targetApp,
              triggerName,
              actionName,
              status: 'FAILED',
              errorDetails: fetchErr.message || 'Error de conexión con Kredit',
              payloadSent: resolvedVariables,
              responseRec: Prisma.DbNull
            }
          });
          executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
        }
      } else {
        const log = await prisma.automationLog.create({
          data: {
            userId: rule.userId,
            ruleId: rule.id,
            sourceApp: appCode,
            targetApp,
            triggerName,
            actionName: ALL_APPS[targetApp]?.actions[rule.actionIdx]?.name || 'Acción',
            status: 'FAILED',
            errorDetails: `Destino ${targetApp} desconocido`,
            payloadSent: resolvedVariables,
            responseRec: Prisma.DbNull
          }
        });
        executionResults.push({ ruleId: rule.id, status: 'FAILED', logId: log.id });
      }
    }

    return jsonResponse({ success: true, processedRulesCount: rules.length, results: executionResults });
  } catch (error: any) {
    console.error("Automation Trigger Error:", error);
    return jsonResponse({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
