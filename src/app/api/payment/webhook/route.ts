import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/saspay';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Webhook-Signature');
    const timestamp = request.headers.get('X-Webhook-Timestamp');
    const eventType = request.headers.get('X-Webhook-Event');

    // 1. Vérification de la signature HMAC & contrôle d'âge (max 300s)
    const isValid = verifyWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
      console.warn('Webhook SasPay rejeté: signature ou timestamp invalide');
      return NextResponse.json({ error: 'Signature ou timestamp invalide' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
    }

    const event = payload.event || eventType;
    const data = payload.data || {};

    // 2. Traitement uniquement des paiements confirmés (transaction.success)
    if (event === 'transaction.success' && data.status === 'SUCCESS') {
      const transactionId = data.id;
      const amount = data.amount;

      const supabaseAdmin = createAdminClient();

      // Rechercher le paiement correspondant dans notre table `payments`
      // Soit par transaction_id déjà lié, soit le paiement PENDING le plus récent si aucun transaction_id
      let paymentRecord: any = null;

      if (transactionId) {
        const { data: found } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('transaction_id', transactionId)
          .maybeSingle();
        paymentRecord = found;
      }

      if (!paymentRecord && data.checkout_session_id) {
        const { data: found } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('checkout_session_id', data.checkout_session_id)
          .maybeSingle();
        paymentRecord = found;
      }

      // Si metadata.user_id est transmis dans l'événement ou si on a le paiement en BDD
      const userId = paymentRecord?.user_id || data.metadata?.user_id;
      const plan = paymentRecord?.plan || data.metadata?.plan || 'annual';

      if (userId) {
        // Mettre à jour le statut du paiement dans `payments`
        if (paymentRecord?.id) {
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'PAID',
              transaction_id: transactionId || paymentRecord.transaction_id,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', paymentRecord.id);
        }

        // Récupérer le profil actuel pour incrémenter correctement
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('first_premium_date, subscription_months_count')
          .eq('id', userId)
          .maybeSingle();

        const isAnnual = plan === 'annual';
        const daysToAdd = isAnnual ? 365 : 30;
        const monthsToAdd = isAnnual ? 12 : 1;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + daysToAdd);

        const firstPremiumDate = profile?.first_premium_date || new Date().toISOString();
        const newMonthsCount = (profile?.subscription_months_count || 0) + monthsToAdd;

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: true,
            premium_expires_at: expiresAt.toISOString(),
            first_premium_date: firstPremiumDate,
            subscription_months_count: newMonthsCount,
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Erreur mise à jour profil suite au paiement SasPay:', profileError);
          return NextResponse.json({ error: 'Erreur mise à jour profil' }, { status: 500 });
        }

        console.log(`[SasPay Webhook] Abonnement Premium activé pour l'utilisateur ${userId} (${plan})`);
        return NextResponse.json({ success: true, message: 'Abonnement activé avec succès' });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Erreur Webhook SasPay:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne Webhook' }, { status: 500 });
  }
}
