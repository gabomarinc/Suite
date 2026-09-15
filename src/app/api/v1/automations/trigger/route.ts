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
    const rawBody = await req.json().catch(() => ({}));
    const headers = req.headers;
    const sourceAppHeader = (headers.get('x-source-app') || '').toLowerCase();
    const apiKeyHeader = headers.get('x-api-key') || '';
    const workspaceIdHeader = headers.get('x-workspace-id') || '';
    const userEmailHeader = headers.get('x-user-email') || '';

    let appCode = (rawBody.appCode || sourceAppHeader || '').toLowerCase();
    let triggerName = rawBody.triggerName;
    let userId = rawBody.userId || headers.get('x-user-id') || '';
    let data = rawBody.data || {};

    const incomingEvent = (rawBody.event || triggerName || '').toString().toLowerCase();
    const isLeadsHub = appCode === 'leadshub' 
      || sourceAppHeader === 'leadshub' 
      || !!rawBody.event 
      || incomingEvent.startsWith('contact:') 
      || incomingEvent.startsWith('calendar:') 
      || incomingEvent.startsWith('conversation:') 
      || incomingEvent.startsWith('lead.');

    // --- SUPPORT FOR LEADSHUB WEBHOOK CONTRACT (7 Official Triggers + Aliases) ---
    // Accepts either:
    // 1. LeadsHUB Webhook format: { event: "contact:status_changed", data: { ... } }
    // 2. Standard Suite API format: { appCode: "leadshub", triggerName: "contact:status_changed" | "Estado de Prospecto Cambiado...", data: { ... } }
    if (isLeadsHub) {
      appCode = 'leadshub';
      const event = (rawBody.event || triggerName || '').toString().trim();
      const rawData = rawBody.data || {};
      const contact = (typeof rawData.contact === 'object' && rawData.contact !== null) ? rawData.contact : rawData;

      if (event === 'contact:created' || event === 'lead.created' || event.toLowerCase().includes('nuevo lead')) {
        triggerName = 'Nuevo Lead Registrado (Chat / Form)';
        data = {
          'ID del Lead': contact.id || contact.contactId || '',
          'Nombre del Lead': contact.name || contact.contactName || '',
          'Email del Lead': contact.email || contact.contactEmail || '',
          'Teléfono del Lead': contact.phone || contact.contactPhone || '',
          'Origen / Canal': rawData.channel || contact.channel || contact.source || 'WhatsApp',
          'Estado de Embudo': contact.prospectStatus || contact.status || 'Nuevo',
          'Puntaje de Scoring': String(contact.leadScore || contact.score || '50'),
          'Etiquetas del Lead': Array.isArray(contact.tags) ? contact.tags.join(', ') : (contact.tags || ''),
          'Resumen de IA': contact.summary || contact.aiSummary || '',
          'Notas / Mensaje': contact.notes || contact.message || '',
          'Fecha de Registro': rawBody.timestamp || contact.createdAt || new Date().toISOString(),
          ...rawData
        };
      } else if (event === 'contact:status_changed' || event === 'lead.status_changed' || event.toLowerCase().includes('status_changed') || event.toLowerCase().includes('calificado') || event.toLowerCase().includes('embudo kanban')) {
        triggerName = 'Estado de Prospecto Cambiado (Embudo Kanban)';
        data = {
          'ID del Lead': contact.id || contact.contactId || '',
          'Nombre del Lead': contact.name || contact.contactName || '',
          'Email del Lead': contact.email || contact.contactEmail || '',
          'Teléfono del Lead': contact.phone || contact.contactPhone || '',
          'Estado Anterior': rawData.prevStatus || '',
          'Nuevo Estado de Embudo': rawData.newStatus || contact.prospectStatus || '',
          'Puntaje de Scoring': String(contact.leadScore || contact.score || ''),
          'Asesor Asignado': contact.assignedTo || rawData.assignedTo || '',
          'Resumen de IA': contact.summary || '',
          'Fecha de Actualización': rawBody.timestamp || new Date().toISOString(),
          ...rawData
        };
      } else if (event === 'contact:tag_added' || event.toLowerCase().includes('tag_added') || event.toLowerCase().includes('etiqueta añadida')) {
        triggerName = 'Etiqueta Añadida a Lead';
        const addedTagsStr = Array.isArray(rawData.addedTags) ? rawData.addedTags.join(', ') : (rawData.addedTags || '');
        const allTagsStr = Array.isArray(contact.tags) ? contact.tags.join(', ') : (contact.tags || addedTagsStr);
        data = {
          'ID del Lead': contact.id || contact.contactId || '',
          'Nombre del Lead': contact.name || '',
          'Email del Lead': contact.email || '',
          'Teléfono del Lead': contact.phone || '',
          'Etiquetas Nuevas Añadidas': addedTagsStr,
          'Etiquetas Totales del Lead': allTagsStr,
          'Estado de Embudo': contact.prospectStatus || contact.status || '',
          'Puntaje de Scoring': String(contact.leadScore || ''),
          'Fecha de Actualización': rawBody.timestamp || new Date().toISOString(),
          ...rawData
        };
      } else if (event === 'contact:activity_added' || event.toLowerCase().includes('activity_added') || event.toLowerCase().includes('actividad o nota')) {
        triggerName = 'Nueva Actividad o Nota Registrada';
        const act = rawData.activity || {};
        data = {
          'ID de Actividad': act.id || '',
          'Tipo de Actividad': act.type || act.tipo || 'Nota',
          'Texto / Contenido de la Actividad': act.content || act.text || act.texto || '',
          'Fecha de Actividad': act.createdAt || act.date || act.fecha || rawBody.timestamp || new Date().toISOString(),
          'ID del Lead': contact.id || contact.contactId || '',
          'Nombre del Lead': contact.name || '',
          'Email del Lead': contact.email || '',
          'Teléfono del Lead': contact.phone || '',
          'Estado de Embudo': contact.prospectStatus || contact.status || '',
          ...rawData
        };
      } else if (event === 'calendar:event_created' || event === 'meeting.created' || event.toLowerCase().includes('event_created') || event.toLowerCase().includes('cita o reunión')) {
        triggerName = 'Cita o Reunión Agendada';
        data = {
          'ID de Cita': rawData.eventId || rawData.id || '',
          'Título de Cita': rawData.title || 'Cita Agendada por Agente',
          'Fecha y Hora de Inicio': rawData.startTime || '',
          'Fecha y Hora de Fin': rawData.endTime || '',
          'Enlace de Reunión / Ubicación': rawData.location || rawData.meetUrl || '',
          'Nombre del Lead': contact.name || rawData.contactName || '',
          'Email del Lead': contact.email || rawData.contactEmail || '',
          'Teléfono del Lead': contact.phone || rawData.contactPhone || '',
          'Categoría de Cita': rawData.category || 'Demostración',
          ...rawData
        };
      } else if (event === 'conversation:handoff_requested' || event === 'chat.handoff' || event.toLowerCase().includes('handoff') || event.toLowerCase().includes('transferida a humano')) {
        triggerName = 'Conversación Transferida a Humano (Handoff)';
        data = {
          'ID de Conversación': rawData.conversationId || rawData.id || '',
          'ID del Lead': contact.id || rawData.contactId || '',
          'Nombre del Lead': contact.name || rawData.contactName || '',
          'Email del Lead': contact.email || rawData.contactEmail || '',
          'Teléfono del Lead': contact.phone || rawData.contactPhone || '',
          'Departamento / Motivo': rawData.department || rawData.reason || 'Solicita atención humana',
          'Asesor Asignado': rawData.assignedTo || '',
          'Canal (WhatsApp / Instagram / Web)': rawData.channel || contact.channel || 'WhatsApp',
          'Último Mensaje del Cliente': rawData.lastMessage || rawData.message || '',
          ...rawData
        };
      } else if (event === 'conversation:closed' || event.toLowerCase().includes('conversation:closed') || event.toLowerCase().includes('cerrada o resuelta')) {
        triggerName = 'Conversación Cerrada o Resuelta';
        data = {
          'ID de Conversación': rawData.conversationId || rawData.id || '',
          'ID del Lead': contact.id || rawData.contactId || '',
          'Nombre del Lead': contact.name || rawData.contactName || '',
          'Email del Lead': contact.email || rawData.contactEmail || '',
          'Teléfono del Lead': contact.phone || rawData.contactPhone || '',
          'Estado de Conversación': rawData.status || 'Cerrada',
          'Estado de Embudo': contact.prospectStatus || 'Resuelto',
          'Resumen de IA': contact.summary || rawData.summary || '',
          'Fecha de Cierre': rawBody.timestamp || new Date().toISOString(),
          ...rawData
        };
      } else if (event === 'lead.intent_detected' || event === 'intent:detected' || event.toLowerCase().includes('intención comercial')) {
        triggerName = 'Intención Comercial Detectada por IA';
        data = {
          'ID del Lead': contact.id || rawData.contactId || '',
          'Nombre del Lead': contact.name || '',
          'Email del Lead': contact.email || '',
          'Teléfono del Lead': contact.phone || '',
          'Servicio o Producto de Interés': rawData.service || rawData.interest || '',
          'Presupuesto Mencionado': rawData.budget || '',
          'Nivel de Urgencia': rawData.urgency || 'Alto',
          'Resumen de Necesidad': rawData.summary || contact.summary || '',
          ...rawData
        };
      } else if (event) {
        triggerName = event;
      }

      // Resolve user by email, workspace or apiKey if userId not supplied directly
      if (!userId) {
        const emailToFind = userEmailHeader || rawBody.userEmail || rawBody.email;
        if (emailToFind) {
          const u = await prisma.user.findFirst({
            where: { email: { equals: emailToFind, mode: 'insensitive' } }
          });
          if (u) userId = u.id;
        }

        const wsIdToFind = workspaceIdHeader || rawBody.workspaceId;
        if (!userId && wsIdToFind) {
          const integ = await prisma.integration.findFirst({
            where: {
              appCode: 'leadshub',
              serviceKey: wsIdToFind
            }
          });
          if (integ) userId = integ.userId;
        }

        const keyToFind = apiKeyHeader || rawBody.apiKey;
        if (!userId && keyToFind) {
          const integ = await prisma.integration.findFirst({
            where: {
              appCode: 'leadshub',
              serviceKey: keyToFind
            }
          });
          if (integ) userId = integ.userId;
        }

        if (!userId && (data.email || data['Email del Lead'] || contact.email)) {
          const emailToFind = data.email || data['Email del Lead'] || contact.email;
          const u = await prisma.user.findFirst({
            where: { email: { equals: emailToFind, mode: 'insensitive' } }
          });
          if (u) userId = u.id;
        }
      }
    }

    if (!appCode || !triggerName || !userId) {
      return jsonResponse({ success: false, error: "Missing parameters (appCode, triggerName, userId)" }, { status: 400 });
    }

    const appConfig = ALL_APPS[appCode];
    if (!appConfig) {
      return jsonResponse({ success: false, error: `App config not found for ${appCode}` }, { status: 404 });
    }

    const triggerIdx = appConfig.triggers.findIndex(t => t.name === triggerName);
    if (triggerIdx === -1) {
      return jsonResponse({ success: false, error: `Trigger not found: ${triggerName}` }, { status: 404 });
    }

    const cleanUserId = userId.startsWith('kinde_') ? userId.replace('kinde_', '') : userId;

    // Resolve target userId using either id or legacyId to bridge Kinde IDs with legacy IDs
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
    const sourceAppList = [appCode];

    const rules = await prisma.automationRule.findMany({
      where: {
        userId: { in: [userId, cleanUserId, resolvedUserId] },
        sourceApp: { in: sourceAppList },
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
        
        const rawType = mappingTypes[field];
        // AUTO-HEAL: If rawType was 'static' but targetVal exists in enrichedData or matches known trigger outputs,
        // it was saved as 'static' due to the previous default fallback bug, so treat it as dynamic field!
        const isDynamicField = rawType === 'field' || (!rawType) || (enrichedData[targetVal] !== undefined);
        
        if (isDynamicField) {
          let val = enrichedData[targetVal];
          
          // Smart alias resolution if not found under exact key
          if (val === undefined || val === '') {
            const lowerTarget = (targetVal || '').toLowerCase();
            if (lowerTarget.includes('documento') || lowerTarget.includes('adjunto') || lowerTarget.includes('url') || lowerTarget.includes('pdf')) {
              val = enrichedData['Documento Adjunto (URL / PDF)'] || enrichedData['Documento Adjunto (URL)'] || enrichedData['Documento Adjunto'] || enrichedData['receiptUrl'] || enrichedData['Enlace de Factura en Bills'];
            } else if (lowerTarget.includes('lead') && lowerTarget.includes('nombre')) {
              val = enrichedData['Nombre del Lead'] || enrichedData['Nombre del Cliente'] || enrichedData['name'];
            } else if (lowerTarget.includes('cliente') && lowerTarget.includes('nombre')) {
              val = enrichedData['Nombre del Cliente'] || enrichedData['Nombre del Lead'] || enrichedData['clientName'] || enrichedData['name'];
            } else if (lowerTarget.includes('email') || lowerTarget.includes('correo')) {
              val = enrichedData['Email del Lead'] || enrichedData['Email del Cliente'] || enrichedData['clientEmail'] || enrichedData['email'];
            } else if (lowerTarget.includes('teléfono') || lowerTarget.includes('telefono') || lowerTarget.includes('phone')) {
              val = enrichedData['Teléfono del Lead'] || enrichedData['Teléfono del Cliente'] || enrichedData['phone'];
            } else if (lowerTarget.includes('total') || lowerTarget.includes('monto')) {
              val = enrichedData['Monto Total'] || enrichedData['total'] || enrichedData['amount'];
            } else if (lowerTarget.includes('concepto') || lowerTarget.includes('descrip') || lowerTarget.includes('resumen') || lowerTarget.includes('nota')) {
              val = enrichedData['Resumen de IA'] || enrichedData['Notas / Mensaje'] || enrichedData['Concepto de Venta'] || enrichedData['concept'] || enrichedData['summary'];
            } else if (lowerTarget.includes('fecha') || lowerTarget.includes('date') || lowerTarget.includes('inicio') || lowerTarget.includes('actualiz')) {
              val = enrichedData['Fecha de Actualización'] || enrichedData['Fecha de Registro'] || enrichedData['Fecha de Creación'] || new Date().toISOString();
            }
          }

          resolvedVariables[field] = val !== undefined && val !== null ? String(val) : '';
        } else {
          resolvedVariables[field] = targetVal || '';
        }
      }

      // Fetch target integration details using the correct rule.userId
      let targetIntegration = await prisma.integration.findUnique({
        where: {
          userId_appCode: {
            userId: rule.userId,
            appCode: targetApp
          }
        }
      });

      // Auto-fallback for LeadsHUB shared secret authentication (Section 03 of contract)
      const sharedSecret = process.env.KONSUL_ECOSYSTEM_SECRET_KEY 
        || process.env.INTERNAL_API_KEY 
        || 'konsul_ecosystem_secret_key';

      if (!targetIntegration && targetApp === 'leadshub') {
        targetIntegration = {
          id: 'auto_lh_' + rule.userId,
          userId: rule.userId,
          appCode: targetApp,
          serviceKey: sharedSecret,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

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
      } else if (targetApp === 'leadshub') {
        const appCfg = ALL_APPS.leadshub;
        const actionConfig = appCfg?.actions[rule.actionIdx];
        const actionName = actionConfig?.name || 'Acción en LeadsHUB';
        const leadshubUrl = process.env.LEADSHUB_URL 
          || process.env.NEXT_PUBLIC_LEADSHUB_URL 
          || 'https://agentes.konsul.digital';

        // Select endpoint and formatted payload according to action
        let endpoint = `${leadshubUrl}/api/v1/contacts`;
        let requestBody: any = { action: actionName, variables: resolvedVariables };

        if (actionName.includes('Mensaje Proactivo') || actionName.includes('WhatsApp')) {
          endpoint = `${leadshubUrl}/api/v1/messages/send`;
          requestBody = {
            to: resolvedVariables['Teléfono del Lead'] || resolvedVariables['Teléfono del Cliente'] || resolvedVariables['Teléfono'] || '',
            message: resolvedVariables['Mensaje a Enviar'] || resolvedVariables['Notas'] || '',
            mediaUrl: resolvedVariables['Documento Adjunto (URL / PDF)'] || resolvedVariables['Documento Adjunto (URL)'] || '',
            contactName: resolvedVariables['Nombre del Lead'] || resolvedVariables['Nombre del Cliente'] || ''
          };
        } else if (actionName.includes('Crear o Actualizar Lead')) {
          endpoint = `${leadshubUrl}/api/v1/contacts`;
          const phoneVal = resolvedVariables['Teléfono del Lead'] || resolvedVariables['Teléfono del Cliente'] || resolvedVariables['Teléfono'] || undefined;
          const emailVal = resolvedVariables['Email del Lead'] || resolvedVariables['Email del Cliente'] || undefined;
          requestBody = {
            name: resolvedVariables['Nombre del Lead'] || resolvedVariables['Nombre del Cliente'] || '',
            ...(phoneVal ? { phone: phoneVal } : {}),
            ...(emailVal ? { email: emailVal } : {}),
            identifier: phoneVal || emailVal || '',
            prospectStatus: resolvedVariables['Estado de Embudo'] || 'Nuevo',
            tags: resolvedVariables['Etiquetas (separadas por coma)'] 
              ? resolvedVariables['Etiquetas (separadas por coma)'].split(',').map((t: string) => t.trim()) 
              : [],
            leadScore: resolvedVariables['Puntaje de Scoring'] ? parseInt(resolvedVariables['Puntaje de Scoring']) : undefined,
            notes: resolvedVariables['Notas / Historial'] || resolvedVariables['Notas'] || '',
            customData: resolvedVariables
          };
        } else if (actionName.includes('Mover Lead de Estado')) {
          endpoint = `${leadshubUrl}/api/v1/contacts/status`;
          requestBody = {
            identifier: resolvedVariables['Teléfono o Email del Lead'] || resolvedVariables['Email del Cliente'] || resolvedVariables['Teléfono del Lead'] || '',
            prospectStatus: resolvedVariables['Nuevo Estado de Embudo'] || 'Calificado',
            note: resolvedVariables['Nota de Cambio de Estado'] || ''
          };
        } else if (actionName.includes('Añadir Etiquetas')) {
          endpoint = `${leadshubUrl}/api/v1/contacts/tags`;
          requestBody = {
            identifier: resolvedVariables['Teléfono o Email del Lead'] || resolvedVariables['Email del Cliente'] || resolvedVariables['Teléfono del Lead'] || '',
            tags: resolvedVariables['Etiquetas a Añadir'] 
              ? resolvedVariables['Etiquetas a Añadir'].split(',').map((t: string) => t.trim()) 
              : []
          };
        } else if (actionName.includes('Agendar Cita')) {
          endpoint = `${leadshubUrl}/api/v1/calendar/events`;
          requestBody = {
            identifier: resolvedVariables['Teléfono o Email del Lead'] || resolvedVariables['Email del Cliente'] || '',
            title: resolvedVariables['Título de Cita'] || 'Reunión Comercial',
            startTime: resolvedVariables['Fecha y Hora de Inicio'] || new Date().toISOString(),
            durationMinutes: resolvedVariables['Duración en Minutos'] ? parseInt(resolvedVariables['Duración en Minutos']) : 30,
            location: resolvedVariables['Enlace de Reunión / Ubicación'] || ''
          };
        } else if (actionName.includes('Registrar Nota')) {
          endpoint = `${leadshubUrl}/api/v1/contacts/activity`;
          requestBody = {
            identifier: resolvedVariables['Teléfono o Email del Lead'] || resolvedVariables['Email del Cliente'] || '',
            type: 'NOTE',
            content: resolvedVariables['Contenido de la Nota / Actividad'] || ''
          };
        } else if (actionName.includes('Asignar Asesor')) {
          endpoint = `${leadshubUrl}/api/v1/conversations/assign`;
          requestBody = {
            identifier: resolvedVariables['Teléfono o Email del Lead'] || resolvedVariables['Email del Cliente'] || '',
            assignee: resolvedVariables['Email o Nombre del Asesor'] || ''
          };
        }

        // Prepare headers according to Section 03 of LeadsHUB Contract
        const rawKey = targetIntegration.serviceKey || sharedSecret;
        const isLiveApiKey = rawKey.startsWith('lh_') || rawKey.startsWith('kp_');
        const apiKey = isLiveApiKey ? rawKey : sharedSecret;
        const workspaceId = (!isLiveApiKey && rawKey !== sharedSecret && rawKey.length > 5) ? rawKey : undefined;

        const lhHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-user-id': rule.userId,
          'x-user-email': userEmail,
          'x-user-name': userName
        };

        if (workspaceId) {
          lhHeaders['x-workspace-id'] = workspaceId;
        }

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: lhHeaders,
            body: JSON.stringify(requestBody)
          });

          let resData: any = {};
          try {
            resData = await response.json();
          } catch (e) {
            resData = { message: 'Respuesta recibida de LeadsHUB' };
          }

          // Section 04: Save discovered workspaceId for subsequent direct calls
          const returnedWsId = resData?.workspaceId || resData?.data?.workspaceId;
          if (returnedWsId) {
            if (!targetIntegration.id.startsWith('auto_lh_')) {
              await prisma.integration.update({
                where: { id: targetIntegration.id },
                data: { serviceKey: returnedWsId }
              }).catch(() => {});
            } else {
              await prisma.integration.upsert({
                where: { userId_appCode: { userId: rule.userId, appCode: targetApp } },
                create: { userId: rule.userId, appCode: targetApp, serviceKey: returnedWsId, isActive: true },
                update: { serviceKey: returnedWsId, isActive: true }
              }).catch(() => {});
            }
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
              errorDetails: isSuccess ? null : (resData.error?.message || resData.error || 'Error al procesar acción en LeadsHUB'),
              payloadSent: requestBody,
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
              errorDetails: fetchErr.message || 'Error de conexión con LeadsHUB',
              payloadSent: requestBody,
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
