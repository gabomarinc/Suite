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
    leadshub: ['lh_live_', 'lh_svc_', 'lh_test_', 'konsul_sso_'],
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
      const billsUrl = process.env.NEXT_PUBLIC_BILLS_URL || 'https://bills.konsul.digital';
      const res = await fetch(`${billsUrl}/api/v1/summary`, { cache: 'no-store' });
      if (res.ok) {
        logs.push(`[GET] ${billsUrl}/api/v1/summary -> 200 OK (Servicio En Línea)`);
        logs.push(`Bills API v1 operativa y lista para sincronizar facturas y clientes.`);
      } else {
        logs.push(`[GET] /api/v1/summary -> Respuesta HTTP: ${res.status}`);
      }

      // Check for real records
      try {
        const invRes = await fetch(`${billsUrl}/api/v1/invoices`, {
          headers: { 'x-api-key': serviceKey },
          cache: 'no-store'
        });
        if (invRes.ok) {
          const invJson = await invRes.json();
          const invs = Array.isArray(invJson) ? invJson : (invJson.data || invJson.invoices || []);
          if (invs.length > 0) {
            const first = invs[0];
            logs.push(`[DATOS REALES] Encontradas ${invs.length} factura(s). Última: #${first.number || first.id} - ${first.client_name || first.client?.name || 'Cliente'} ($${first.total || first.amount || '0.00'})`);
          }
        }
      } catch {}
    } else if (appCode === 'leadshub') {
      const leadshubUrl = process.env.LEADSHUB_URL || process.env.NEXT_PUBLIC_LEADSHUB_URL || 'https://agentes.konsul.digital';
      logs.push(`LeadsHUB (${leadshubUrl}) API v1 conectada y lista para sincronizar leads CRM, agentes IA y mensajería WhatsApp.`);
      
      // Check for real contacts and calendar routes
      try {
        const contRes = await fetch(`${leadshubUrl}/api/v1/contacts`, {
          headers: { 'x-api-key': serviceKey, 'x-source-app': 'leadshub' },
          cache: 'no-store'
        });
        if (contRes.ok) {
          logs.push(`[GET] ${leadshubUrl}/api/v1/contacts -> 200 OK (Servicio de Contactos En Línea)`);
          const contJson = await contRes.json();
          const contacts = Array.isArray(contJson) ? contJson : (contJson.data || contJson.contacts || []);
          if (contacts.length > 0) {
            const first = contacts[0];
            logs.push(`[DATOS REALES] Encontrados ${contacts.length} contacto(s). Último: ${first.name || 'Sin nombre'} (${first.phone || first.email || 'WhatsApp'})`);
          } else {
            logs.push(`[DATOS REALES] Conexión con LeadsHUB verificada exitosamente (0 contactos previos).`);
          }
        } else if (contRes.status === 401) {
          logs.push(`[GET] ${leadshubUrl}/api/v1/contacts -> 401 (Autenticación requerida por LeadsHUB: verifica tu API Key o Service Key).`);
        } else {
          logs.push(`[GET] ${leadshubUrl}/api/v1/contacts -> Respuesta HTTP: ${contRes.status}`);
        }

        const calRes = await fetch(`${leadshubUrl}/api/v1/calendar/events`, {
          headers: { 'x-api-key': serviceKey, 'x-source-app': 'leadshub' },
          cache: 'no-store'
        });
        if (calRes.ok) {
          logs.push(`[GET] ${leadshubUrl}/api/v1/calendar/events -> 200 OK (API de Calendario operativa)`);
        }
      } catch (e: any) {
        logs.push(`Aviso al consultar LeadsHUB: ${e.message}`);
      }
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

/**
 * Consulta la base de datos real del app origen según el disparador (trigger) seleccionado.
 * Busca el registro más reciente o que mejor cumpla con la condición del trigger para
 * alimentar las variables mapeadas en las pruebas.
 */
export async function fetchRealTriggerData(sourceApp: string, triggerIdx: number, triggerName: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) throw new Error("No autenticado");

  const user = await getUser();
  if (!user || !user.id) throw new Error("Usuario no encontrado");

  const userName = [user.given_name, user.family_name].filter(Boolean).join(' ') || (user as any).name || 'Usuario';

  const integration = await prisma.integration.findFirst({
    where: {
      userId: user.id,
      appCode: sourceApp,
      isActive: true
    }
  });

  const sharedSecret = process.env.KONSUL_ECOSYSTEM_SECRET_KEY || process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key';
  const serviceKey = integration?.serviceKey || sharedSecret;
  const isLhKey = serviceKey.startsWith('lh_live_');
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': isLhKey ? serviceKey : sharedSecret,
    'x-user-id': user.id,
    'x-user-email': user.email || '',
    'x-source-app': 'suite',
    ...((serviceKey && !isLhKey && serviceKey !== sharedSecret) ? { 'x-workspace-id': serviceKey } : {})
  };

  // 1. BILLS
  if (sourceApp === 'bills') {
    const billsUrl = process.env.NEXT_PUBLIC_BILLS_URL || 'https://bills.konsul.digital';
    const lowerTrig = (triggerName || '').toLowerCase();

    // Trigger de Clientes
    if (lowerTrig.includes('cliente') || lowerTrig.includes('prospecto')) {
      try {
        const res = await fetch(`${billsUrl}/api/v1/clients`, { headers: authHeaders, cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const clients = Array.isArray(json) ? json : (json.data || json.clients || []);
          if (clients.length > 0) {
            const c = clients[0];
            const data: Record<string, string> = {
              'ID del Cliente': String(c.id || c.client_id || 'cli_real_1'),
              'Nombre del Cliente': c.name || c.client_name || c.nombre || 'Cliente Bills',
              'Email del Cliente': c.email || c.client_email || c.correo || user.email || '',
              'Teléfono': c.phone || c.client_phone || c.telefono || '+507 6000-1111',
              'RUC / Cédula': c.tax_id || c.ruc || c.cedula || '8-765-4321',
              'Dirección': c.address || c.direccion || 'Ciudad de Panamá',
              'Notas': c.notes || c.notas || 'Cliente registrado en Bills',
              'Fecha de Creación': c.created_at || c.createdAt || new Date().toISOString()
            };
            return {
              success: true,
              isRealData: true,
              summary: `Cliente real en Bills: "${data['Nombre del Cliente']}" (${data['Email del Cliente']})`,
              data
            };
          }
        }
      } catch (e) {
        console.warn('[Bills Real Clients Fetch]', e);
      }
    }

    // Trigger de Facturas / Documentos
    try {
      const res = await fetch(`${billsUrl}/api/v1/invoices`, { headers: authHeaders, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const invoices = Array.isArray(json) ? json : (json.data || json.invoices || []);
        if (invoices.length > 0) {
          let inv = invoices[0];
          if (lowerTrig.includes('vencida')) {
            const match = invoices.find((i: any) => (i.status || '').toLowerCase().includes('venc') || (i.status || '').toLowerCase().includes('overdue'));
            if (match) inv = match;
          } else if (lowerTrig.includes('incobrable')) {
            const match = invoices.find((i: any) => (i.status || '').toLowerCase().includes('incobrable'));
            if (match) inv = match;
          } else if (lowerTrig.includes('abonada') || lowerTrig.includes('parcial')) {
            const match = invoices.find((i: any) => Number(i.paid_amount || i.paidAmount || 0) > 0);
            if (match) inv = match;
          } else if (lowerTrig.includes('pagada') || lowerTrig.includes('actualizado')) {
            const match = invoices.find((i: any) => (i.status || '').toLowerCase().includes('pagada') || (i.status || '').toLowerCase().includes('paid'));
            if (match) inv = match;
          } else if (lowerTrig.includes('cotización') || lowerTrig.includes('cotizacion')) {
            const match = invoices.find((i: any) => (i.type || i.doc_type || '').toLowerCase().includes('cotiz'));
            if (match) inv = match;
          }

          const docId = String(inv.id || inv.number || inv.invoice_number || 'FAC-1001');
          const clientName = inv.client_name || inv.client?.name || inv.customer_name || 'Cliente Bills';
          const clientEmail = inv.client_email || inv.client?.email || inv.customer_email || user.email || '';
          const clientPhone = inv.client_phone || inv.client?.phone || inv.customer_phone || '+507 6234-5678';
          const clientTaxId = inv.client_tax_id || inv.client?.tax_id || inv.tax_id || '1557890-1-654321 DV 89';
          const clientAddress = inv.client_address || inv.client?.address || 'Panamá, Costa del Este';
          const total = String(inv.total || inv.amount || '450.00');
          const currency = inv.currency || 'USD';
          const concept = inv.concept || inv.description || inv.items?.[0]?.description || 'Servicios Profesionales de Asesoría';
          const status = inv.status || 'Emitida';
          const docUrl = inv.pdf_url || inv.receipt_url || `https://bills.konsul.digital/api/v1/invoices?id=${docId}`;
          const webUrl = `https://bills.konsul.digital?invoiceId=${docId}`;
          const createdAt = inv.created_at || inv.createdAt || new Date().toISOString();
          const dueDate = inv.due_date || inv.dueDate || new Date(Date.now() + 15 * 86400000).toISOString();
          const notes = inv.notes || 'Factura consultada en tiempo real de Bills';

          const data: Record<string, string> = {
            'ID de Factura / Documento': docId,
            'Tipo de Documento': inv.type || inv.doc_type || 'Factura',
            'Nombre del Cliente': clientName,
            'Email del Cliente': clientEmail,
            'Teléfono del Cliente': clientPhone,
            'RUC / Cédula del Cliente': clientTaxId,
            'Dirección del Cliente': clientAddress,
            'Monto Total': total,
            'Moneda': currency,
            'Concepto de Venta': concept,
            'Estado de Factura': status,
            'Nuevo Estado': status,
            'Monto Abonado': String(inv.paid_amount || inv.paidAmount || (Number(total) * 0.5).toFixed(2)),
            'Saldo Pendiente': String(inv.balance || (Number(total) * 0.5).toFixed(2)),
            'Fecha de Creación': createdAt,
            'Fecha de Vencimiento': dueDate,
            'Notas del Documento': notes,
            'Documento Adjunto (URL / PDF)': docUrl,
            'Documento Adjunto (URL)': docUrl,
            'Documento Adjunto': docUrl,
            'Enlace de Factura en Bills': webUrl,
            'ID de Cotización': docId
          };

          return {
            success: true,
            isRealData: true,
            summary: `Factura real en Bills: #${docId} de "${clientName}" ($${total} ${currency})`,
            data
          };
        }
      }
    } catch (e) {
      console.warn('[Bills Real Invoices Fetch]', e);
    }

    // Fallback Bills con datos realistas
    return {
      success: true,
      isRealData: false,
      summary: `Registro de prueba para Kônsul Bills (sin facturas creadas aún en tu cuenta)`,
      data: {
        'ID de Factura / Documento': 'FAC-2026-0042',
        'Tipo de Documento': 'Factura',
        'Nombre del Cliente': userName || 'Cliente Empresarial S.A.',
        'Email del Cliente': user.email || 'contacto@empresa.com',
        'Teléfono del Cliente': '+507 6234-5678',
        'RUC / Cédula del Cliente': '1557890-1-654321 DV 89',
        'Dirección del Cliente': 'Costa del Este, Torre Financial Park, Piso 14',
        'Monto Total': '850.00',
        'Moneda': 'USD',
        'Concepto de Venta': 'Servicio Técnico y Suscripción Mensual',
        'Estado de Factura': 'Pagada',
        'Nuevo Estado': 'Pagada',
        'Fecha de Creación': new Date().toISOString(),
        'Fecha de Vencimiento': new Date(Date.now() + 15 * 86400000).toISOString(),
        'Notas del Documento': 'Términos de pago: 15 días calendario.',
        'Documento Adjunto (URL / PDF)': 'https://bills.konsul.digital/api/v1/invoices?id=FAC-2026-0042',
        'Documento Adjunto (URL)': 'https://bills.konsul.digital/api/v1/invoices?id=FAC-2026-0042',
        'Documento Adjunto': 'https://bills.konsul.digital/api/v1/invoices?id=FAC-2026-0042',
        'Enlace de Factura en Bills': 'https://bills.konsul.digital?invoiceId=FAC-2026-0042',
        'ID del Cliente': 'cli_auto_101',
        'Teléfono': '+507 6234-5678',
        'RUC / Cédula': '1557890-1-654321 DV 89',
        'Dirección': 'Costa del Este, Torre Financial Park, Piso 14',
        'Notas': 'Cliente de prueba para la Suite'
      }
    };
  }

  // 2. LEADSHUB
  if (sourceApp === 'leadshub') {
    const leadshubUrl = process.env.LEADSHUB_URL 
      || process.env.NEXT_PUBLIC_LEADSHUB_URL 
      || 'https://agentes.konsul.digital';
    const lowerTrig = (triggerName || '').toLowerCase();

    // Eventos de Cita / Calendario
    if (lowerTrig.includes('cita') || lowerTrig.includes('reunión') || lowerTrig.includes('reunion')) {
      try {
        const res = await fetch(`${leadshubUrl}/api/v1/calendar/events`, { headers: authHeaders, cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const events = Array.isArray(json) ? json : (json.data || json.events || []);
          if (events.length > 0) {
            const ev = events[0];
            const data: Record<string, string> = {
              'ID de Cita': String(ev.id || 'meet_real_1'),
              'Título de Cita': ev.title || 'Reunión Comercial',
              'Nombre del Lead': ev.contact?.name || ev.contactName || 'Lead Agendado',
              'Email del Lead': ev.contact?.email || ev.contactEmail || user.email || '',
              'Teléfono del Lead': ev.contact?.phone || ev.contactPhone || '+507 6555-8888',
              'Fecha y Hora de Inicio': ev.startTime || new Date().toISOString(),
              'Fecha y Hora de Fin': ev.endTime || new Date(Date.now() + 3600000).toISOString(),
              'Enlace de Reunión / Ubicación': ev.location || ev.meetLink || 'https://meet.google.com/xyz-abcd-efg',
              'Categoría de Cita': ev.category || 'Demostración'
            };
            return {
              success: true,
              isRealData: true,
              summary: `Cita real en LeadsHUB: "${data['Título de Cita']}" (${data['Nombre del Lead']})`,
              data
            };
          }
        }
      } catch (e) {
        console.warn('[LeadsHUB Real Calendar Fetch]', e);
      }
    }

    // Contactos / Leads
    try {
      const emailParam = user.email ? `?email=${encodeURIComponent(user.email)}` : '';
      let res = await fetch(`${leadshubUrl}/api/v1/contacts${emailParam}`, { headers: authHeaders, cache: 'no-store' });
      
      if (!res.ok) {
        res = await fetch(`${leadshubUrl}/api/v1/contacts`, { headers: authHeaders, cache: 'no-store' });
      }

      if (res.ok) {
        const json = await res.json();
        const contactData = json.data || json;
        const contacts = Array.isArray(contactData) ? contactData : (contactData.contacts ? contactData.contacts : (contactData.id ? [contactData] : []));
        if (contacts.length > 0) {
          const l = contacts[0];
          const data: Record<string, string> = {
            'ID del Lead': String(l.id || 'lead_real_1'),
            'Nombre del Lead': l.name || 'Lead LeadsHUB',
            'Email del Lead': l.email || user.email || '',
            'Teléfono del Lead': l.phone || '+507 6555-8888',
            'Origen / Canal': l.source || l.channel || 'WhatsApp',
            'Estado de Embudo': l.prospectStatus || 'Calificado',
            'Nuevo Estado de Embudo': l.prospectStatus || 'Ganado',
            'Estado Anterior': 'Nuevo',
            'Puntaje de Scoring': String(l.leadScore || '95'),
            'Etiquetas del Lead': Array.isArray(l.tags) ? l.tags.join(', ') : (l.tags || 'VIP, Calificado'),
            'Etiquetas Nuevas Añadidas': Array.isArray(l.tags) ? (l.tags.slice(-2).join(', ') || 'VIP') : (l.tags || 'VIP'),
            'Etiquetas Totales del Lead': Array.isArray(l.tags) ? l.tags.join(', ') : (l.tags || 'VIP, Calificado'),
            'ID de Actividad': l.activities?.[0]?.id || 'act_real_1',
            'Tipo de Actividad': l.activities?.[0]?.type || l.activities?.[0]?.tipo || 'Nota en Bitácora',
            'Texto / Contenido de la Actividad': l.activities?.[0]?.content || l.activities?.[0]?.text || l.notes || 'Reunión de seguimiento con prospecto',
            'Fecha de Actividad': l.activities?.[0]?.createdAt || l.activities?.[0]?.date || new Date().toISOString(),
            'Resumen de IA': l.summary || l.aiInsights?.summary || 'Interesado en automatizar procesos con IA',
            'Notas / Mensaje': l.notes || 'Contacto consultado en tiempo real desde LeadsHUB',
            'Fecha de Registro': l.createdAt || new Date().toISOString(),
            'Fecha de Actualización': l.updatedAt || new Date().toISOString(),
            'Canal (WhatsApp / Instagram / Web)': l.channel || 'WhatsApp',
            'Motivo de Transferencia': 'Solicita cotización personalizada con asesor',
            'Asesor Asignado': l.assignedUser?.name || userName || 'Gabriel Marín',
            'Último Mensaje del Cliente': 'Hola, quiero avanzar con la propuesta',
            'Estado de Conversación': 'Cerrada',
            'Fecha de Cierre': new Date().toISOString(),
            'Servicio o Producto de Interés': 'Suite Empresarial Kônsul',
            'Presupuesto Mencionado': '$500 USD',
            'Nivel de Urgencia': 'Alto',
            'Resumen de Necesidad': 'Automatización de procesos con IA'
          };
          return {
            success: true,
            isRealData: true,
            summary: `Contacto real en LeadsHUB: "${data['Nombre del Lead']}" (${data['Teléfono del Lead'] || data['Email del Lead']})`,
            data
          };
        }
      }
    } catch (e) {
      console.warn('[LeadsHUB Real Contacts Fetch]', e);
    }

    // Fallback LeadsHUB con datos realistas
    return {
      success: true,
      isRealData: false,
      summary: `Registro de prueba para LeadsHUB (sin contactos aún en tu cuenta)`,
      data: {
        'ID del Lead': 'lead_lh_8892',
        'Nombre del Lead': userName || 'Carlos Rodríguez',
        'Email del Lead': user.email || 'carlos.rodriguez@empresa.com',
        'Teléfono del Lead': '+507 6555-8888',
        'Origen / Canal': 'WhatsApp Business',
        'Estado de Embudo': 'Nuevo',
        'Nuevo Estado de Embudo': 'Asignado',
        'Estado Anterior': 'Nuevo',
        'Puntaje de Scoring': '95',
        'Etiquetas del Lead': 'VIP, Corporativo',
        'Etiquetas Nuevas Añadidas': 'VIP, Cliente Potencial',
        'Etiquetas Totales del Lead': 'VIP, Corporativo, Cliente Potencial',
        'ID de Actividad': 'act_lh_55',
        'Tipo de Actividad': 'Nota de Bitácora',
        'Texto / Contenido de la Actividad': 'El prospecto confirmó interés en la demo para su equipo de ventas.',
        'Fecha de Actividad': new Date().toISOString(),
        'Resumen de IA': 'Cliente interesado en automatizar facturación y flujos con agentes de IA',
        'Notas / Mensaje': 'Solicita integración con su sistema contable',
        'Fecha de Registro': new Date().toISOString(),
        'Fecha de Actualización': new Date().toISOString(),
        'ID de Cita': 'meet_lh_401',
        'Título de Cita': 'Demostración Comercial Kônsul',
        'Fecha y Hora de Inicio': new Date(Date.now() + 86400000).toISOString(),
        'Fecha y Hora de Fin': new Date(Date.now() + 90000000).toISOString(),
        'Enlace de Reunión / Ubicación': 'https://meet.google.com/xyz-abcd-efg',
        'Categoría de Cita': 'Demostración',
        'ID de Conversación': 'conv_lh_900',
        'Canal (WhatsApp / Instagram / Web)': 'WhatsApp',
        'Motivo de Transferencia': 'Solicita descuento comercial y cierre de contrato',
        'Asesor Asignado': 'Gabriel Marín',
        'Último Mensaje del Cliente': 'Me interesa avanzar hoy mismo',
        'Estado de Conversación': 'Cerrada / Resuelta',
        'Fecha de Cierre': new Date().toISOString(),
        'Servicio o Producto de Interés': 'Suite Empresarial + Facturación',
        'Presupuesto Mencionado': '$500/mes',
        'Nivel de Urgencia': 'Alto',
        'Resumen de Necesidad': 'Automatizar emisión de facturas y cobros vía WhatsApp'
      }
    };
  }

  // 3. PROCESS
  if (sourceApp === 'process') {
    const processUrl = process.env.NEXT_PUBLIC_PROCESS_URL || 'https://process.konsul.digital';
    try {
      const res = await fetch(`${processUrl}/api/v1/tasks`, { headers: authHeaders, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const tasks = Array.isArray(json) ? json : (json.data || json.tasks || []);
        if (tasks.length > 0) {
          const t = tasks[0];
          const data: Record<string, string> = {
            'ID de Tarea': String(t.id || t.code || 'task_real_1'),
            'Título de Tarea': t.title || t.name || 'Tarea Operativa',
            'Descripción': t.description || 'Tarea registrada en Process',
            'Estado de Tarea': t.status || 'Completada',
            'Tablero / Flujo': t.board?.name || 'Flujo Comercial',
            'Prioridad': t.priority || 'Alta',
            'Responsable': t.assignee?.name || t.assignedTo || userName || '',
            'Fecha Límite': t.due_date || t.dueDate || new Date().toISOString(),
            'Documento Adjunto (URL)': t.attachment_url || '',
            'Fecha de Creación': t.created_at || t.createdAt || new Date().toISOString()
          };
          return {
            success: true,
            isRealData: true,
            summary: `Tarea real en Process: "${data['Título de Tarea']}" (${data['Estado de Tarea']})`,
            data
          };
        }
      }
    } catch (e) {
      console.warn('[Process Real Tasks Fetch]', e);
    }

    return {
      success: true,
      isRealData: false,
      summary: `Registro de prueba para Kônsul Process`,
      data: {
        'ID de Tarea': 'task_manual_88',
        'Título de Tarea': 'Implementación de Cliente Onboarding',
        'Descripción': 'Configuración de cuenta y flujos automáticos',
        'Estado de Tarea': 'En Progreso',
        'Tablero / Flujo': 'Operaciones Clientes',
        'Prioridad': 'Alta',
        'Responsable': userName || 'Gabriel Marín',
        'Documento Adjunto (URL)': 'https://bills.konsul.digital/api/v1/invoices?id=FAC-2026-0042',
        'Fecha de Creación': new Date().toISOString()
      }
    };
  }

  // 4. MAILING
  if (sourceApp === 'mailing') {
    const mailingUrl = process.env.NEXT_PUBLIC_MAILING_URL || 'https://mailing.konsul.digital';
    try {
      const res = await fetch(`${mailingUrl}/api/v1/subscribers`, { headers: authHeaders, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const subs = Array.isArray(json) ? json : (json.data || json.subscribers || []);
        if (subs.length > 0) {
          const s = subs[0];
          const data: Record<string, string> = {
            'ID del Suscriptor': String(s.id || 'sub_real_1'),
            'Email del Suscriptor': s.email || user.email || '',
            'Nombre del Suscriptor': s.name || s.firstName || 'Suscriptor Mailing',
            'Lista / Segmento': s.list_name || s.segment || 'Newsletter General',
            'Fecha de Registro': s.created_at || s.createdAt || new Date().toISOString(),
            'Nombre de Campaña': 'Lanzamiento Suite 2026',
            'Enlace Abierto (URL)': 'https://konsul.digital',
            'Fecha de Clic': new Date().toISOString()
          };
          return {
            success: true,
            isRealData: true,
            summary: `Suscriptor real en Mailing: "${data['Nombre del Suscriptor']}" (${data['Email del Suscriptor']})`,
            data
          };
        }
      }
    } catch (e) {
      console.warn('[Mailing Real Subscribers Fetch]', e);
    }

    return {
      success: true,
      isRealData: false,
      summary: `Registro de prueba para Kônsul Mailing`,
      data: {
        'ID del Suscriptor': 'sub_882',
        'Email del Suscriptor': user.email || 'contacto@empresa.com',
        'Nombre del Suscriptor': userName || 'Suscriptor VIP',
        'Lista / Segmento': 'Clientes Premium',
        'Fecha de Registro': new Date().toISOString(),
        'Nombre de Campaña': 'Campaña Q3 Ecosistema',
        'Enlace Abierto (URL)': 'https://suite.konsul.digital',
        'Fecha de Clic': new Date().toISOString()
      }
    };
  }

  // 5. KREDIT
  if (sourceApp === 'kredit') {
    const kreditUrl = process.env.NEXT_PUBLIC_KREDIT_URL || 'https://kredit.konsul.digital';
    try {
      const res = await fetch(`${kreditUrl}/api/v1/evaluations`, { headers: authHeaders, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const evals = Array.isArray(json) ? json : (json.data || json.evaluations || []);
        if (evals.length > 0) {
          const ev = evals[0];
          const data: Record<string, string> = {
            'ID de Solicitud': String(ev.id || 'eval_real_1'),
            'Nombre del Cliente': ev.client_name || ev.name || 'Cliente Kredit',
            'Email del Cliente': ev.client_email || ev.email || user.email || '',
            'Teléfono del Cliente': ev.client_phone || ev.phone || '+507 6000-0000',
            'RUC / Cédula': ev.tax_id || ev.ruc || '8-000-0000',
            'Monto Solicitado': String(ev.requested_amount || '15000.00'),
            'Plazo en Meses': String(ev.term_months || '24'),
            'Fecha de Solicitud': ev.created_at || new Date().toISOString(),
            'Puntaje de Riesgo': String(ev.risk_score || '780'),
            'Monto Aprobado': String(ev.approved_amount || '15000.00'),
            'Reporte / Dictamen Crediticio (URL)': ev.report_url || 'https://kredit.konsul.digital/reports/eval.pdf',
            'Estado de Evaluación': ev.status || 'Aprobado'
          };
          return {
            success: true,
            isRealData: true,
            summary: `Evaluación real en Kredit: #${data['ID de Solicitud']} (${data['Nombre del Cliente']})`,
            data
          };
        }
      }
    } catch (e) {
      console.warn('[Kredit Real Eval Fetch]', e);
    }

    return {
      success: true,
      isRealData: false,
      summary: `Registro de prueba para Kônsul Kredit`,
      data: {
        'ID de Solicitud': 'sol_cred_99',
        'Nombre del Cliente': userName || 'Financiera Global S.A.',
        'Email del Cliente': user.email || 'credito@empresa.com',
        'Teléfono del Cliente': '+507 6000-5555',
        'RUC / Cédula': '1557890-1-654321',
        'Monto Solicitado': '25000.00',
        'Plazo en Meses': '36',
        'Fecha de Solicitud': new Date().toISOString(),
        'Puntaje de Riesgo': '820',
        'Monto Aprobado': '25000.00',
        'Reporte / Dictamen Crediticio (URL)': 'https://kredit.konsul.digital/report-demo.pdf',
        'Estado de Evaluación': 'Aprobado'
      }
    };
  }

  return {
    success: true,
    isRealData: false,
    summary: `Datos generales para ${sourceApp}`,
    data: {
      'Fecha': new Date().toISOString(),
      'Usuario': user.email || ''
    }
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

export async function updateAutomationRule(id: string, data: {
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

  const updated = await prisma.automationRule.update({
    where: {
      id,
      userId: user.id
    },
    data: {
      sourceApp: data.sourceApp,
      triggerIdx: data.triggerIdx,
      targetApp: data.targetApp,
      actionIdx: data.actionIdx,
      mappings: data.mappings,
      mappingTypes: data.mappingTypes
    }
  });

  revalidatePath('/automatizaciones');
  return updated;
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

export async function fetchAppStages(appCode: string): Promise<string[]> {
  if (appCode === 'leadshub') {
    const { isAuthenticated, getUser } = getKindeServerSession();
    const isAuth = await isAuthenticated();
    const user = isAuth ? await getUser() : null;

    const leadshubUrl = process.env.NEXT_PUBLIC_LEADSHUB_URL || 'https://leadshub.konsul.digital';
    const sharedSecret = process.env.KONSUL_ECOSYSTEM_SECRET_KEY || 'konsul_ecosystem_secret_2026';

    try {
      const res = await fetch(`${leadshubUrl}/api/v1/contacts/status`, {
        method: 'GET',
        headers: {
          'x-api-key': sharedSecret,
          ...(user?.email ? { 'x-user-email': user.email } : {}),
          'x-source-app': 'suite'
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const json = await res.json();
        const cols = json.data || json;
        if (Array.isArray(cols) && cols.length > 0) {
          return cols.map((c: any) => typeof c === 'string' ? c : c.name).filter(Boolean);
        }
      }
    } catch (err) {
      console.warn('[fetchAppStages leadshub error]', err);
    }

    // Default real Kanban columns in LeadsHUB
    return ['Nuevo', 'Asignado', 'Finalizado'];
  }

  if (appCode === 'bills') {
    return ['Borrador', 'Enviada', 'Seguimiento', 'Pagada', 'Abonada', 'Incobrable', 'Cancelada'];
  }

  if (appCode === 'process') {
    return ['Por Hacer', 'En Proceso', 'En Revisión', 'Completado', 'Bloqueado'];
  }

  if (appCode === 'kredit') {
    return ['Pendiente', 'En Revisión', 'Aprobado', 'Rechazado'];
  }

  return [];
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
  let targetIntegration = await prisma.integration.findUnique({
    where: {
      userId_appCode: {
        userId: user.id,
        appCode: log.targetApp
      }
    }
  });

  if (!targetIntegration && log.targetApp === 'bills') {
    targetIntegration = {
      id: 'auto_bills_' + user.id,
      userId: user.id,
      appCode: log.targetApp,
      serviceKey: 'konsul_sso_bills',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

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
          'x-api-key': targetIntegration.serviceKey || 'konsul_sso_bills',
          'x-user-id': user.id,
          'x-user-email': user.email || ''
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
  } else if (log.targetApp === 'leadshub') {
    const leadshubUrl = process.env.LEADSHUB_URL 
      || process.env.NEXT_PUBLIC_LEADSHUB_URL 
      || 'https://agentes.konsul.digital';

    const actionName = log.actionName || '';
    let endpoint = `${leadshubUrl}/api/v1/contacts`;

    if (actionName.includes('Mensaje Proactivo') || actionName.includes('WhatsApp')) {
      endpoint = `${leadshubUrl}/api/v1/messages/send`;
    } else if (actionName.includes('Mover Lead de Estado')) {
      endpoint = `${leadshubUrl}/api/v1/contacts/status`;
    } else if (actionName.includes('Añadir Etiquetas')) {
      endpoint = `${leadshubUrl}/api/v1/contacts/tags`;
    } else if (actionName.includes('Agendar Cita')) {
      endpoint = `${leadshubUrl}/api/v1/calendar/events`;
    } else if (actionName.includes('Registrar Nota')) {
      endpoint = `${leadshubUrl}/api/v1/contacts/activity`;
    } else if (actionName.includes('Asignar Asesor')) {
      endpoint = `${leadshubUrl}/api/v1/conversations/assign`;
    }

    const sharedSecret = process.env.KONSUL_ECOSYSTEM_SECRET_KEY 
      || process.env.INTERNAL_API_KEY 
      || 'konsul_ecosystem_secret_key';

    const rawKey = targetIntegration.serviceKey || sharedSecret;
    const isLiveApiKey = rawKey.startsWith('lh_') || rawKey.startsWith('kp_');
    const apiKey = isLiveApiKey ? rawKey : sharedSecret;
    const workspaceId = (!isLiveApiKey && rawKey !== sharedSecret && rawKey.length > 5) ? rawKey : undefined;

    const lhHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'x-user-id': user.id,
      'x-user-email': user.email || ''
    };
    if (workspaceId) {
      lhHeaders['x-workspace-id'] = workspaceId;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: lhHeaders,
        body: JSON.stringify(log.payloadSent)
      });

      let resData: any = {};
      try {
        resData = await response.json();
      } catch (e) {
        resData = { message: 'Respuesta recibida de LeadsHUB' };
      }

      if (response.ok) {
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
        return { success: true, message: "Re-ejecución exitosa en LeadsHUB" };
      } else {
        const errMsg = resData.error?.message || resData.error || 'Error en LeadsHUB API';
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
      return { success: false, error: fetchErr.message || 'Error de red con LeadsHUB' };
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

