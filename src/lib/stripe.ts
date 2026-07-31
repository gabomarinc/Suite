import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(secretKey, {
  apiVersion: '2025-01-27' as any,
});
