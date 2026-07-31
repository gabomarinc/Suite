'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";

export async function createPortalSession() {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();

  if (!isAuth) {
    return { error: "No autenticado" };
  }

  const kindeUser = await getUser();
  if (!kindeUser || !kindeUser.id) {
    return { error: "Usuario no encontrado" };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: kindeUser.id },
    select: { stripeCustomerId: true },
  });

  if (!dbUser || !dbUser.stripeCustomerId) {
    return { error: "No tienes una suscripción activa registrada en Stripe" };
  }

  const siteUrl = process.env.KINDE_SITE_URL || "https://suite.konsul.digital";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${siteUrl}/ajustes`,
    });

    return { url: portalSession.url };
  } catch (error: any) {
    console.error("Error creating portal session:", error);
    return { error: "Error al abrir el portal de Stripe" };
  }
}

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
