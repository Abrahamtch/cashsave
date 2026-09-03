-- ============================================
-- Cash Save — Schéma Supabase ultra-robuste
-- Exécutable directement dans Supabase SQL Editor
-- ============================================

-- 1. TABLE: profiles (extension de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  trial_start_date TIMESTAMPTZ DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  scoring_settings JSONB DEFAULT '{
    "bible": 3,
    "prayer": 3,
    "meditation": 3,
    "reading": 4,
    "documentary": 2,
    "sport": 5,
    "light_work": 2,
    "deep_work": 5,
    "after_work": 3,
    "prospects_contacted": 2,
    "calls_made": 3,
    "content_published": 4,
    "client_projects": 5,
    "learning_minutes": 0.1
  }'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger auto à la création d'un utilisateur dans auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. TABLE: daily_habits (My Habits)
CREATE TABLE IF NOT EXISTS public.daily_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  bible BOOLEAN DEFAULT FALSE,
  prayer BOOLEAN DEFAULT FALSE,
  meditation BOOLEAN DEFAULT FALSE,
  reading BOOLEAN DEFAULT FALSE,
  documentary BOOLEAN DEFAULT FALSE,
  sport BOOLEAN DEFAULT FALSE,
  light_work BOOLEAN DEFAULT FALSE,
  deep_work BOOLEAN DEFAULT FALSE,
  after_work BOOLEAN DEFAULT FALSE,
  prospects_contacted INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  content_published INTEGER DEFAULT 0,
  client_projects INTEGER DEFAULT 0,
  learning_minutes INTEGER DEFAULT 0,
  comments TEXT DEFAULT '',
  progression TEXT DEFAULT '',
  habit_score FLOAT DEFAULT 0,
  work_score FLOAT DEFAULT 0,
  business_score FLOAT DEFAULT 0,
  learning_score FLOAT DEFAULT 0,
  total_score FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

-- 3. TABLE: transactions (My Cash)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT DEFAULT '',
  is_satisfied BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: tasks (To-Do List)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: objectives (Objectifs)
CREATE TABLE IF NOT EXISTS public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEX
CREATE INDEX IF NOT EXISTS idx_daily_habits_user_date ON public.daily_habits(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_objectives_user_status ON public.objectives(user_id, status);

-- ROW LEVEL SECURITY (RLS) & POLICIES (Idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE public.daily_habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own habits" ON public.daily_habits;
CREATE POLICY "Users can view own habits" ON public.daily_habits FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own habits" ON public.daily_habits;
CREATE POLICY "Users can insert own habits" ON public.daily_habits FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own habits" ON public.daily_habits;
CREATE POLICY "Users can update own habits" ON public.daily_habits FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own habits" ON public.daily_habits;
CREATE POLICY "Users can delete own habits" ON public.daily_habits FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own objectives" ON public.objectives;
CREATE POLICY "Users can view own objectives" ON public.objectives FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own objectives" ON public.objectives;
CREATE POLICY "Users can insert own objectives" ON public.objectives FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own objectives" ON public.objectives;
CREATE POLICY "Users can update own objectives" ON public.objectives FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own objectives" ON public.objectives;
CREATE POLICY "Users can delete own objectives" ON public.objectives FOR DELETE USING (auth.uid() = user_id);
