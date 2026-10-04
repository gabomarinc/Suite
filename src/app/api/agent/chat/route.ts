import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { ALL_APPS } from '@/lib/appsConfig';
import { checkAutomationHealthAndLoops, fetchProcessTemplates, fetchAppStages } from '@/app/automatizaciones/actions';

interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

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

    const history: ChatHistoryItem[] = Array.isArray(body.history) ? body.history : [];
    const userName = user.given_name || (user as any).name || 'Colega';
    const lowerMsg = message.toLowerCase();

    // 1. INYECCIÓN DE CONTEXTO REAL DE LA CUENTA
    const dbIntegrations = await prisma.integration.findMany({
      where: { userId: user.id }
    });
    const integrationsMap = new Map(dbIntegrations.map(i => [i.appCode, i]));

    const userRules = await prisma.automationRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    // =========================================================================
    // INTENT 1: CONSULTA DE PLANTILLAS EN PROCESS (API LIVE CALL)
    // =========================================================================
    if (
      (lowerMsg.includes('plantilla') || lowerMsg.includes('proceso') || lowerMsg.includes('template')) &&
      (lowerMsg.includes('process') || lowerMsg.includes('tengo') || lowerMsg.includes('hay') || lowerMsg.includes('listar') || lowerMsg.includes('ver')) &&
      !lowerMsg.includes('crear regla') && !lowerMsg.includes('automatizar')
    ) {
      const processIntegration = integrationsMap.get('process');
      const serviceKey = processIntegration?.serviceKey || 'konsul_sso_process';

      try {
        const templatesResult = await fetchProcessTemplates(serviceKey, user.email, user.id);
        const templates = templatesResult.success && Array.isArray(templatesResult.data) ? templatesResult.data : [];

        if (templates.length > 0) {
          let reply = `📂 **Plantillas registradas en Kônsul Process:**\n\n`;
          reply += `He consultado la API en vivo de tu organización y tienes **${templates.length} ${templates.length === 1 ? 'plantilla disponible' : 'plantillas disponibles'}**:\n\n`;

          templates.forEach((t: any, idx: number) => {
            reply += `**${idx + 1}. ${t.name || t.title}**\n`;
            if (t.description) reply += `• *Descripción:* ${t.description}\n`;
            if (Array.isArray(t.variables) && t.variables.length > 0) {
              reply += `• *Variables:* ${t.variables.slice(0, 4).join(', ')}${t.variables.length > 4 ? '...' : ''}\n`;
            }
            reply += `\n`;
          });

          reply += `¿Te gustaría vincular alguna de estas plantillas a un disparador automático (por ejemplo, para que se ejecute cuando un lead califique en LeadsHUB o se pague una factura en Bills)?`;

          return NextResponse.json({
            success: true,
            reply,
            actions: []
          });
        } else {
          let reply = `📂 **Plantillas en Kônsul Process:**\n\n`;
          reply += `He consultado la API de Process con tu cuenta (` + user.email + `), y actualmente **no tienes plantillas aprobadas o creadas** en tu espacio de trabajo.\n\n`;
          reply += `💡 **¿Cómo empezar?**\n`;
          reply += `1. Puedes ingresar a [Kônsul Process](https://process.konsul.digital) y crear una plantilla estándar (como *Onboarding de Clientes*, *Entrega de Proyecto* o *Revisión Contable*).\n`;
          reply += `2. En cuanto la crees, aparecerá automáticamente aquí para que podamos conectarla con tus otras apps.\n\n`;
          reply += `¿Te gustaría que te ayude a definir qué pasos y checklists debería tener tu primera plantilla?`;

          return NextResponse.json({
            success: true,
            reply,
            actions: []
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          reply: `⚠️ Hubo un inconveniente al consultar la API de Process: ${err.message || 'Error de conexión'}. Verifica que tu integración esté activa en la tarjeta de Kônsul Process.`,
          actions: []
        });
      }
    }

    // =========================================================================
    // INTENT 2: CONSULTA DE ESTADOS / EMBUDO EN LEADSHUB (API LIVE CALL)
    // =========================================================================
    if (
      (lowerMsg.includes('estado') || lowerMsg.includes('embudo') || lowerMsg.includes('etapa') || lowerMsg.includes('columna') || lowerMsg.includes('crm')) &&
      (lowerMsg.includes('leadshub') || lowerMsg.includes('lead') || lowerMsg.includes('prospecto')) &&
      !lowerMsg.includes('crear regla') && !lowerMsg.includes('automatizar')
    ) {
      try {
        const stagesResult = await fetchAppStages('leadshub');
        const stages = stagesResult.stages || [];

        let reply = `🎯 **Etapas del Embudo en Kônsul LeadsHUB:**\n\n`;
        reply += `He consultado tu configuración de CRM y estas son las columnas activas:\n\n`;

        stages.forEach((stg, i) => {
          reply += `**${i + 1}. ${stg}**\n`;
        });

        reply += `\nCualquiera de estas etapas puede utilizarse como **condición de disparo** para activar acciones en Bills, Process o Mailing.\n\n`;
        reply += `¿Te gustaría configurar una automatización cuando un prospecto entre a alguna de estas etapas?`;

        return NextResponse.json({
          success: true,
          reply,
          actions: []
        });
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          reply: `No pude leer los estados de LeadsHUB en este momento: ${err.message}.`,
          actions: []
        });
      }
    }

    // =========================================================================
    // INTENT 3: CONSULTA DE REGLAS ACTIVAS DEL USUARIO
    // =========================================================================
    if (
      lowerMsg.includes('mis reglas') || lowerMsg.includes('mis automatizaciones') ||
      lowerMsg.includes('qué reglas tengo') || lowerMsg.includes('cuántas reglas') ||
      lowerMsg.includes('ver mis flujos') || lowerMsg.includes('listar reglas')
    ) {
      if (userRules.length === 0) {
        return NextResponse.json({
          success: true,
          reply: `📋 Actualmente **no tienes ninguna regla de automatización configurada** en la Suite.\n\nPuedes pedirme conectar cualquier herramienta (ej. *"Conecta LeadsHUB con Process al ganar un lead"* o *"Crea una factura en Bills cuando se registre un nuevo cliente"*). ¿Qué proceso te gustaría automatizar primero?`,
          actions: []
        });
      }

      let reply = `📋 **Tus Automatizaciones Actuales (${userRules.length}):**\n\n`;
      userRules.forEach((rule, idx) => {
        const sourceConfig = ALL_APPS[rule.sourceApp];
        const targetConfig = ALL_APPS[rule.targetApp];
        const trigger = sourceConfig?.triggers[rule.triggerIdx]?.name || 'Disparador';
        const action = targetConfig?.actions[rule.actionIdx]?.name || 'Acción';
        const mappings = (rule.mappings as any) || {};
        const filter = mappings['__filterStatus'] ? ` *(Filtro: ${mappings['__filterStatus']})*` : '';

        reply += `**${idx + 1}. ${rule.sourceApp.toUpperCase()} ➔ ${rule.targetApp.toUpperCase()}** ${rule.isActive ? '🟢 Activa' : '⚪ Pausada'}\n`;
        reply += `• *Evento:* ${trigger}${filter}\n`;
        reply += `• *Acción:* ${action}\n\n`;
      });

      reply += `¿Deseas modificar alguna de estas reglas, probarlas en modo Dry-Run o crear una nueva conexión?`;

      return NextResponse.json({
        success: true,
        reply,
        actions: []
      });
    }

    // =========================================================================
    // INTENT 4: REVISIÓN DE SALUD, BUCLES Y GUARDRAILS
    // =========================================================================
    if (lowerMsg.includes('bucle') || lowerMsg.includes('loop') || lowerMsg.includes('salud') || lowerMsg.includes('auditor') || lowerMsg.includes('seguridad')) {
      const health = await checkAutomationHealthAndLoops();
      const hasCycles = health.detectedCycles.length > 0;

      let reply = `🛡️ **Reporte de Salud y Guardrails de tu Ecosistema**\n\n`;
      reply += `Hola **${userName}**, he analizado tus **${health.totalRules} reglas** registradas:\n\n`;
      reply += `• **Reglas Activas:** ${health.activeRules}\n`;
      reply += `• **Tasa de Éxito en Ejecuciones Recientes:** ${health.recentSuccessRate}%\n`;
      reply += `• **Límite de Cascada (Anti-Bucle):** Activo (Profundidad máxima = 3 saltos)\n`;
      reply += `• **Sanitizador Tipado de Variables:** Activo\n\n`;

      if (hasCycles) {
        reply += `⚠️ **Posibles dependencias circulares detectadas:**\n`;
        health.detectedCycles.forEach(c => {
          reply += `- **${c.ruleA}** y **${c.ruleB}**: ${c.description}\n`;
        });
        reply += `\n*El guardrail de Suite detendrá automáticamente cualquier cascada que supere 3 niveles para que tu cuenta nunca sufra cargos indebidos ni bloqueos.*\n\n`;
      } else {
        reply += `✅ **Grafo Limpio:** No existe ningún ciclo infinito entre tus aplicaciones. Todo está operando de forma estable.\n\n`;
      }

      reply += `¿Deseas que revisemos alguna regla en particular o que diseñemos un nuevo flujo paso a paso?`;

      return NextResponse.json({
        success: true,
        reply,
        actions: []
      });
    }

    // =========================================================================
    // INTENT 5: CREACIÓN O MODIFICACIÓN DE AUTOMATIZACIÓN (HUMAN-IN-THE-LOOP)
    // =========================================================================

    // Verificar si el último mensaje del asistente pedía confirmación para proceder
    const lastModelMsg = [...history].reverse().find(m => m.role === 'model')?.text || '';
    const wasWaitingForConfirmation = lastModelMsg.toLowerCase().includes('proceder') ||
      lastModelMsg.toLowerCase().includes('¿te parece bien') ||
      lastModelMsg.toLowerCase().includes('¿deseas que proceda') ||
      lastModelMsg.toLowerCase().includes('¿procedemos');

    const isExplicitConfirmation = /^(s[ií]|procede|proceder|dale|adelante|hazlo|creala|crear|confirmo|perfecto|de acuerdo|est[aá] bien|ok|vamos|dale con eso|claro|por favor)/i.test(message.trim()) ||
      (wasWaitingForConfirmation && /(s[ií]|procede|dale|adelante|hazlo|confirmo|perfecto|de acuerdo|est[aá] bien|ok)/i.test(message));

    // Identificar qué apps se mencionan estrictamente en la conversación
    const fullConversationText = [...history.map(h => h.text), message].join('\n').toLowerCase();

    const mentionsProcess = fullConversationText.includes('process');
    const mentionsBills = fullConversationText.includes('bills') || fullConversationText.includes('factura') || fullConversationText.includes('cotiza');
    const mentionsLeadsHub = fullConversationText.includes('leadshub') || fullConversationText.includes('lead') || fullConversationText.includes('prospecto') || fullConversationText.includes('whatsapp');
    const mentionsMailing = fullConversationText.includes('mailing') || fullConversationText.includes('correo masivo');
    const mentionsKredit = fullConversationText.includes('kredit') || fullConversationText.includes('credito') || fullConversationText.includes('riesgo');

    // Determinar origen y destino de acuerdo a lo que el usuario REALMENTE mencionó
    let sourceApp = 'leadshub';
    let targetApp = 'process';

    if (mentionsProcess && mentionsBills) {
      sourceApp = fullConversationText.includes('desde bills') ? 'bills' : 'process';
      targetApp = sourceApp === 'bills' ? 'process' : 'bills';
    } else if (mentionsLeadsHub && mentionsBills) {
      sourceApp = fullConversationText.includes('desde bills') ? 'bills' : 'leadshub';
      targetApp = sourceApp === 'bills' ? 'leadshub' : 'bills';
    } else if (mentionsLeadsHub && mentionsProcess) {
      sourceApp = fullConversationText.includes('desde process') ? 'process' : 'leadshub';
      targetApp = sourceApp === 'process' ? 'leadshub' : 'process';
    } else if (mentionsMailing && mentionsLeadsHub) {
      sourceApp = 'leadshub';
      targetApp = 'mailing';
    } else if (mentionsMailing && mentionsBills) {
      sourceApp = 'bills';
      targetApp = 'mailing';
    } else if (mentionsKredit) {
      sourceApp = 'leadshub';
      targetApp = 'kredit';
    } else if (mentionsBills) {
      sourceApp = 'bills';
      targetApp = 'leadshub';
    } else if (mentionsProcess) {
      sourceApp = 'leadshub';
      targetApp = 'process';
    }

    // Detectar estados o montos
    let detectedStatus = '';
    if (fullConversationText.includes('ganado') || fullConversationText.includes('cierre')) {
      detectedStatus = 'Ganado';
    } else if (fullConversationText.includes('calificado')) {
      detectedStatus = 'Calificado';
    } else if (fullConversationText.includes('interesado')) {
      detectedStatus = 'Interesado';
    } else if (fullConversationText.includes('agenda') || fullConversationText.includes('cita')) {
      detectedStatus = 'Cita Agendada';
    }

    const amountMatch = fullConversationText.match(/(\$?\s?([0-9]{2,6}))\s?(usd|dolares|dólares)?/i);
    const customAmount = amountMatch ? amountMatch[2] : '500';

    // --------------------------------------------------------------------------
    // CASO A: EL USUARIO YA CONFIRMÓ ("Procede", "Sí", "Adelante", etc.)
    // --------------------------------------------------------------------------
    if (isExplicitConfirmation) {
      let ruleData: any = null;

      if (sourceApp === 'leadshub' && targetApp === 'bills') {
        const filterStatus = detectedStatus || 'Ganado';
        ruleData = {
          title: `Crear Factura / Cotización en Bills cuando Lead sea "${filterStatus}"`,
          sourceApp: 'leadshub',
          triggerIdx: 1,
          triggerName: 'Estado de Prospecto Cambiado (Embudo Kanban)',
          filterStatus,
          targetApp: 'bills',
          actionIdx: 0,
          actionName: 'Crear Factura o Cotización',
          mappings: {
            '__filterStatus': filterStatus,
            'Nombre del Cliente': 'Nombre del Lead',
            'Nombre de Empresa': 'Nombre de Empresa',
            'Email del Cliente': 'Email del Lead',
            'Teléfono del Cliente': 'Teléfono del Lead',
            'Monto Total': customAmount,
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
        const filterStatus = detectedStatus || 'Calificado';
        ruleData = {
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
        ruleData = {
          title: 'Notificar por WhatsApp en LeadsHUB al Crear Factura en Bills',
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
        ruleData = {
          title: `Conexión: ${sourceApp.toUpperCase()} ➔ ${targetApp.toUpperCase()}`,
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

      let reply = `¡Entendido y confirmado! He preparado la automatización con los parámetros acordados y los guardrails de seguridad activos.\n\n`;
      reply += `A continuación tienes la **tarjeta interactiva del flujo**. Te sugiero pulsar primero **'⚡ Probar Dry-Run'** (verificará datos simulados con 0 riesgo en producción) o hacer clic en **'Activar en 1 Clic'** para dejarla operativa de inmediato:`;

      return NextResponse.json({
        success: true,
        reply,
        actions: [{
          type: 'suggest_automation_rule',
          ruleData
        }]
      });
    }

    // --------------------------------------------------------------------------
    // CASO B: EL USUARIO ESTÁ PLANTEANDO UNA NUEVA CONEXIÓN
    // (NO EJECUTAR DIRECTAMENTE, PREGUNTAR DETALLES Y PEDIR CONFIRMACIÓN)
    // --------------------------------------------------------------------------
    const targetStatus = detectedStatus || 'Calificado';
    const sourceName = ALL_APPS[sourceApp]?.name || sourceApp;
    const targetName = ALL_APPS[targetApp]?.name || targetApp;

    let reply = `He analizado tu idea para conectar **${sourceName}** con **${targetName}**:\n\n`;
    reply += `📋 **Estructura propuesta:**\n`;
    reply += `• **Disparador:** En ${sourceName}, cuando ocurra un evento relevante`;
    if (sourceApp === 'leadshub') {
      reply += ` (por ejemplo, cuando el prospecto pase a la columna **"${targetStatus}"**)`;
    }
    reply += `.\n`;

    if (targetApp === 'bills') {
      reply += `• **Acción en Bills:** Generar una **Factura o Cotización** en borrador con monto base de **$${customAmount} USD**.\n`;
    } else if (targetApp === 'process') {
      reply += `• **Acción en Process:** Iniciar la ejecución de una **Plantilla de Procesos** vinculada al cliente.\n`;
    } else if (targetApp === 'leadshub') {
      reply += `• **Acción en LeadsHUB:** Enviar un mensaje de notificación automática por WhatsApp.\n`;
    }

    reply += `\n🛡️ **Guardrails aplicados:** Detección de bucles infinitos y sanitización tipada de variables.\n\n`;
    reply += `**¿Te parece bien esta configuración para proceder y generar la tarjeta de automatización?**\n*(Respóndeme "Sí, procede" o dime si deseas ajustar algún estado o monto).*`;

    return NextResponse.json({
      success: true,
      reply,
      actions: []
    });

  } catch (error: any) {
    console.error('Agent Copilot Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno en el Copiloto Agéntico'
    }, { status: 500 });
  }
}
