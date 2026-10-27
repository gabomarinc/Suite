import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Prefijo oficial de claves maestras de Kônsul Suite para agentes externos (Grok, Custom GPTs, etc.)
 */
export const SUITE_KEY_PREFIX = 'ks_live_';

/**
 * Obtiene o genera una API Key maestra de Kônsul Suite para el usuario.
 * Se guarda de forma segura en la tabla Integration bajo appCode = 'suite'.
 */
export async function getOrCreateSuiteApiKey(userId: string): Promise<string> {
  const existing = await prisma.integration.findUnique({
    where: {
      userId_appCode: {
        userId,
        appCode: 'suite'
      }
    }
  });

  if (existing?.serviceKey && existing.serviceKey.startsWith(SUITE_KEY_PREFIX)) {
    return existing.serviceKey;
  }

  // Generar nueva clave criptográfica
  const randomHex = crypto.randomBytes(18).toString('hex');
  const newApiKey = `${SUITE_KEY_PREFIX}${randomHex}`;

  await prisma.integration.upsert({
    where: {
      userId_appCode: {
        userId,
        appCode: 'suite'
      }
    },
    update: {
      serviceKey: newApiKey,
      isActive: true
    },
    create: {
      userId,
      appCode: 'suite',
      serviceKey: newApiKey,
      isActive: true
    }
  });

  return newApiKey;
}

/**
 * Regenera la clave de Kônsul Suite para el usuario (revocando la anterior).
 */
export async function regenerateSuiteApiKey(userId: string): Promise<string> {
  const randomHex = crypto.randomBytes(18).toString('hex');
  const newApiKey = `${SUITE_KEY_PREFIX}${randomHex}`;

  await prisma.integration.upsert({
    where: {
      userId_appCode: {
        userId,
        appCode: 'suite'
      }
    },
    update: {
      serviceKey: newApiKey,
      isActive: true
    },
    create: {
      userId,
      appCode: 'suite',
      serviceKey: newApiKey,
      isActive: true
    }
  });

  return newApiKey;
}

/**
 * Valida la API Key entrante desde GrokBot u otra herramienta externa.
 * Acepta:
 * - Header `x-api-key: ks_live_...`
 * - Header `Authorization: Bearer ks_live_...`
 * - Parámetro `?api_key=ks_live_...`
 */
export async function validateSuiteApiKey(req: Request): Promise<{
  authenticated: boolean;
  userId?: string;
  userEmail?: string;
  userName?: string;
  error?: string;
  status?: number;
}> {
  const url = new URL(req.url);
  const headerKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const queryKey = url.searchParams.get('api_key');

  const apiKey = (headerKey || bearerKey || queryKey || '').trim();

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Se requiere una API Key de Kônsul Suite en el header "x-api-key" o "Authorization: Bearer <key>". Obtén tu clave en https://suite.konsul.digital/ajustes',
      status: 401
    };
  }

  // Clave maestra interna de emergencia (opcional para desarrollo)
  const internalKey = process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key';
  if (apiKey === internalKey) {
    const defaultUser = await prisma.user.findFirst();
    if (defaultUser) {
      return {
        authenticated: true,
        userId: defaultUser.id,
        userEmail: defaultUser.email,
        userName: defaultUser.name || defaultUser.firstName || 'Admin Kônsul'
      };
    }
  }

  // Buscar integración con appCode = 'suite' y esa clave
  let integ = await prisma.integration.findFirst({
    where: {
      serviceKey: apiKey,
      isActive: true
    },
    include: {
      user: true
    }
  });

  // Si no se encontró por appCode suite, verificar si el usuario pasó su serviceKey de leadshub directamente
  if (!integ && (apiKey.startsWith('lh_live_') || apiKey.startsWith('lh_svc_'))) {
    integ = await prisma.integration.findFirst({
      where: {
        appCode: 'leadshub',
        serviceKey: apiKey,
        isActive: true
      },
      include: {
        user: true
      }
    });
  }

  if (!integ || !integ.user) {
    return {
      authenticated: false,
      error: 'API Key de Kônsul Suite inválida o inactiva. Verifica tu clave en Ajustes de la Suite.',
      status: 401
    };
  }

  return {
    authenticated: true,
    userId: integ.userId,
    userEmail: integ.user.email,
    userName: integ.user.name || integ.user.firstName || 'Usuario Kônsul'
  };
}

/**
 * Consulta las credenciales de LeadsHUB activas para el usuario autenticado.
 */
export async function getLeadshubCredentials(userId: string) {
  const leadshubInteg = await prisma.integration.findUnique({
    where: {
      userId_appCode: {
        userId,
        appCode: 'leadshub'
      }
    }
  });

  const leadshubUrl = process.env.LEADSHUB_URL 
    || process.env.NEXT_PUBLIC_LEADSHUB_URL 
    || 'https://agentes.konsul.digital';

  const isConnected = !!(leadshubInteg && leadshubInteg.isActive && leadshubInteg.serviceKey);

  return {
    isConnected,
    serviceKey: leadshubInteg?.serviceKey || 'konsul_sso_leadshub',
    leadshubUrl
  };
}
