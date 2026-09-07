import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { syncUserPlanFromStripe } from '@/lib/stripeSync';

export async function POST() {
  try {
    const { isAuthenticated, getUser } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const kindeUser = await getUser();
    if (!kindeUser || !kindeUser.id) {
      return NextResponse.json({ error: 'Usuario de Kinde no encontrado' }, { status: 400 });
    }

    const updatedUser = await syncUserPlanFromStripe({
      id: kindeUser.id,
      email: kindeUser.email,
    });

    if (updatedUser && updatedUser.plan && updatedUser.plan !== 'free') {
      return NextResponse.json({
        success: true,
        plan: updatedUser.plan,
        message: 'Suscripción sincronizada correctamente',
      });
    }

    return NextResponse.json({
      success: false,
      plan: 'free',
      message: 'No se encontró una suscripción activa en Stripe para este correo.',
    });
  } catch (error: any) {
    console.error('Error in /api/stripe/sync:', error);
    return NextResponse.json({ error: error.message || 'Error al sincronizar' }, { status: 500 });
  }
}
