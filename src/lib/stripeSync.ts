import { stripe } from './stripe';
import { prisma } from './prisma';

export function getPlanNameByPriceId(priceId: string | null | undefined): string {
  if (!priceId) return 'free';

  if (priceId === 'price_1TyDhcGAJ3j5QtJb91sVUk09') {
    return 'basic';
  }
  if (priceId === 'price_1TyDi1GAJ3j5QtJbNVlb59aE') {
    return 'pro';
  }
  if (priceId === 'price_1TzyIYGAJ3j5QtJbEUFRIQjO') {
    return 'basic_leads';
  }
  if (priceId === 'price_1TzacAGAJ3j5QtJbnhlCtAoz') {
    return 'pro_leads';
  }

  return 'free';
}

/**
 * Self-healing helper: Checks Stripe directly for any active/trialing subscription 
 * associated with the user's email if their DB record shows plan === 'free'.
 */
export async function syncUserPlanFromStripe(kindeUser: { id: string; email?: string | null }) {
  if (!kindeUser || (!kindeUser.id && !kindeUser.email)) {
    return null;
  }

  try {
    const email = kindeUser.email || '';

    // 1. Fetch user from DB
    let dbUser = await prisma.user.findUnique({ where: { id: kindeUser.id } });
    if (!dbUser && email) {
      dbUser = await prisma.user.findUnique({ where: { email } });
      if (dbUser) {
        // Link legacy user ID to Kinde ID if needed
        dbUser = await prisma.user.update({
          where: { email },
          data: { id: kindeUser.id },
        });
      }
    }

    if (!dbUser) {
      return null;
    }

    // If user already has a valid paid plan in DB, no need to query Stripe
    if (dbUser.plan && dbUser.plan !== 'free') {
      return dbUser;
    }

    // 2. Query Stripe directly by email
    if (!email) return dbUser;

    const customers = await stripe.customers.list({
      email: email,
      limit: 5,
    });

    if (!customers || customers.data.length === 0) {
      return dbUser;
    }

    // 3. Find any active or trialing subscription across matching customers
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 5,
      });

      const activeSub = subscriptions.data.find(
        (sub: Stripe.Subscription) => sub.status === 'active' || sub.status === 'trialing'
      );

      if (activeSub) {
        const priceId = activeSub.items.data[0]?.price?.id;
        let planName = getPlanNameByPriceId(priceId);

        // Fallback: If Price ID is unmapped (e.g., custom trial price, coupon, new price ID),
        // inspect nickname/metadata or fallback to 'basic' / 'basic_leads' so user isn't blocked!
        if (planName === 'free') {
          const priceObj = activeSub.items.data[0]?.price;
          const nickname = (priceObj?.nickname || '').toLowerCase();

          if (nickname.includes('pro') && (nickname.includes('lead') || nickname.includes('hub'))) {
            planName = 'pro_leads';
          } else if (nickname.includes('pro')) {
            planName = 'pro';
          } else if (nickname.includes('lead') || nickname.includes('hub')) {
            planName = 'basic_leads';
          } else {
            planName = 'basic';
          }
        }

        // Update database with active plan
        const updatedUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            plan: planName,
            stripeCustomerId: customer.id,
            stripeSubscriptionId: activeSub.id,
          },
        });

        console.log(`[StripeSync] Successfully synced plan '${planName}' for user ${email}`);
        return updatedUser;
      }
    }

    return dbUser;
  } catch (error) {
    console.error("[StripeSync] Error auto-syncing Stripe subscription:", error);
    return null;
  }
}
