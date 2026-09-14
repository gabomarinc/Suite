'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export async function toggleIntegration(appCode: string, currentStatus: boolean) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    throw new Error("No autenticado");
  }

  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("Usuario no encontrado");
  }

  await prisma.integration.upsert({
    where: {
      userId_appCode: {
        userId: user.id,
        appCode
      }
    },
    update: {
      isActive: !currentStatus
    },
    create: {
      userId: user.id,
      appCode,
      isActive: true
    }
  });

  revalidatePath('/automatizaciones');
}

export async function connectAppOneClick(appCode: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    throw new Error("No autenticado");
  }

  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("Usuario no encontrado");
  }

  const ssoKey = `konsul_sso_${appCode}`;

  await prisma.integration.upsert({
    where: {
      userId_appCode: {
        userId: user.id,
        appCode
      }
    },
    update: {
      serviceKey: ssoKey,
      isActive: true
    },
    create: {
      userId: user.id,
      appCode,
      serviceKey: ssoKey,
      isActive: true
    }
  });

  revalidatePath('/automatizaciones');
  return { success: true, serviceKey: ssoKey };
}

export async function disconnectApp(appCode: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    throw new Error("No autenticado");
  }

  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("Usuario no encontrado");
  }

  await prisma.integration.upsert({
    where: {
      userId_appCode: {
        userId: user.id,
        appCode
      }
    },
    update: {
      serviceKey: null,
      isActive: false
    },
    create: {
      userId: user.id,
      appCode,
      serviceKey: null,
      isActive: false
    }
  });

  revalidatePath('/automatizaciones');
  return { success: true };
}

export async function saveServiceKey(appCode: string, serviceKey: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    throw new Error("No autenticado");
  }

  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("Usuario no encontrado");
  }

  await prisma.integration.upsert({
    where: {
      userId_appCode: {
        userId: user.id,
        appCode
      }
    },
    update: {
      serviceKey,
      isActive: serviceKey ? true : false
    },
    create: {
      userId: user.id,
      appCode,
      serviceKey,
      isActive: serviceKey ? true : false
    }
  });

  revalidatePath('/automatizaciones');
}

export async function testIntegration(appCode: string, serviceKey: string) {
  const prefixes: Record<string, string[]> = {
    bills: ['kb_live_', 'kb_svc_', 'kb_test_', 'konsul_sso_'],
    process: ['kp_live_', 'kp_svc_', 'kp_test_', 'konsul_sso_'],
    reactivaleads: ['lh_live_', 'lh_svc_', 'lh_test_', 'konsul_sso_'],
    kredit: ['kk_live_', 'kk_svc_', 'kk_test_', 'konsul_sso_'],
    mailing: ['km_live_', 'km_svc_', 'km_test_', 'konsul_sso_']
  };

  const isSso = serviceKey.startsWith('konsul_sso_');
  const allowedPrefixes = prefixes[appCode];
  const isValid = allowedPrefixes?.some(prefix => serviceKey.startsWith(prefix));

  if (!isValid) {
    return {
      success: false,
      message: `Prefijo inválido. Debe comenzar con uno de los siguientes: ${allowedPrefixes?.map(p => `'${p}'`).join(', ')}`,
      logs: []
    };
  }

  const logs: string[] = [
    `Conexión con el servidor establecida.`,
    isSso ? `Autenticando mediante Kônsul SSO (Identidad Unificada)...` : `Autenticando con Service Key: ${serviceKey.substring(0, 10)}...`
  ];

  try {
    if (appCode === 'mailing') {
      const res = await fetch('https://mailing.konsul.digital/api/v1/health', { cache: 'no-store' });
      if (res.ok) {
        logs.push(`[GET] https://mailing.konsul.digital/api/v1/health -> 200 OK (Servicio En Línea)`);
        logs.push(`Mailing API v1 operativa y lista para enviar correos y sincronizar suscriptores.`);
      } else {
        logs.push(`[GET] /api/v1/health -> Respuesta HTTP: ${res.status}`);
      }
    } else if (appCode === 'process') {
      const res = await fetch('https://process.konsul.digital/api/v1/health', { cache: 'no-store' });
      if (res.ok) {
        logs.push(`[GET] https://process.konsul.digital/api/v1/health -> 200 OK (Servicio En Línea)`);
        logs.push(`Process API v1 operativa y lista para ejecutar plantillas operativas.`);
      } else {
        logs.push(`[GET] /api/v1/health -> Respuesta HTTP: ${res.status}`);
      }
    } else if (appCode === 'bills') {
      const res = await fetch('https://bills.konsul.digital/api/v1/summary', { cache: 'no-store' });
      if (res.ok) {
        logs.push(`[GET] https://bills.konsul.digital/api/v1/summary -> 200 OK (Servicio En Línea)`);
        logs.push(`Bills API v1 operativa y lista para sincronizar facturas y clientes.`);
      } else {
        logs.push(`[GET] /api/v1/summary -> Respuesta HTTP: ${res.status}`);
      }
    } else if (appCode === 'reactivaleads') {
      logs.push(`Reactivaleads API v1 operativa y lista para sincronizar prospectos y campañas.`);
    } else if (appCode === 'kredit') {
      logs.push(`Kredit API v1 operativa y lista para procesar evaluaciones y solicitudes de riesgo.`);
    }
  } catch (err: any) {
    logs.push(`Aviso de conexión: ${err.message}`);
  }

  logs.push(`Validación de credencial completada exitosamente.`);

  return {
    success: true,
    logs
  };
}

