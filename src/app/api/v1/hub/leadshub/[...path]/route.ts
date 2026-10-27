import { NextResponse } from 'next/server';
import { validateSuiteApiKey, getLeadshubCredentials } from '@/lib/hubAuth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-user-id',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function handleProxy(req: Request, { params }: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams.path || [];
  const targetPath = pathSegments.join('/');
  const incomingUrl = new URL(req.url);
  const search = incomingUrl.search;

  // 1. Validar autenticación por API Key de Suite
  const auth = await validateSuiteApiKey(req);
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: auth.error || 'Autenticación requerida con API Key de Suite.'
      }
    }, { status: auth.status || 401, headers: CORS_HEADERS });
  }

  // 2. Verificar que el usuario tenga LeadsHUB conectado en Suite
  const creds = await getLeadshubCredentials(auth.userId);
  if (!creds.isConnected) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'LEADSHUB_NOT_CONNECTED',
        message: 'Tu cuenta de Kônsul Suite no tiene Kônsul LeadsHUB conectado. Ingresa a https://suite.konsul.digital/automatizaciones y activa la conexión de LeadsHUB para habilitar consultas desde GrokBot.'
      }
    }, { status: 400, headers: CORS_HEADERS });
  }

  // 3. Preparar llamada interna a LeadsHUB
  const targetUrl = `${creds.leadshubUrl}/api/v1/${targetPath}${search}`;
  let reqBody: any = null;

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      reqBody = await req.json();
    } catch {
      reqBody = null;
    }
  }

  const outboundHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': creds.serviceKey,
    'x-user-id': auth.userId,
    'x-source-app': 'suite_gateway_grokbot',
    'x-konsul-agent': 'grokbot'
  };

  if (auth.userEmail) {
    outboundHeaders['x-user-email'] = auth.userEmail;
  }
  if (auth.userName) {
    outboundHeaders['x-user-name'] = auth.userName;
  }

  const startTime = Date.now();
  let proxyStatus = 200;
  let responseData: any = null;

  try {
    const lhResponse = await fetch(targetUrl, {
      method: req.method,
      headers: outboundHeaders,
      body: reqBody ? JSON.stringify(reqBody) : undefined,
      cache: 'no-store'
    });

    proxyStatus = lhResponse.status;
    const textData = await lhResponse.text();

    try {
      responseData = JSON.parse(textData);
    } catch {
      responseData = { rawResponse: textData };
    }

    // Registrar en auditoría de automatizaciones de Suite
    prisma.automationLog.create({
      data: {
        userId: auth.userId,
        ruleId: 'grok_hub_query',
        sourceApp: 'grokbot',
        targetApp: 'leadshub',
        triggerName: `GrokBot Consulta: ${req.method} /${targetPath}`,
        actionName: 'API Gateway Hub LeadsHUB',
        status: lhResponse.ok ? 'SUCCESS' : 'FAILED',
        errorDetails: lhResponse.ok ? null : `HTTP ${proxyStatus}: ${JSON.stringify(responseData).substring(0, 300)}`,
        payloadSent: {
          method: req.method,
          path: targetPath,
          query: Object.fromEntries(incomingUrl.searchParams.entries()),
          body: reqBody,
          durationMs: Date.now() - startTime
        },
        responseRec: responseData ? (typeof responseData === 'object' ? responseData : { data: responseData }) : Prisma.DbNull
      }
    }).catch(() => {});

    return NextResponse.json({
      success: lhResponse.ok,
      hub: 'Kônsul Suite API Gateway',
      app: 'leadshub',
      data: responseData?.data !== undefined ? responseData.data : responseData
    }, {
      status: proxyStatus,
      headers: CORS_HEADERS
    });

  } catch (fetchErr: any) {
    console.error('[Hub Proxy Error]', fetchErr);

    prisma.automationLog.create({
      data: {
        userId: auth.userId,
        ruleId: 'grok_hub_query_error',
        sourceApp: 'grokbot',
        targetApp: 'leadshub',
        triggerName: `GrokBot Error: ${req.method} /${targetPath}`,
        actionName: 'API Gateway Hub LeadsHUB',
        status: 'FAILED',
        errorDetails: fetchErr.message || 'Error de red contactando LeadsHUB',
        payloadSent: { method: req.method, path: targetPath, query: incomingUrl.search },
        responseRec: Prisma.DbNull
      }
    }).catch(() => {});

    return NextResponse.json({
      success: false,
      error: {
        code: 'GATEWAY_FETCH_ERROR',
        message: `Error al contactar LeadsHUB desde Kônsul Suite: ${fetchErr.message}`
      }
    }, { status: 502, headers: CORS_HEADERS });
  }
}

export async function GET(req: Request, context: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return handleProxy(req, context);
}

export async function POST(req: Request, context: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return handleProxy(req, context);
}

export async function PUT(req: Request, context: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return handleProxy(req, context);
}

export async function DELETE(req: Request, context: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return handleProxy(req, context);
}

export async function PATCH(req: Request, context: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return handleProxy(req, context);
}
