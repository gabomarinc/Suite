import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { buildAuthorizeUrl, getQboConfig } from '@/lib/quickbooks';

/**
 * Inicia el flujo OAuth 2.0 con Intuit (QuickBooks Online — conexión de tercero).
 * Genera un `state` anti-CSRF ligado al usuario y lo guarda en una cookie httpOnly.
 */
export async function GET(req: Request) {
  const { isAuthenticated, getUser } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL('/api/auth/login?post_login_redirect_url=/automatizaciones', req.url));
  }
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.redirect(new URL('/api/auth/login', req.url));
  }

  const config = getQboConfig();
  if (!config.isConfigured) {
    return NextResponse.redirect(new URL('/automatizaciones?qbo=error&reason=not_configured', req.url));
  }

  const state = `${crypto.randomBytes(24).toString('hex')}.${user.id}`;
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  res.cookies.set('qbo_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/integrations/quickbooks',
    maxAge: 60 * 10,
  });
  return res;
}
