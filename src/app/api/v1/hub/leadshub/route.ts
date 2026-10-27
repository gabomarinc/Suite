import { NextResponse } from 'next/server';
import { validateSuiteApiKey, getLeadshubCredentials } from '@/lib/hubAuth';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-user-id',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const auth = await validateSuiteApiKey(req);
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: auth.error || 'Autenticación requerida con API Key de Suite en header x-api-key.'
      }
    }, { status: auth.status || 401, headers: CORS_HEADERS });
  }

  const creds = await getLeadshubCredentials(auth.userId);

  return NextResponse.json({
    success: true,
    hub: 'Kônsul Suite API Gateway',
    app: 'leadshub',
    version: '1.0.0',
    user: {
      id: auth.userId,
      email: auth.userEmail,
      name: auth.userName
    },
    leadshubConnection: {
      isConnected: creds.isConnected,
      serviceEndpoint: creds.leadshubUrl,
      status: creds.isConnected ? 'CONNECTED' : 'NOT_CONFIGURED',
      hint: creds.isConnected 
        ? 'Conexión activa. GrokBot puede consultar recursos en vivo.'
        : 'Debes conectar LeadsHUB en Kônsul Connect (https://suite.konsul.digital/automatizaciones).'
    },
    availableEndpoints: [
      {
        method: 'GET',
        path: '/api/v1/hub/leadshub/contacts',
        description: 'Buscar y listar prospectos o contactos del CRM',
        queryParams: ['search', 'status', 'tag', 'limit', 'offset']
      },
      {
        method: 'GET',
        path: '/api/v1/hub/leadshub/contacts/:id',
        description: 'Obtener detalle completo de un lead específico'
      },
      {
        method: 'POST',
        path: '/api/v1/hub/leadshub/contacts',
        description: 'Crear o actualizar un contacto/lead en el CRM',
        bodyFields: ['name', 'phone', 'email', 'company', 'notes', 'status', 'tags', 'customData']
      },
      {
        method: 'GET',
        path: '/api/v1/hub/leadshub/conversations',
        description: 'Listar conversaciones y chats de WhatsApp/canales'
      },
      {
        method: 'GET',
        path: '/api/v1/hub/leadshub/calendar/events',
        description: 'Listar citas agendadas y reuniones en el calendario'
      },
      {
        method: 'POST',
        path: '/api/v1/hub/leadshub/messages/send',
        description: 'Enviar mensaje de WhatsApp o canal a un lead',
        bodyFields: ['to', 'message', 'mediaUrl', 'contactName']
      }
    ]
  }, { headers: CORS_HEADERS });
}
