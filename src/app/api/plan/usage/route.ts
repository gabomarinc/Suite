import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key';

export async function POST(req: Request) {
  try {
    // 1. Authorization check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized ecosystem request' }, { status: 401 });
    }

    // 2. Parse body parameters
    const body = await req.json();
    const { userId, email, resource, increment = 1 } = body;

    if (!userId && !email) {
      return NextResponse.json({ error: 'Missing userId or email identifier' }, { status: 400 });
    }

    if (!resource || !['ai_bills', 'ai_process', 'ai_mailing', 'email'].includes(resource)) {
      return NextResponse.json({ error: 'Invalid or missing resource type (must be "ai_bills", "ai_process", "ai_mailing" or "email")' }, { status: 400 });
    }

    // 3. Find user
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 4. Determine update field
    const updateData: Record<string, any> = {};
    if (resource === 'ai_bills') {
      updateData.aiUsageBills = { increment };
    } else if (resource === 'ai_process') {
      updateData.aiUsageProcess = { increment };
    } else if (resource === 'ai_mailing') {
      updateData.aiUsageMailing = { increment };
    } else if (resource === 'email') {
      updateData.emailUsage = { increment };
    }

    // 5. Update user usage in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        plan: true,
        aiUsageBills: true,
        aiUsageProcess: true,
        aiUsageMailing: true,
        emailUsage: true,
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        plan: updatedUser.plan,
        aiUsageBills: updatedUser.aiUsageBills,
        aiUsageProcess: updatedUser.aiUsageProcess,
        aiUsageMailing: updatedUser.aiUsageMailing,
        emailUsage: updatedUser.emailUsage,
      }
    });

  } catch (error: any) {
    console.error('Error reporting plan usage:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
