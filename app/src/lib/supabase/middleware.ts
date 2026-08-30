import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes publiques (pas besoin d'authentification)
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/callback', '/api/payment/webhook'];

// Routes qui nécessitent un abonnement actif (ou période d'essai)
const PROTECTED_MUTATION_ROUTES = ['/habits', '/cash', '/tasks', '/objectives'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Permettre l'accès aux routes publiques
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    // Si l'utilisateur est connecté et essaie d'accéder aux pages auth, le rediriger
    if (user && (pathname === '/auth/login' || pathname === '/auth/register')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Rediriger vers login si non authentifié
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
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
        const url = request.nextUrl.clone();
        url.pathname = '/paywall';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
