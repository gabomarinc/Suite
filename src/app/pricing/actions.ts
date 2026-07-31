'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function createCheckoutSession(priceId: string) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    return { error: "Debe iniciar sesión para continuar" };
  }

  const kindeUser = await getUser();
  if (!kindeUser || !kindeUser.id || !kindeUser.email) {
    return { error: "No se pudo obtener la información de su cuenta de Kinde" };
  }

  // Ensure user is synced to DB
  let dbUser = await prisma.user.findUnique({
    where: { id: kindeUser.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: kindeUser.id,
        email: kindeUser.email,
        firstName: kindeUser.given_name || "",
        lastName: kindeUser.family_name || "",
        plan: "free",
      },
    });
  }

  const siteUrl = process.env.KINDE_SITE_URL || "https://suite.konsul.digital";

  try {
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: kindeUser.email,
      metadata: {
        userId: kindeUser.id,
      },
      success_url: `${siteUrl}/ajustes?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
    });

    if (!session.url) {
      return { error: "No se pudo generar la URL de Stripe Checkout" };
    }

    return { url: session.url };
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return { error: error.message || "Error al procesar el pago" };
  }
}
