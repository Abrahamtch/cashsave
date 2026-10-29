-- ============================================
-- Cash Save — Migration 009 : Multilingue & Multidevise
-- Exécutable dans Supabase SQL Editor
-- ============================================

-- 1. Ajout des préférences de langue et de devise au profil utilisateur
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'XOF',
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'fr';

-- 2. Ajout de la devise originale aux transactions
-- Préserve la valeur et la devise d'origine de chaque opération sans altération
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS original_currency TEXT NOT NULL DEFAULT 'XOF';

-- 3. Ajout de la devise aux soldes de départ (initial_balances)
ALTER TABLE public.initial_balances
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XOF';

-- 4. Ajout de la devise aux objectifs financiers (objectives)
ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XOF';

-- 5. Rétrocompatibilité : s'assurer que toutes les lignes existantes ont une devise
UPDATE public.profiles
  SET preferred_currency = 'XOF'
  WHERE preferred_currency IS NULL;

UPDATE public.profiles
  SET preferred_language = 'fr'
  WHERE preferred_language IS NULL;

UPDATE public.transactions
  SET original_currency = 'XOF'
  WHERE original_currency IS NULL;

UPDATE public.initial_balances
  SET currency = 'XOF'
  WHERE currency IS NULL;

UPDATE public.objectives
  SET currency = 'XOF'
  WHERE currency IS NULL;

-- 6. Notification de rechargement du schéma PostgREST
NOTIFY pgrst, 'reload schema';

