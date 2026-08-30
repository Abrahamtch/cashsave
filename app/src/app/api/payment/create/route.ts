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

    const apiKey = process.env.MAKETOU_API_KEY;
    const docId = process.env.MAKETOU_PRODUCT_DOCUMENT_ID;

    // Si le document_id du produit Maketou n'a pas encore été renseigné, simuler le succès du paiement en mode démo
    if (!apiKey || apiKey.includes('your_') || !docId || docId.includes('your_')) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      if (user) {
        await supabase.from('profiles').update({
          is_premium: true,
          premium_expires_at: expiresAt,
        }).eq('id', user.id);
      }

      // Mettre à jour le statut démo dans le local storage côté client
      return NextResponse.json({
        url: `${appUrl}/dashboard?payment=success_demo`,
        is_demo: true,
      });
    }

    const cart = await createMaketouCart({
      userId,
      userEmail,
      redirectUrl,
    });

    return NextResponse.json({ url: cart.payment_url || cart.url || redirectUrl });
  } catch (error: any) {
    console.error('Erreur création panier paiement:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'initialisation du paiement' }, { status: 500 });
  }
}
