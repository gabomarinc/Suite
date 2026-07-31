import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any,
});

export async function GET(req: Request) {
  try {
    const { isAuthenticated, getUser } = getKindeServerSession();
    const isAuth = await isAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "Debe iniciar sesión" }, { status: 401 });
    }
    const user = await getUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "No se encontró el usuario" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    });

    if (!dbUser || !dbUser.stripeCustomerId) {
      return NextResponse.json({ error: "Aún no tienes una suscripción activa o un cliente registrado en Stripe." }, { status: 400 });
    }

    const siteUrl = process.env.KINDE_SITE_URL || 'https://suite.konsul.digital';
    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${siteUrl}/ajustes`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
