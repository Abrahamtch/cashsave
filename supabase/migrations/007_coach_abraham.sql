-- ============================================
-- Cash Save — Migration 007: Coach Abraham (IA)
-- Tables pour l'historique de conversation du coach,
-- les messages, et le quota d'utilisation.
-- ============================================

-- 1. TABLE: coach_conversations
CREATE TABLE IF NOT EXISTS public.coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLE: coach_messages
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tools_used TEXT[] DEFAULT '{}',
  feedback SMALLINT CHECK (feedback IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLE: coach_usage (rate limiting par jour)
CREATE TABLE IF NOT EXISTS public.coach_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  messages INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- RLS
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_usage         ENABLE ROW LEVEL SECURITY;

-- Policies : chaque utilisateur ne voit que ses propres données
DROP POLICY IF EXISTS "own conversations" ON public.coach_conversations;
CREATE POLICY "own conversations" ON public.coach_conversations FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own messages" ON public.coach_messages;
CREATE POLICY "own messages" ON public.coach_messages FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own usage" ON public.coach_usage;
CREATE POLICY "own usage" ON public.coach_usage FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- INDEX
CREATE INDEX IF NOT EXISTS idx_coach_messages_conv_date ON public.coach_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user ON public.coach_conversations (user_id, created_at DESC);

-- Rafraîchir le cache PostgREST
NOTIFY pgrst, 'reload schema';
