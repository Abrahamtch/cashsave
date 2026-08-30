import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMaketouCart } from '@/lib/maketou';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/dashboard?payment=success`;
    const userId = user?.id || 'demo-user';
    const userEmail = user?.email || 'demo@cashsave.app';

    const cart = await createMaketouCart({
      userId,
      userEmail,
      redirectUrl,
    });

    return NextResponse.json({ url: cart.url });
  } catch (error: any) {
    console.error('Erreur création paiement:', error);
    // Redirection directe vers l'écran de paiement (checkout) du produit Maketou 3 000 FCFA
    const fallbackCheckoutUrl = process.env.MAKETOU_PRODUCT_URL || 'https://cash-save.mymaketou.shop/en/products/abonnement-cash-save-3-000-fcfamois/checkout';
    return NextResponse.json({ url: fallbackCheckoutUrl });
  }
}
