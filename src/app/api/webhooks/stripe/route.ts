import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const PLAN_BASIC_ID = "price_1TyDhcGAJ3j5QtJb91sVUk09";
const PLAN_PRO_ID = "price_1TyDi1GAJ3j5QtJbNVlb59aE";

function getPlanName(priceId: string): string {
  if (priceId === PLAN_PRO_ID) return "pro";
  if (priceId === PLAN_BASIC_ID) return "basic";
  return "free";
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

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
        const userId = session.metadata?.userId;
        const email = session.customer_email || session.customer_details?.email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId && !email) {
          console.error('❌ Webhook Error: No userId or email in session metadata');
          break;
        }

        // Retrieve subscription to get current Price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const planName = getPlanName(priceId);

        // Find user by Kinde ID first, fallback to email
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
        const priceId = subscription.items.data[0].price.id;
        const planName = getPlanName(priceId);
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
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Error processing Stripe Webhook event:', error);
    return NextResponse.json({ error: 'Webhook Handler Failed' }, { status: 500 });
  }
}
