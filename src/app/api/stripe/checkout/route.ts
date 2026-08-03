import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any,
});

export async function POST(req: Request) {
  try {
    const { isAuthenticated, getUser } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) {
      return NextResponse.json({ error: "Debe iniciar sesión para continuar" }, { status: 401 });
    }

    const kindeUser = await getUser();
    if (!kindeUser || !kindeUser.id || !kindeUser.email) {
      return NextResponse.json({ error: "No se pudo obtener la información de su cuenta de Kinde" }, { status: 400 });
    }

    const { priceId } = await req.json();
    if (!priceId) {
      return NextResponse.json({ error: "Price ID es requerido" }, { status: 400 });
    }

    // Sync user in DB if they don't exist yet or need legacy pairing
    let dbUser = await prisma.user.findUnique({ where: { id: kindeUser.id } });
    
    if (!dbUser && kindeUser.email) {
      dbUser = await prisma.user.findUnique({ where: { email: kindeUser.email } });
      if (dbUser) {
        await prisma.user.update({
          where: { email: kindeUser.email },
          data: { id: kindeUser.id }
        });
      }
    }

    dbUser = await prisma.user.upsert({
      where: { id: kindeUser.id },
      update: {
        firstName: kindeUser.given_name || "",
        lastName: kindeUser.family_name || "",
      },
      create: {
        id: kindeUser.id,
        email: kindeUser.email,
        firstName: kindeUser.given_name || "",
        lastName: kindeUser.family_name || "",
        plan: "free",
      }
    });

    const siteUrl = process.env.KINDE_SITE_URL || 'https://suite.konsul.digital';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: kindeUser.email,
      client_reference_id: kindeUser.id, // Kinde User ID
      metadata: {
        userId: kindeUser.id,
      },
      success_url: `${siteUrl}/?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "No se pudo generar la URL de Stripe Checkout" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: error.message || "Error al procesar el pago" }, { status: 500 });
  }
}
