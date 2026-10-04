import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { ALL_APPS } from '@/lib/appsConfig';
import { checkAutomationHealthAndLoops } from '@/app/automatizaciones/actions';

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
    const geminiKey = process.env.GEMINI_API_KEY || body.geminiApiKey || req.headers.get('x-gemini-key');

    // 1. INYECCIÓN DE CONTEXTO REAL DE LA CUENTA (Pilar 2)
    const dbIntegrations = await prisma.integration.findMany({
      where: { userId: user.id }
    });
    const activeApps = dbIntegrations.filter(i => i.isActive).map(i => i.appCode);

    const userRules = await prisma.automationRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    const userName = user.given_name || (user as any).name || 'Colega';
    const lowerMsg = message.toLowerCase();

    // 2. CHECK INTENT: SALUD, BUCLES Y GUARDRAILS
    if (lowerMsg.includes('bucle') || lowerMsg.includes('loop') || lowerMsg.includes('salud') || lowerMsg.includes('auditor')) {
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

    // 3. ANÁLISIS CONVERSACIONAL DE HISTORIAL Y ESTADO DEL DIÁLOGO (Pilar 4: Human-in-the-Loop)
    // Revisar si el último mensaje del asistente estaba preguntando confirmación para proceder
    const lastModelMsg = [...history].reverse().find(m => m.role === 'model')?.text || '';
    const wasWaitingForConfirmation = lastModelMsg.toLowerCase().includes('proceder') ||
      lastModelMsg.toLowerCase().includes('¿te parece bien') ||
      lastModelMsg.toLowerCase().includes('¿deseas que proceda') ||
      lastModelMsg.toLowerCase().includes('¿procedemos');

    // Detectar si el usuario está confirmando ("sí", "procede", "adelante", "dale", "hazlo", "de acuerdo", etc.)
    const isExplicitConfirmation = /^(s[ií]|procede|proceder|dale|adelante|hazlo|creala|crear|confirmo|perfecto|de acuerdo|est[aá] bien|ok|vamos|dale con eso|claro|por favor)/i.test(message.trim()) ||
      (wasWaitingForConfirmation && /(s[ií]|procede|dale|adelante|hazlo|confirmo|perfecto|de acuerdo|est[aá] bien|ok)/i.test(message));

    // Analizar todo el contexto conversacional reciente para reconstruir las apps e intenciones
    const fullConversationText = [...history.map(h => h.text), message].join('\n').toLowerCase();

    // Detección de Apps involucradas en la conversación
    let sourceApp = 'leadshub';
    if (fullConversationText.includes('desde bills') || fullConversationText.includes('cuando bills') || fullConversationText.includes('factura creada') || fullConversationText.includes('al crear factura')) {
      sourceApp = 'bills';
    } else if (fullConversationText.includes('desde process') || fullConversationText.includes('cuando process') || fullConversationText.includes('proceso terminado')) {
      sourceApp = 'process';
    } else if (fullConversationText.includes('mailing')) {
      sourceApp = 'mailing';
    } else if (fullConversationText.includes('kredit')) {
      sourceApp = 'kredit';
    }

    let targetApp = 'process';
    if (fullConversationText.includes('bills') || fullConversationText.includes('factura') || fullConversationText.includes('cotiza') || fullConversationText.includes('cobro')) {
      if (sourceApp !== 'bills') targetApp = 'bills';
    } else if (fullConversationText.includes('leadshub') || fullConversationText.includes('whatsapp') || fullConversationText.includes('mensaje') || fullConversationText.includes('notificar lead')) {
      if (sourceApp !== 'leadshub') targetApp = 'leadshub';
    } else if (fullConversationText.includes('mailing') || fullConversationText.includes('correo masivo')) {
      if (sourceApp !== 'mailing') targetApp = 'mailing';
    } else if (fullConversationText.includes('kredit') || fullConversationText.includes('credito')) {
      if (sourceApp !== 'kredit') targetApp = 'kredit';
    }

    // Detectar si se ha definido un estado del embudo o condición específica
    let detectedStatus = '';
    if (fullConversationText.includes('ganado') || fullConversationText.includes('cierre') || fullConversationText.includes('cerrado')) {
      detectedStatus = 'Ganado';
    } else if (fullConversationText.includes('calificado')) {
      detectedStatus = 'Calificado';
    } else if (fullConversationText.includes('interesado')) {
      detectedStatus = 'Interesado';
    } else if (fullConversationText.includes('agenda') || fullConversationText.includes('cita')) {
      detectedStatus = 'Cita Agendada';
    }

    // Detectar si se mencionó un monto específico
    const amountMatch = fullConversationText.match(/(\$?\s?([0-9]{2,6}))\s?(usd|dolares|dólares)?/i);
    const customAmount = amountMatch ? amountMatch[2] : '500';

    // --------------------------------------------------------------------------
    // CASO A: EL USUARIO YA CONFIRMÓ ("Procede", "Sí", "Adelante", etc.)
    // --------------------------------------------------------------------------
    if (isExplicitConfirmation) {
      // Construir la propuesta acordada formalmente
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
      reply += `A continuación tienes la **tarjeta interactiva del flujo**. Te sugiero probarla primero con **'⚡ Probar Dry-Run'** (verificará datos simulados con 0 riesgo en producción) o hacer clic en **'Activar en 1 Clic'** para dejarla operativa de inmediato:`;

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
    // CASO B: EL USUARIO PLANTEA UNA IDEA O REQUIERE ACLARACIÓN
    // (NO EJECUTAR DIRECTAMENTE, PREGUNTAR DETALLES Y PEDIR CONFIRMACIÓN)
    // --------------------------------------------------------------------------

    // Si aún no tenemos claro el estado o la acción específica, preguntamos:
    if (!detectedStatus && sourceApp === 'leadshub' && !lowerMsg.includes('onboarding') && !lowerMsg.includes('plantilla')) {
      let reply = `¡Excelente iniciativa, **${userName}**! Conectar **${ALL_APPS[sourceApp]?.name || 'LeadsHUB'}** con **${ALL_APPS[targetApp]?.name || targetApp}** potenciará mucho la operación de tu equipo.\n\n`;
      reply += `Para asegurarme de que el flujo quede exactamente como lo necesitas y a prueba de fallos, por favor indícame:\n\n`;
      reply += `1. **¿En qué momento exacto de LeadsHUB debe activarse?**\n`;
      reply += `   • Al calificar un lead (Estado: *Calificado*)\n`;
      reply += `   • Al ganar el negocio o llegar al cierre (Estado: *Ganado*)\n`;
      reply += `   • Cuando el prospecto agende una cita en el calendario\n\n`;

      if (targetApp === 'bills') {
        reply += `2. **¿Qué documento deseas emitir en Bills?** (¿Factura definitiva o Cotización preliminar?).\n`;
        reply += `3. **¿Deseas asignar un monto base** (ej. $500 USD) o prefieres que lo tome de una variable del chat?\n\n`;
      } else if (targetApp === 'process') {
        reply += `2. **¿Qué tipo de proceso debe iniciar en Process?** (ej. Onboarding de Cliente, Ejecución Operativa, o Seguimiento Legal).\n\n`;
      }

      reply += `Cuéntame estos detalles o si prefieres una recomendación estándar y te presento la propuesta para revisarla.`;

      return NextResponse.json({
        success: true,
        reply,
        actions: []
      });
    }

    // Si ya tenemos una idea clara de la regla pero AÚN NO ha sido confirmada por el usuario:
    // Le explicamos detalladamente lo que se va a hacer y LE PREGUNTAMOS SI PROCEDEMOS
    const targetStatus = detectedStatus || 'Calificado';
    const sourceName = ALL_APPS[sourceApp]?.name || sourceApp;
    const targetName = ALL_APPS[targetApp]?.name || targetApp;

    let reply = `He estructurado la propuesta de automatización para tu flujo entre **${sourceName}** y **${targetName}**:\n\n`;
    reply += `📋 **Lógica de la Regla:**\n`;
    reply += `• **Disparador:** Cada vez que en LeadsHUB un prospecto cambie a la etapa **"${targetStatus}"**.\n`;

    if (targetApp === 'bills') {
      reply += `• **Acción en Bills:** Crear automáticamente una **Factura / Cotización** en borrador.\n`;
      reply += `• **Datos transferidos:** Nombre del cliente, nombre de la empresa, email, teléfono, notas del chat de IA y un monto base de **$${customAmount} USD**.\n`;
    } else if (targetApp === 'process') {
      reply += `• **Acción en Process:** Ejecutar una instancia del proceso de **Onboarding de Clientes**.\n`;
      reply += `• **Datos transferidos:** Nombre del proyecto vinculado al cliente, datos de contacto y el resumen de IA generado en LeadsHUB.\n`;
    } else if (targetApp === 'leadshub') {
      reply += `• **Acción en LeadsHUB:** Enviar mensaje automatizado de WhatsApp con el enlace de la factura.\n`;
    }

    reply += `\n🛡️ **Garantía a prueba de fallos:**\n`;
    reply += `• Bloqueador de bucles infinitos activo (límite de 3 niveles de cascada).\n`;
    reply += `• Auto-sanitización de números y teléfonos para evitar errores 500 en las APIs de destino.\n\n`;
    reply += `**¿Te parece bien esta configuración para proceder y generar la tarjeta de automatización?**\n*(Respóndeme "Sí, procede" o indícame si deseas ajustar algún campo o monto).*`;

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
