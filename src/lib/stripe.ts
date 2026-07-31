import Stripe from 'stripe';

const secretKey = process.env.STRIPE_WEBHOOK_SECRET || 'sk_test_placeholder_for_build';

export const stripe = new Stripe(secretKey, {
  apiVersion: '2025-01-27' as any,
});
