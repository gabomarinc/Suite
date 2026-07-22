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
