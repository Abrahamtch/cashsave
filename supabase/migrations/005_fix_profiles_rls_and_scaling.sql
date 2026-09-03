-- ============================================
-- Cash Save — Migration 005 : Correction RLS Profiles & Scalabilité Masse Utilisateurs
-- Exécutable directement dans Supabase SQL Editor
-- ============================================

-- 1. CORRECTION POLITIQUES RLS SUR SUR PUBLIC.PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Autoriser la création de profil par l'utilisateur lui-même (Obligatoire pour corriger l'échec d'inscription/connexion)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Autoriser la gestion complète (SELECT, UPDATE, INSERT) de son propre profil
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles 
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- 2. CORRECTION & RENFORCEMENT DU TRIGGER D'INSCRIPTION AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, CONCAT(NEW.id::text, '@cashsave.app')),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    updated_at = NOW();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. OPTIMISATION DE DES INDEX POUR DES MILLIERS D'UTILISATEURS & DES MILLIONS DE LIGNES
CREATE INDEX IF NOT EXISTS idx_daily_habits_user_date_desc ON public.daily_habits(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_desc ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON public.tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_objectives_user_created ON public.objectives(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_habits_user_created ON public.custom_habits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_initial_balances_user_id ON public.initial_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habit_preferences_user_id ON public.user_habit_preferences(user_id);


-- 4. ACTUALISATION DU CACHE DU SCHÉMA POSTGREST
NOTIFY pgrst, 'reload schema';
