import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes publiques
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/callback', '/api/payment/webhook'];

// Routes qui nécessitent un abonnement actif
const PROTECTED_MUTATION_ROUTES = ['/habits', '/cash', '/tasks', '/objectives'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

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
  const pathname = request.nextUrl.pathname;

  // Accès aux routes publiques
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    if (user && (pathname === '/auth/login' || pathname === '/auth/register')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // Rediriger vers login si non connecté
  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    return NextResponse.redirect(redirectUrl);
  }

  // Vérifier l'abonnement pour les routes protégées
  if (PROTECTED_MUTATION_ROUTES.some(route => pathname.startsWith(route))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_start_date, is_premium, premium_expires_at')
      .eq('id', user.id)
      .single();

    if (profile) {
      const trialStart = new Date(profile.trial_start_date);
      const now = new Date();
      const daysSinceTrialStart = Math.floor(
        (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isInTrial = daysSinceTrialStart < 42;
      const isPremiumActive = profile.is_premium && 
        (!profile.premium_expires_at || new Date(profile.premium_expires_at) > now);

      if (!isInTrial && !isPremiumActive) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/paywall';
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}
