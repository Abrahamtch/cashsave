-- ============================================
-- Cash Save — Migration 004 : Colonnes Manquantes pour Objectifs & Habitudes
-- À exécuter dans le SQL Editor de Supabase
-- ============================================

-- 1. Ajout des colonnes de budget financier aux Objectifs
ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS target_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allocated_budget DECIMAL(12, 2) DEFAULT 0;

-- 2. Ajout de la quantité cible aux Habitudes Personnalisées
ALTER TABLE public.custom_habits
  ADD COLUMN IF NOT EXISTS target_quantity INTEGER DEFAULT 1;

-- 3. Ajout du stockage JSON pour données personnalisées dans daily_habits
ALTER TABLE public.daily_habits
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::JSONB;

-- 4. Actualisation du cache du schéma PostgREST
NOTIFY pgrst, 'reload schema';
