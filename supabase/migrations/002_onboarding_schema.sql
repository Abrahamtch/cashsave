-- ============================================
-- Cash Save — Schéma Onboarding (Migration 002)
-- Exécutable directement dans Supabase SQL Editor
-- ============================================

-- 1. Extension de la table profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'not_started' CHECK (onboarding_status IN ('not_started', 'skipped', 'partial', 'completed')),
  ADD COLUMN IF NOT EXISTS routine_status TEXT CHECK (routine_status IN ('regular', 'irregular', 'none')),
  ADD COLUMN IF NOT EXISTS initial_balance_total DECIMAL(12, 2) DEFAULT 0;

-- 2. Table initial_balances (Comptes & Soldes de départ)
CREATE TABLE IF NOT EXISTS public.initial_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('tmoney', 'flooz', 'banque', 'especes', 'portefeuille_en_ligne', 'autre')),
  source_label TEXT DEFAULT '',
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table user_habit_preferences (Habitudes activées)
CREATE TABLE IF NOT EXISTS public.user_habit_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_habit_key UNIQUE(user_id, habit_key)
);

-- INDEX
CREATE INDEX IF NOT EXISTS idx_initial_balances_user ON public.initial_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habit_prefs_user ON public.user_habit_preferences(user_id);

-- RLS & POLICIES
ALTER TABLE public.initial_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own initial balances" ON public.initial_balances;
CREATE POLICY "Users can view own initial balances" ON public.initial_balances FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own initial balances" ON public.initial_balances;
CREATE POLICY "Users can insert own initial balances" ON public.initial_balances FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own initial balances" ON public.initial_balances;
CREATE POLICY "Users can update own initial balances" ON public.initial_balances FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own initial balances" ON public.initial_balances;
CREATE POLICY "Users can delete own initial balances" ON public.initial_balances FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.user_habit_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own habit prefs" ON public.user_habit_preferences;
CREATE POLICY "Users can view own habit prefs" ON public.user_habit_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own habit prefs" ON public.user_habit_preferences;
CREATE POLICY "Users can insert own habit prefs" ON public.user_habit_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own habit prefs" ON public.user_habit_preferences;
CREATE POLICY "Users can update own habit prefs" ON public.user_habit_preferences FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own habit prefs" ON public.user_habit_preferences;
CREATE POLICY "Users can delete own habit prefs" ON public.user_habit_preferences FOR DELETE USING (auth.uid() = user_id);
