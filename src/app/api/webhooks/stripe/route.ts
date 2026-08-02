import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any,
});

function getPlanNameByProductId(productId: string | null): string {
  if (!productId) return 'free';
  
  if (productId === 'prod_UyA1b9Xgfi5yXT') {
    return 'basic';
  }
  if (productId === 'prod_UyA2U5d95LHbQV') {
    return 'pro';
  }
  
  return 'free';
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('⚠️ Stripe Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Signature Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const email = session.customer_email || session.customer_details?.email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId && !email) {
          console.error('❌ Webhook Error: No userId or email in session metadata');
          break;
        }

        // Retrieve subscription to get price amount
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const price = subscription.items.data[0].price;
        const productId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
        const planName = getPlanNameByProductId(productId);

        // Find user
        let user = null;
        if (userId) {
          user = await prisma.user.findUnique({ where: { id: userId } });
        }
        if (!user && email) {
          user = await prisma.user.findUnique({ where: { email } });
        }

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: planName,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
          });
          console.log(`✅ Subscription activated for user ${user.id} (${planName})`);
        } else {
          console.error(`❌ Webhook Error: User not found in DB for checkout session`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const price = subscription.items.data[0].price;
        const productId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
        const planName = getPlanNameByProductId(productId);
        const status = subscription.status;

        // If subscription is canceled/unpaid, revert to free
        const activePlan = (status === 'active' || status === 'trialing') ? planName : 'free';

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: activePlan,
              stripeSubscriptionId: subscription.id,
            },
          });
          console.log(`✅ Subscription updated for customer ${customerId} to plan: ${activePlan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: 'free',
              stripeSubscriptionId: null,
            },
          });
          console.log(`✅ Subscription deleted/reverted to free for customer ${customerId}`);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Error processing Stripe Webhook event:', error);
    return NextResponse.json({ error: 'Webhook Handler Failed' }, { status: 500 });
  }
}
