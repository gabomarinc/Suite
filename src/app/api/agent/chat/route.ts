import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { ALL_APPS } from '@/lib/appsConfig';
import { checkAutomationHealthAndLoops, simulateAutomationDryRun } from '@/app/automatizaciones/actions';

export async function POST(req: Request) {
  try {
    const { isAuthenticated, getUser } = getKindeServerSession();
    const isAuth = await isAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const user = await getUser();
    if (!user || !user.id) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const message = (body.message || '').trim();
    if (!message) {
      return NextResponse.json({ success: false, error: 'El mensaje es obligatorio' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || body.geminiApiKey || req.headers.get('x-gemini-key');

    // 1. INYECCIÓN DE CONTEXTO REAL (Pilar 2)
    const dbIntegrations = await prisma.integration.findMany({
      where: { userId: user.id }
    });
    const activeApps = dbIntegrations.filter(i => i.isActive).map(i => i.appCode);

    const userRules = await prisma.automationRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    const contextSummary = {
      userName: user.given_name || (user as any).name || 'Colega',
      userEmail: user.email,
      activeApps: activeApps.length > 0 ? activeApps : ['bills', 'process', 'leadshub'],
      totalRulesCount: userRules.length,
      connectedAppsCount: activeApps.length
    };

    const lowerMsg = message.toLowerCase();

    // 2. CHECK SPECIFIC INTENTS: SALUD, BUCLES O DRY-RUN
    if (lowerMsg.includes('bucle') || lowerMsg.includes('loop') || lowerMsg.includes('salud') || lowerMsg.includes('seguridad') || lowerMsg.includes('auditor')) {
      const health = await checkAutomationHealthAndLoops();
      const hasCycles = health.detectedCycles.length > 0;

      let reply = `🛡️ **Reporte de Salud y Guardrails de Automatizaciones**\n\n`;
      reply += `• **Reglas Activas:** ${health.activeRules} de ${health.totalRules}\n`;
      reply += `• **Tasa de Éxito Reciente:** ${health.recentSuccessRate}%\n`;
      reply += `• **Guardrails Activos:** Límite de profundidad (Max Depth = 3), Circuit Breaker y Sanitizador Automático.\n\n`;

      if (hasCycles) {
        reply += `⚠️ **Atención:** Se detectaron posibles dependencias circulares:\n`;
        health.detectedCycles.forEach(c => {
          reply += `- **${c.ruleA}** y **${c.ruleB}**: ${c.description}\n`;
        });
        reply += `\n*Nota: El Guardrail de Profundidad de Kônsul cortará automáticamente cualquier cascada al llegar a profundidad 3 para proteger tu cuenta.*`;
      } else {
        reply += `✅ **Cero Riesgo de Bucles:** No se detectaron ciclos infinitos entre tus reglas actuales. Tus flujos están operando de manera óptima y segura.`;
      }

      return NextResponse.json({
        success: true,
        reply,
        actions: [{
          type: 'health_status',
          data: health
        }]
      });
    }

    // 3. INTENTO DE CREACIÓN O SUGERENCIA DE AUTOMATIZACIÓN
    // Analizar la petición para detectar apps origen, destino y condiciones
    let proposedRule: any = null;

    // Detect Source App
    let sourceApp = 'leadshub';
    if (lowerMsg.includes('bills') && (lowerMsg.includes('factura') || lowerMsg.includes('cobro') || lowerMsg.startsWith('cuando bills') || lowerMsg.includes('desde bills'))) {
      sourceApp = 'bills';
    } else if (lowerMsg.includes('process') && (lowerMsg.includes('tarea') || lowerMsg.includes('plantilla') || lowerMsg.startsWith('cuando process'))) {
      sourceApp = 'process';
    } else if (lowerMsg.includes('mailing')) {
      sourceApp = 'mailing';
    } else if (lowerMsg.includes('kredit')) {
      sourceApp = 'kredit';
    }

    // Detect Target App
    let targetApp = 'process';
    if (lowerMsg.includes('bills') || lowerMsg.includes('factura') || lowerMsg.includes('cotiza') || lowerMsg.includes('cobro')) {
      if (sourceApp !== 'bills') targetApp = 'bills';
    } else if (lowerMsg.includes('leadshub') || lowerMsg.includes('whatsapp') || lowerMsg.includes('mensaje') || lowerMsg.includes('chat') || lowerMsg.includes('notificar lead')) {
      if (sourceApp !== 'leadshub') targetApp = 'leadshub';
    } else if (lowerMsg.includes('mailing') || lowerMsg.includes('correo masivo') || lowerMsg.includes('lista de correo')) {
      if (sourceApp !== 'mailing') targetApp = 'mailing';
    } else if (lowerMsg.includes('kredit') || lowerMsg.includes('credito') || lowerMsg.includes('riesgo')) {
      if (sourceApp !== 'kredit') targetApp = 'kredit';
    }

    // Default trigger & action based on detected apps
    if (sourceApp === 'leadshub' && targetApp === 'bills') {
      const filterStatus = lowerMsg.includes('ganado') ? 'Ganado' : lowerMsg.includes('cierre') ? 'Cierre' : lowerMsg.includes('interesado') ? 'Interesado' : 'Calificado';
      proposedRule = {
        title: `Crear Factura / Cotización en Bills cuando Lead sea "${filterStatus}"`,
        sourceApp: 'leadshub',
        triggerIdx: 1, // Estado de Prospecto Cambiado
        triggerName: 'Estado de Prospecto Cambiado (Embudo Kanban)',
        filterStatus,
        targetApp: 'bills',
        actionIdx: 0, // Crear Factura o Cotización
        actionName: 'Crear Factura o Cotización',
        mappings: {
          '__filterStatus': filterStatus,
          'Nombre del Cliente': 'Nombre del Lead',
          'Nombre de Empresa': 'Nombre de Empresa',
          'Email del Cliente': 'Email del Lead',
          'Teléfono del Cliente': 'Teléfono del Lead',
          'Monto Total': '500',
          'Concepto de Venta': 'Servicio Kônsul acordado en chat',
          'Notas': 'Resumen de IA'
        },
        mappingTypes: {
          'Nombre del Cliente': 'field',
          'Nombre de Empresa': 'field',
          'Email del Cliente': 'field',
          'Teléfono del Cliente': 'field',
          'Monto Total': 'static',
          'Concepto de Venta': 'static',
          'Notas': 'field'
        }
      };
    } else if (sourceApp === 'leadshub' && targetApp === 'process') {
      const filterStatus = lowerMsg.includes('agenda') || lowerMsg.includes('cita') ? 'Cita Agendada' : lowerMsg.includes('calificado') ? 'Calificado' : 'Interesado';
      proposedRule = {
        title: `Ejecutar Plantilla en Process cuando Lead pase a "${filterStatus}"`,
        sourceApp: 'leadshub',
        triggerIdx: 1,
        triggerName: 'Estado de Prospecto Cambiado (Embudo Kanban)',
        filterStatus,
        targetApp: 'process',
        actionIdx: 0,
        actionName: 'Ejecutar Plantilla',
        mappings: {
          '__filterStatus': filterStatus,
          '__templateId': 'template_onboarding',
          'Cliente / Nombre de la Ejecución': 'Nombre del Lead',
          'Nombre de Empresa': 'Nombre de Empresa',
          'Email': 'Email del Lead',
          'Teléfono': 'Teléfono del Lead',
          'Notas / Contexto': 'Resumen de IA'
        },
        mappingTypes: {
          'Cliente / Nombre de la Ejecución': 'field',
          'Nombre de Empresa': 'field',
          'Email': 'field',
          'Teléfono': 'field',
          'Notas / Contexto': 'field'
        }
      };
    } else if (sourceApp === 'bills' && targetApp === 'leadshub') {
      proposedRule = {
        title: 'Enviar Notificación por WhatsApp en LeadsHUB al Crear Factura',
        sourceApp: 'bills',
        triggerIdx: 0,
        triggerName: 'Documento Creado (Factura/Cotización)',
        targetApp: 'leadshub',
        actionIdx: 0,
        actionName: 'Enviar Mensaje WhatsApp / Chat',
        mappings: {
          'Teléfono o Email del Lead': 'Teléfono del Cliente',
          'Mensaje de Texto': 'Hola {{Nombre del Cliente}}, te adjuntamos tu factura por {{Monto Total}} USD: {{Documento Adjunto (URL / PDF)}}'
        },
        mappingTypes: {
          'Teléfono o Email del Lead': 'field',
          'Mensaje de Texto': 'static'
        }
      };
    } else {
      // Generic smart rule proposal
      proposedRule = {
        title: `Conexión Inteligente: ${sourceApp.toUpperCase()} ➔ ${targetApp.toUpperCase()}`,
        sourceApp,
        triggerIdx: 0,
        triggerName: ALL_APPS[sourceApp]?.triggers[0]?.name || 'Evento de Origen',
        targetApp,
        actionIdx: 0,
        actionName: ALL_APPS[targetApp]?.actions[0]?.name || 'Acción Destino',
        mappings: {
          'Nombre del Cliente': 'Nombre del Lead',
          'Email del Cliente': 'Email del Lead'
        },
        mappingTypes: {
          'Nombre del Cliente': 'field',
          'Email del Cliente': 'field'
        }
      };
    }

    // 4. GENERAR RESPUESTA CON LENGUAJE NATURAL
    let reply = `He analizado tu solicitud y he estructurado una propuesta de automatización **a prueba de fallos** para conectar **${ALL_APPS[proposedRule.sourceApp]?.name || proposedRule.sourceApp}** con **${ALL_APPS[proposedRule.targetApp]?.name || proposedRule.targetApp}**.\n\n`;
    reply += `⚡ **Disparador:** ${proposedRule.triggerName}`;
    if (proposedRule.filterStatus) {
      reply += ` *(Filtro condicional: Estado = "${proposedRule.filterStatus}")*`;
    }
    reply += `\n🎯 **Acción a ejecutar:** ${proposedRule.actionName}\n`;
    reply += `🛡️ **Guardrails aplicados:** Mapeo tipado, sanitización de datos y límite de cascada (Depth limit: 3).\n\n`;
    reply += `Puedes probar esta regla de inmediato en modo **Simulación Dry-Run** (sin alterar datos reales) o activarla en un clic utilizando la tarjeta interactiva a continuación:`;

    return NextResponse.json({
      success: true,
      reply,
      actions: [{
        type: 'suggest_automation_rule',
        ruleData: proposedRule
      }]
    });

  } catch (error: any) {
    console.error('Agent Copilot Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno en el Copiloto Agéntico'
    }, { status: 500 });
  }
}
