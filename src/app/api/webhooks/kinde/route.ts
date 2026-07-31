import { NextResponse } from 'next/server';
import { decodeWebhook } from '@kinde/webhooks';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const token = await req.text();
    const kindeDomain = process.env.KINDE_ISSUER_URL || 'https://konsul.kinde.com';

    // Verify and decode Kinde webhook payload (JWT)
    const decodedPayload = await decodeWebhook(token, kindeDomain);

    if (!decodedPayload) {
      console.error('⚠️ Kinde Webhook verification failed: empty payload');
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    // Support both nested (event.type) and root-level structures
    const payload = (decodedPayload as any)?.event || decodedPayload;
    const type = payload?.type;
    const data = payload?.data;

    console.log(`ℹ️ Kinde Webhook event received: ${type}`, data);

    if (type === 'billing.subscription.created' || type === 'billing.subscription.updated') {
      const subscription = data?.subscription;
      const userId = subscription?.user?.id;
      const planKey = subscription?.plan?.key; // Expected to be "basic" or "pro"
      const status = subscription?.status; // e.g. "active", "trialing"

      if (userId && planKey) {
        const isPlanActive = status === 'active' || status === 'trialing';
        const finalPlan = isPlanActive ? planKey : 'free';

        await prisma.user.upsert({
          where: { id: userId },
          update: { 
            plan: finalPlan,
            stripeCustomerId: subscription?.stripe_customer_id || undefined,
            stripeSubscriptionId: subscription?.id || undefined
          },
          create: {
            id: userId,
            email: subscription?.user?.email || '',
            firstName: '',
            lastName: '',
            plan: finalPlan,
            stripeCustomerId: subscription?.stripe_customer_id || undefined,
            stripeSubscriptionId: subscription?.id || undefined
          },
        });
        console.log(`✅ Updated user ${userId} plan to ${finalPlan}`);
      }
    } else if (type === 'billing.subscription.deleted') {
      const subscription = data?.subscription;
      const userId = subscription?.user?.id;

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: 'free' },
        });
        console.log(`✅ Subscription deleted, reset user ${userId} plan to free`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Kinde Webhook Handler Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
