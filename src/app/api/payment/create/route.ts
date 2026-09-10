import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMaketouCart } from '@/lib/maketou';

export async function POST(request: Request) {
  let billingCycle = 'annual';
  try {
    const body = await request.json().catch(() => ({}));
    if (body.billingCycle) billingCycle = body.billingCycle;

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
      billingCycle,
    });

    return NextResponse.json({ url: cart.url });
  } catch (error: any) {
    console.error('Erreur création paiement:', error);
    const isAnnual = billingCycle === 'annual';
    const fallbackCheckoutUrl = isAnnual
      ? (process.env.MAKETOU_ANNUAL_PRODUCT_URL || 'https://cash-save.mymaketou.shop/en/products/abonnement-annuel-cash-save-28-800-fcfaan/checkout')
      : (process.env.MAKETOU_PRODUCT_URL || 'https://cash-save.mymaketou.shop/en/products/abonnement-cash-save-3-000-fcfamois/checkout');
    return NextResponse.json({ url: fallbackCheckoutUrl });
  }
}
