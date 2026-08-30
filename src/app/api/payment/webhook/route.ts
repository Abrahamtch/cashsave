import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyMaketouCart } from '@/lib/maketou';

export async function POST(request: Request) {
  try {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseUrl = (envUrl && envUrl.startsWith('http')) ? envUrl : 'https://placeholder.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { cart_id, status, metadata } = body;

    if (!cart_id) {
      return NextResponse.json({ error: 'ID de panier manquant' }, { status: 400 });
    }

    // Vérifier la transaction auprès de Maketou
    let isPaid = status === 'PAID' || status === 'paid';

    if (process.env.MAKETOU_API_KEY && !process.env.MAKETOU_API_KEY.includes('your_')) {
      const verifiedCart = await verifyMaketouCart(cart_id);
      isPaid = verifiedCart.status === 'PAID' || verifiedCart.status === 'paid';
    }

    if (isPaid && metadata?.user_id) {
      // Activer l'abonnement pour 30 jours (3 000 FCFA/mois)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: true,
          premium_expires_at: expiresAt.toISOString(),
        })
        .eq('id', metadata.user_id);

      if (error) {
        console.error('Erreur mise à jour profil suite au paiement:', error);
        return NextResponse.json({ error: 'Erreur mise à jour profil' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Abonnement activé avec succès' });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Erreur Webhook Maketou:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne Webhook' }, { status: 500 });
  }
}
