import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = new Stripe(key, {
  apiVersion: '2024-06-20' as any,
});

export async function GET() {
  try {
    if (!key) {
      return NextResponse.json({ error: "Stripe key not found in env" });
    }
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });

    return NextResponse.json({
      prices: prices.data.map(p => ({
        id: p.id,
        amount: p.unit_amount ? p.unit_amount / 100 : 0,
        currency: p.currency,
        productId: typeof p.product === 'string' ? p.product : p.product.id,
        productName: typeof p.product === 'string' ? '' : (p.product as any).name,
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
