-- Migration 003: Custom Habits & Transaction Image Attachments

-- 1. Ajouter la colonne image_url aux transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Créer la table des habitudes personnalisées
CREATE TABLE IF NOT EXISTS public.custom_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  axis TEXT NOT NULL DEFAULT 'esprit', -- 'esprit' | 'sante' | 'focus' | 'business'
  type TEXT NOT NULL DEFAULT 'boolean', -- 'boolean' | 'numeric'
  icon TEXT DEFAULT '✨',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies pour custom_habits
ALTER TABLE public.custom_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs gèrent leurs habitudes personnalisées"
  ON public.custom_habits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_custom_habits_user ON public.custom_habits(user_id);
