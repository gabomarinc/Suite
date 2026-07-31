import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || req.headers.get('x-user-id') || '';

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  try {
    // Look up by primary Kinde ID or legacyId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { legacyId: userId }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ success: true, plan: 'free' });
    }

    return NextResponse.json({ success: true, plan: user.plan || 'free' });
  } catch (error: any) {
    console.error('❌ Plan API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
