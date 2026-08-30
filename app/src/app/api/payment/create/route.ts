import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMaketouCart } from '@/lib/maketou';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/dashboard?payment=success`;

    // Si pas de clé Maketou configurée pour les tests sandbox, rediriger vers sandbox mock
    if (!process.env.MAKETOU_API_KEY || process.env.MAKETOU_API_KEY.includes('your_')) {
      // Mock payment pour démo local si clés pas saisies
      await supabase.from('profiles').update({
        is_premium: true,
        premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('id', user.id);

      return NextResponse.json({ url: `${appUrl}/dashboard?payment=mock_success` });
    }

    const cart = await createMaketouCart({
      userId: user.id,
      userEmail: user.email || '',
      redirectUrl,
    });

    return NextResponse.json({ url: cart.payment_url || cart.url || redirectUrl });
  } catch (error: any) {
    console.error('Erreur création panier paiement:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'initialisation du paiement' }, { status: 500 });
  }
}
