-- ============================================
-- Cash Save — Migration 008: Paiements SasPay
-- ============================================
-- Remplace l'intégration Maketou. Chaque tentative de paiement (session de
-- checkout hébergé SasPay) est enregistrée ici AVANT la redirection du client.
-- Cela permet de rattacher un paiement à un utilisateur et à une formule, car
-- le webhook SasPay `transaction.success` ne renvoie pas nos métadonnées.

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'saspay',
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'annual')),
  amount INTEGER NOT NULL CHECK (amount > 0),          -- en FCFA (XOF)
  currency TEXT NOT NULL DEFAULT 'XOF',
  checkout_session_id TEXT UNIQUE,                      -- id de la session SasPay
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED')),
  transaction_id TEXT,                                  -- id de la transaction SasPay
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON public.payments (status, created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent uniquement CONSULTER leurs propres paiements.
-- Toute écriture passe par le backend (clé service role), jamais par le client.
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
