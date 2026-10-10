import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { exchangeCodeForTokens, getQboConfig, saveConnection, getCompanyInfo } from '@/lib/quickbooks';
import { prisma } from '@/lib/prisma';

/**
 * Callback OAuth 2.0 de Intuit. Valida el `state`, intercambia el `code` por tokens
 * y guarda la conexión cifrada. Luego redirige a /automatizaciones.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (qs: string) => {
    const res = NextResponse.redirect(new URL(`/automatizaciones?${qs}#terceros`, req.url));
    res.cookies.delete({ name: 'qbo_oauth_state', path: '/api/integrations/quickbooks' });
    return res;
  };

  const error = url.searchParams.get('error');
  if (error) {
    return back(`qbo=error&reason=${encodeURIComponent(error)}`);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');
  const cookieState = req.headers.get('cookie')?.match(/(?:^|;\s*)qbo_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !realmId) {
    return back('qbo=error&reason=missing_params');
  }
  if (!cookieState || decodeURIComponent(cookieState) !== state) {
    return back('qbo=error&reason=invalid_state');
  }

  const { isAuthenticated, getUser } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return back('qbo=error&reason=not_authenticated');
  }
  const user = await getUser();
  const stateUserId = state.split('.').slice(1).join('.');
  if (!user?.id || user.id !== stateUserId) {
    return back('qbo=error&reason=user_mismatch');
  }

  try {
    // Garantiza que el usuario exista en BD (FK).
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return back('qbo=error&reason=user_not_found');
    }

    const tokens = await exchangeCodeForTokens(code);
    const { environment } = getQboConfig();
    await saveConnection({ userId: user.id, realmId, tokens, environment });

    // Nombre de la empresa conectada (no bloqueante).
    try {
      const info = await getCompanyInfo(user.id);
      if (info?.CompanyName) {
        await prisma.thirdPartyConnection.update({
          where: { userId_provider: { userId: user.id, provider: 'quickbooks' } },
          data: { companyName: info.CompanyName },
        });
      }
    } catch (e) {
      console.warn('[QuickBooks] No se pudo leer CompanyInfo:', e);
    }

    return back('qbo=connected');
  } catch (err: any) {
    console.error('[QuickBooks] Error en callback OAuth:', err);
    return back(`qbo=error&reason=${encodeURIComponent((err.message || 'token_exchange_failed').slice(0, 120))}`);
  }
}
