import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLimitsForPlan, getOrResetUserUsage } from '@/lib/planLimits';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key';

export async function GET(req: Request) {
  try {
    // 1. Authorization check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized ecosystem request' }, { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json({ error: 'Missing userId or email query parameter' }, { status: 400 });
    }

    // 3. Find user in database
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    // 4. If user not found, return default free limits instead of 404
    if (!user) {
      const freeLimits = getLimitsForPlan('free');
      return NextResponse.json({
        plan: 'free',
        limits: freeLimits,
        usage: {
          aiUsage: 0,
          emailUsage: 0,
          limitsResetDate: new Date()
        }
      });
    }

    // 5. Check and handle monthly limits reset
    const usage = await getOrResetUserUsage({
      id: user.id,
      aiUsage: user.aiUsage,
      emailUsage: user.emailUsage,
      limitsResetDate: user.limitsResetDate,
    });

    // 6. Respond with limits and usage
    const limits = getLimitsForPlan(user.plan);
    return NextResponse.json({
      plan: user.plan || 'free',
      limits,
      usage
    });

  } catch (error: any) {
    console.error('Error fetching plan limits:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
