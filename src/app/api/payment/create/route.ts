import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createCheckoutSession } from '@/lib/saspay';
import { getCurrentPrice, PRICING } from '@/lib/plans';

export async function POST(request: Request) {
  let billingCycle = 'annual';
  try {
    const body = await request.json().catch(() => ({}));
    if (body.billingCycle === 'monthly' || body.billingCycle === 'annual') {
      billingCycle = body.billingCycle;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Vous devez être connecté pour vous abonner.' }, { status: 401 });
    }

    // Récupérer le profil pour calculer le tarif (bonus vs standard)
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, first_premium_date, subscription_months_count')
      .eq('id', user.id)
      .maybeSingle();

    const isAnnual = billingCycle === 'annual';
    const amount = isAnnual ? PRICING.ANNUAL_TOTAL : getCurrentPrice(profile);
    const planLabel = isAnnual ? 'Abonnement Annuel Cash Save' : 'Abonnement Mensuel Cash Save';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${appUrl}/dashboard?payment=success`;

    const customerEmail = user.email || profile?.email || 'client@cashsave.app';
    const customerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Client Cash Save';

    // 1. Créer la session de checkout SasPay
    const session = await createCheckoutSession({
      amount,
      description: `${planLabel} (${amount} FCFA)`,
      customerEmail,
      customerName,
      returnUrl,
      metadata: {
        user_id: user.id,
        user_email: customerEmail,
        plan: billingCycle,
      },
    });

    // 2. Mémoriser la session en BDD
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase.from('payments').insert({
        user_id: user.id,
        provider: 'saspay',
        plan: billingCycle,
        amount,
        currency: 'XOF',
        checkout_session_id: session.id,
        checkout_url: session.checkout_url,
        status: 'PENDING',
      });
    } catch (dbErr) {
      console.warn('Avertissement: Impossible d’enregistrer le paiement en BDD:', dbErr);
    }

    return NextResponse.json({ url: session.checkout_url });
  } catch (error: any) {
    console.error('Erreur création paiement SasPay:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l’initialisation du paiement.' },
      { status: 500 }
    );
  }
}
