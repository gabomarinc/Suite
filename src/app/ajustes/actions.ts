'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(formData: FormData) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    throw new Error("No autenticado");
  }

  const user = await getUser();
  if (!user || !user.id) {
    throw new Error("Usuario no encontrado en Kinde");
  }

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const companyName = formData.get("companyName") as string;

  try {
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        firstName,
        lastName,
        companyName
      }
    });

    revalidatePath('/ajustes');
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("No se pudo actualizar el perfil");
  }
}

export async function generateSuiteApiKey(name: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) throw new Error("No autenticado");

  const user = await getUser();
  if (!user || !user.id) throw new Error("Usuario no encontrado");

  const crypto = require('crypto');
  const keyValue = `ks_live_${crypto.randomBytes(24).toString('hex')}`;

  await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: name || "Nueva Llave API",
      keyValue
    }
  });

  revalidatePath('/ajustes');
}

export async function revokeSuiteApiKey(keyId: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) throw new Error("No autenticado");

  const user = await getUser();
  if (!user || !user.id) throw new Error("Usuario no encontrado");

  await prisma.apiKey.delete({
    where: {
      id: keyId,
      userId: user.id
    }
  });

  revalidatePath('/ajustes');
}