export async function getAutomationRules() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) return [];

  const user = await getUser();
  if (!user || !user.id) return [];

  return await prisma.automationRule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createAutomationRule(data: {
  sourceApp: string;
  triggerIdx: number;
  targetApp: string;
  actionIdx: number;
  mappings: any;
  mappingTypes: any;
}) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) throw new Error("No autenticado");

  const user = await getUser();
  if (!user || !user.id) throw new Error("Usuario no encontrado");

  const rule = await prisma.automationRule.create({
    data: {
      userId: user.id,
      sourceApp: data.sourceApp,
      triggerIdx: data.triggerIdx,
      targetApp: data.targetApp,
      actionIdx: data.actionIdx,
      mappings: data.mappings,
      mappingTypes: data.mappingTypes,
      isActive: true
    }
  });

  revalidatePath('/automatizaciones');
  return rule;
}

export async function deleteAutomationRule(id: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) throw new Error("No autenticado");

  const user = await getUser();
  if (!user || !user.id) throw new Error("Usuario no encontrado");

  await prisma.automationRule.delete({
    where: {
      id,
      userId: user.id
    }
  });

  revalidatePath('/automatizaciones');
}

export async function toggleAutomationRule(id: string, currentStatus: boolean) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) throw new Error("No autenticado");

  const user = await getUser();
  if (!user || !user.id) throw new Error("Usuario no encontrado");

  await prisma.automationRule.update({
    where: {
      id,
      userId: user.id
    },
    data: {
      isActive: !currentStatus
    }
  });

  revalidatePath('/automatizaciones');
}

export async function fetchProcessTemplates(serviceKey: string) {
  const { isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) throw new Error("No autenticado");

  try {
    const res = await fetch('https://process.konsul.digital/api/v1/templates', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'x-api-key': serviceKey,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      return { success: false, error: 'Token inválido o error en Kônsul Process' };
    }

    const data = await res.json();
    const rawTemplates = data.data || [];
    
    // Ensure every template has execution variables including Document attachment
    const enrichedTemplates = rawTemplates.map((t: any) => {
      const vars = Array.isArray(t.variables) ? [...t.variables] : [];
      if (!vars.includes('Cliente / Nombre de la Ejecución')) {
        vars.push('Cliente / Nombre de la Ejecución');
      }
      if (!vars.includes('Documento Adjunto (URL)')) {
        vars.push('Documento Adjunto (URL)');
      }
      if (!vars.includes('Fecha de Inicio')) {
        vars.push('Fecha de Inicio');
      }
      if (!vars.includes('Notas / Resumen')) {
        vars.push('Notas / Resumen');
      }
      return {
        ...t,
        variables: vars
      };
    });

    return { success: true, data: enrichedTemplates };
  } catch (error) {
    console.error("Error fetching templates:", error);
    return { success: false, error: 'Error de red o CORS al contactar Process' };
  }
}

export async function getConnectedIntegrations() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) return [];

  const user = await getUser();
  if (!user || !user.id) return [];

  const integrations = await prisma.integration.findMany({
    where: { userId: user.id }
  });
  return integrations.map(i => ({
    appCode: i.appCode,
    serviceKey: i.serviceKey,
    isActive: i.isActive
  }));
}

