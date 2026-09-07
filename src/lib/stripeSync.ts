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
 * associated with the user's email, handles ADMIN accounts automatically, and syncs Postgres DB.
 */
export async function syncUserPlanFromStripe(kindeUser: { id: string; email?: string | null }) {
  if (!kindeUser || (!kindeUser.id && !kindeUser.email)) {
    return null;
  }

  try {
    const email = (kindeUser.email || '').toLowerCase().trim();
    const isAdminEmail = email === 'somos@konsul.digital' || email.endsWith('@konsul.digital');

    // 1. Fetch user from DB by ID or Email
    let dbUser = await prisma.user.findUnique({ where: { id: kindeUser.id } });
    if (!dbUser && email) {
      dbUser = await prisma.user.findUnique({ where: { email } });
      if (dbUser) {
        // Link legacy user ID to Kinde ID
        dbUser = await prisma.user.update({
          where: { email },
          data: { id: kindeUser.id },
        });
      }
    }

    if (!dbUser) {
      return null;
    }

    // 2. ADMIN account check: ADMINs automatically get 'pro_leads' plan and 'ADMIN' role
    if (isAdminEmail || dbUser.role === 'ADMIN') {
      if (dbUser.plan !== 'pro_leads' || dbUser.role !== 'ADMIN') {
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            plan: 'pro_leads',
            role: 'ADMIN',
          },
        });
        console.log(`[StripeSync] Auto-assigned ADMIN pro_leads access to ${email}`);
      }
      return dbUser;
    }

    // If user already has a valid paid plan in DB, return it
    if (dbUser.plan && dbUser.plan !== 'free') {
      return dbUser;
    }

    // 3. Query Stripe directly by email
    if (!email) return dbUser;

    const customers = await stripe.customers.list({
      email: email,
      limit: 5,
    });

    if (!customers || customers.data.length === 0) {
      return dbUser;
    }

    // 4. Find any active or trialing subscription across matching customers
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 5,
      });

      const activeSub = subscriptions.data.find(
        (sub) => sub.status === 'active' || sub.status === 'trialing'
      );

      if (activeSub) {
        const priceId = activeSub.items.data[0]?.price?.id;
        let planName = getPlanNameByPriceId(priceId);

        // Fallback for coupons ($0 subscription), custom prices, or unmapped Price IDs:
        // If Stripe shows an active/trialing subscription, NEVER downgrade to 'free'!
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
            planName = 'pro_leads'; // Default to full access for active Stripe subscribers with custom/coupon price
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
