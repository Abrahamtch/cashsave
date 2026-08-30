import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes publiques
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/callback', '/api/payment/webhook'];

// Routes protégées
const PROTECTED_MUTATION_ROUTES = ['/habits', '/cash', '/tasks', '/objectives'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : 'https://demo.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo_anon_key';

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const demoCookie = request.cookies.get('cashsave_demo_session');
  const isAuthenticated = !!user || demoCookie?.value === 'true';
  const pathname = request.nextUrl.pathname;

  // Accès aux routes publiques
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    if (isAuthenticated && (pathname === '/auth/login' || pathname === '/auth/register')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // Rediriger vers login si non connecté
  if (!isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
