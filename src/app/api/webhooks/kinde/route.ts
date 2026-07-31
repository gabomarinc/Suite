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

    if (type === 'customer.plan_assigned' || type === 'customer.plan_changed') {
      const customerId = data?.customer?.id;
      
      const planId = data?.plan?.id?.toLowerCase();
      const planCode = data?.plan?.code?.toLowerCase();
      const planKey = data?.plan?.key?.toLowerCase();
      const planName = data?.plan?.name?.toLowerCase();

      if (customerId) {
        let finalPlan = 'free';
        
        if (
          planId === 'pro' ||
          planCode === 'pro' ||
          planKey === 'pro' ||
          planName?.includes('pro')
        ) {
          finalPlan = 'pro';
        } else if (
          planId === 'basic' ||
          planCode === 'basic' ||
          planKey === 'basic' ||
          planName?.includes('basic')
        ) {
          finalPlan = 'basic';
        }

        await prisma.user.upsert({
          where: { id: customerId },
          update: { 
            plan: finalPlan
          },
          create: {
            id: customerId,
            email: data?.customer?.email || '',
            firstName: '',
            lastName: '',
            plan: finalPlan
          },
        });
        console.log(`✅ Updated user ${customerId} plan to ${finalPlan}`);
      }
    } else if (type === 'customer.payment_failed') {
      const customerId = data?.customer?.id;
      if (customerId) {
        await prisma.user.update({
          where: { id: customerId },
          data: { plan: 'free' },
        });
        console.log(`✅ Payment failed, reset user ${customerId} plan to free`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Kinde Webhook Handler Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