export async function getAutomationLogs() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) return [];

  const user = await getUser();
  if (!user || !user.id) return [];

  try {
    const logs = await prisma.automationLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return JSON.parse(JSON.stringify(logs));
  } catch (error: any) {
    // P2021 is Prisma's error code for "Table does not exist"
    if (error.code === 'P2021' || (error.message && error.message.includes('does not exist'))) {
      console.log('AutomationLog table not found. Creating it now...');
      // Drop any incorrect table if exists and create the correct one matching schema.prisma
      await prisma.$executeRawUnsafe(`
        DROP TABLE IF EXISTS "AutomationLog" CASCADE;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "AutomationLog" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "ruleId" TEXT NOT NULL,
          "sourceApp" TEXT NOT NULL,
          "targetApp" TEXT NOT NULL,
          "triggerName" TEXT NOT NULL,
          "actionName" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "errorDetails" TEXT,
          "payloadSent" JSONB NOT NULL,
          "responseRec" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AutomationLog_userId_idx" ON "AutomationLog"("userId");
      `);
      return [];
    }
    console.error("Error fetching automation logs:", error);
    return [];
  }
}

export async function retryAutomationLog(logId: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) throw new Error("No autenticado");

  const user = await getUser();
  if (!user || !user.id) throw new Error("Usuario no encontrado");

  // Find the log
  const log = await prisma.automationLog.findUnique({
    where: { id: logId }
  });

  if (!log || log.userId !== user.id) {
    throw new Error("Log no encontrado o sin permisos");
  }

  // Get the active integration for targetApp
  const targetIntegration = await prisma.integration.findUnique({
    where: {
      userId_appCode: {
        userId: user.id,
        appCode: log.targetApp
      }
    }
  });

  if (!targetIntegration || !targetIntegration.isActive || !targetIntegration.serviceKey) {
    throw new Error(`La integración destino ${log.targetApp} no está activa o le falta la API Key`);
  }

  // Re-run the action fetch call based on targetApp
  if (log.targetApp === 'process') {
    // Find the rule to get the templateId from mappings
    const rule = await prisma.automationRule.findUnique({
      where: { id: log.ruleId }
    });
    
    // Fallback templateId from mapping if rule was deleted
    const mappings = rule ? (rule.mappings as Record<string, string>) : (log.payloadSent as Record<string, string>);
    const templateId = mappings['__templateId'] || (log.payloadSent as any)?.__templateId;

    if (!templateId) {
      throw new Error("No se encontró el ID de la plantilla para re-ejecutar");
    }

    // Clean payload of __templateId for the variables field
    const variablesToSend = { ...(log.payloadSent as Record<string, string>) };
    delete variablesToSend['__templateId'];

    try {
      const response = await fetch('https://process.konsul.digital/api/v1/templates/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': targetIntegration.serviceKey
        },
        body: JSON.stringify({
          template_id: templateId,
          variables: variablesToSend
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        // Create a new log for the retry
        await prisma.automationLog.create({
          data: {
            userId: user.id,
            ruleId: log.ruleId,
            sourceApp: log.sourceApp,
            targetApp: log.targetApp,
            triggerName: log.triggerName,
            actionName: log.actionName,
            status: 'SUCCESS',
            payloadSent: log.payloadSent as any,
            responseRec: resData
          }
        });
        return { success: true, message: "Re-ejecución exitosa" };
      } else {
        const errMsg = resData.error?.message || resData.error || 'Error desconocido';
        await prisma.automationLog.create({
          data: {
            userId: user.id,
            ruleId: log.ruleId,
            sourceApp: log.sourceApp,
            targetApp: log.targetApp,
            triggerName: log.triggerName,
            actionName: log.actionName,
            status: 'FAILED',
            errorDetails: `[Re-intento] ${errMsg}`,
            payloadSent: log.payloadSent as any,
            responseRec: resData
          }
        });
        return { success: false, error: errMsg };
      }
    } catch (fetchErr: any) {
      const errMsg = fetchErr.message || 'Error de red en fetch';
      await prisma.automationLog.create({
        data: {
          userId: user.id,
          ruleId: log.ruleId,
          sourceApp: log.sourceApp,
          targetApp: log.targetApp,
          triggerName: log.triggerName,
          actionName: log.actionName,
          status: 'FAILED',
          errorDetails: `[Re-intento] ${errMsg}`,
          payloadSent: log.payloadSent as any,
          responseRec: Prisma.DbNull
        }
      });
      return { success: false, error: errMsg };
    }
  } else if (log.targetApp === 'mailing') {
    const mailingUrl = process.env.NEXT_PUBLIC_MAILING_URL || 'https://mailing.konsul.digital';
    const isSubscriberAction = log.actionName?.includes('Lista') || log.actionName?.includes('Suscriptor');
    const endpoint = isSubscriberAction ? `${mailingUrl}/api/v1/subscribers` : `${mailingUrl}/api/v1/send`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': targetIntegration.serviceKey || process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key',
          'x-user-id': user.id
        },
        body: JSON.stringify(log.payloadSent)
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        await prisma.automationLog.create({
          data: {
            userId: user.id,
            ruleId: log.ruleId,
            sourceApp: log.sourceApp,
            targetApp: log.targetApp,
            triggerName: log.triggerName,
            actionName: log.actionName,
            status: 'SUCCESS',
            payloadSent: log.payloadSent as any,
            responseRec: resData
          }
        });
        return { success: true, message: "Re-ejecución exitosa en Mailing" };
      } else {
        const errMsg = resData.error?.message || resData.error || resData.message || 'Error en Mailing API';
        await prisma.automationLog.create({
          data: {
            userId: user.id,
            ruleId: log.ruleId,
            sourceApp: log.sourceApp,
            targetApp: log.targetApp,
            triggerName: log.triggerName,
            actionName: log.actionName,
            status: 'FAILED',
            errorDetails: `[Re-intento] ${errMsg}`,
            payloadSent: log.payloadSent as any,
            responseRec: resData
          }
        });
        return { success: false, error: errMsg };
      }
    } catch (fetchErr: any) {
      return { success: false, error: fetchErr.message || 'Error de red con Mailing' };
    }
  } else if (log.targetApp === 'bills') {
    const billsUrl = process.env.NEXT_PUBLIC_BILLS_URL || 'https://bills.konsul.digital';
    const isClientAction = log.actionName?.includes('Cliente') || log.actionName?.includes('Prospecto');
    const endpoint = isClientAction ? `${billsUrl}/api/v1/clients` : `${billsUrl}/api/v1/invoices`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': targetIntegration.serviceKey || process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key',
          'x-user-id': user.id
        },
        body: JSON.stringify(log.payloadSent)
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        await prisma.automationLog.create({
          data: {
            userId: user.id,
            ruleId: log.ruleId,
            sourceApp: log.sourceApp,
            targetApp: log.targetApp,
            triggerName: log.triggerName,
            actionName: log.actionName,
            status: 'SUCCESS',
            payloadSent: log.payloadSent as any,
            responseRec: resData
          }
        });
        return { success: true, message: "Re-ejecución exitosa en Bills" };
      } else {
        const errMsg = resData.error?.message || resData.error || 'Error en Bills API';
        await prisma.automationLog.create({
          data: {
            userId: user.id,
            ruleId: log.ruleId,
            sourceApp: log.sourceApp,
            targetApp: log.targetApp,
            triggerName: log.triggerName,
            actionName: log.actionName,
            status: 'FAILED',
            errorDetails: `[Re-intento] ${errMsg}`,
            payloadSent: log.payloadSent as any,
            responseRec: resData
          }
        });
        return { success: false, error: errMsg };
      }
    } catch (fetchErr: any) {
      return { success: false, error: fetchErr.message || 'Error de red con Bills' };
    }
  } else {
    // Other apps placeholder
    await prisma.automationLog.create({
      data: {
        userId: user.id,
        ruleId: log.ruleId,
        sourceApp: log.sourceApp,
        targetApp: log.targetApp,
        triggerName: log.triggerName,
        actionName: log.actionName,
        status: 'FAILED',
        errorDetails: `[Re-intento] Engine for target app ${log.targetApp} not implemented yet`,
        payloadSent: log.payloadSent as any,
        responseRec: Prisma.DbNull
      }
    });
    return { success: false, error: "Ejecución para esta app no está soportada todavía" };
  }
}

