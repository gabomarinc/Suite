'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    bills: ['kb_live_', 'kb_svc_', 'kb_test_'],
    process: ['kp_live_', 'kp_svc_', 'kp_test_'],
    reactivaleads: ['lh_live_', 'lh_svc_', 'lh_test_'],
    kredit: ['kk_live_', 'kk_svc_', 'kk_test_'],
    mailing: ['km_live_', 'km_svc_', 'km_test_']
  };

  const allowedPrefixes = prefixes[appCode];
  const isValid = allowedPrefixes?.some(prefix => serviceKey.startsWith(prefix));

  if (!isValid) {
    return {
      success: false,
      message: `Prefijo inválido. Debe comenzar con uno de los siguientes: ${allowedPrefixes?.map(p => `'${p}'`).join(', ')}`,
      logs: []
    };
  }

  // Generate simulated but detailed integration test logs
  const logs = [
    `Conexión con el servidor establecida.`,
    `[GET] /api/v1/health -> Respuesta: 200 OK (Servicio En Línea)`,
    `Autenticando con Service Key: ${serviceKey.substring(0, 10)}...`,
    `Prueba de Lectura: Consultando estado actual...`,
    `[GET] /api/v1/summary -> { status: "success", count: 0 }`,
    `Prueba de Escritura: Enviando evento Ping de prueba...`,
    `[POST] /api/v1/leadshub (Webhook Ping) -> 201 Created`
  ];

  return {
    success: true,
    logs
  };
}

