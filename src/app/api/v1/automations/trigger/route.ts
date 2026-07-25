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

      // Resolve payload
      const resolvedVariables: Record<string, string> = {};
      for (const [field, targetVal] of Object.entries(mappings)) {
        if (field === '__templateId') continue;
        
        const type = mappingTypes[field] || 'field';
        if (type === 'field') {
          resolvedVariables[field] = data[targetVal] || '';
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
              'x-api-key': targetIntegration.serviceKey
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
      } else {
        // Other target apps placeholder (Mailing, Kredit, Reactivaleads, etc.)
        // For now, record as success/not implemented
        const log = await prisma.automationLog.create({
          data: {
            userId: rule.userId,
            ruleId: rule.id,
            sourceApp: appCode,
            targetApp,
            triggerName,
            actionName: ALL_APPS[targetApp]?.actions[rule.actionIdx]?.name || 'Acción',
            status: 'FAILED',
            errorDetails: `Execution engine for target app ${targetApp} not implemented yet`,
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
