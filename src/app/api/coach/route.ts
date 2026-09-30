// ============================================
// Coach Abraham — Route API POST /api/coach
// Auth serveur, validation, rate limit, boucle Gemini, persistance
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { runCoach } from '@/lib/coach/gemini';
import { validateMessage, sanitizeMessage, checkRateLimit, incrementUsage, LIMITS } from '@/lib/coach/guards';
import { RATE_LIMIT_MESSAGE, NO_SESSION_MESSAGE } from '@/lib/coach/prompt';
import type { CoachContext } from '@/lib/coach/prompt';
import { format } from 'date-fns';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // 1. Auth serveur
    const cookieStore = await cookies();
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const url = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : 'https://demo.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo_anon_key';

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component context */ }
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: NO_SESSION_MESSAGE }, { status: 401 });
    }

    // 2. Parser le body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
    }

    const { message, conversationId } = body as { message: unknown; conversationId?: string };

    // 3. Validation
    const validation = validateMessage(message);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const userMessage = sanitizeMessage(message as string);

    // 4. Rate limit
    const rateCheck = await checkRateLimit(supabase, user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE, remaining: 0 }, { status: 429 });
    }

    // 5. Obtenir ou créer la conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from('coach_conversations')
        .insert({ user_id: user.id })
        .select('id')
        .single();
      if (convError || !newConv) {
        return NextResponse.json({ error: 'Impossible de créer la conversation.' }, { status: 500 });
      }
      convId = newConv.id;
    }

    // 6. Charger l'historique récent
    const { data: historyRows } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(LIMITS.MAX_HISTORY_MESSAGES);

    const history = (historyRows || []).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));

    // 7. Construire le contexte
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, onboarding_status')
      .eq('id', user.id)
      .single();

    const ctx: CoachContext = {
      firstName: profile?.full_name?.split(' ')[0] || 'ami(e)',
      today: format(new Date(), 'yyyy-MM-dd'),
      timezone: 'Africa/Lome',
      currency: 'FCFA',
      onboardingDone: profile?.onboarding_status === 'completed',
      locale: 'fr',
    };

    // 8. Appel Gemini
    const result = await runCoach({ history, userMessage, ctx, supabase });

    // 9. Sauvegarder les messages
    await supabase.from('coach_messages').insert([
      {
        conversation_id: convId,
        user_id: user.id,
        role: 'user',
        content: userMessage,
      },
      {
        conversation_id: convId,
        user_id: user.id,
        role: 'assistant',
        content: result.text,
        tools_used: result.toolsUsed,
      },
    ]);

    // 10. Incrémenter le compteur
    await incrementUsage(supabase, user.id);

    return NextResponse.json({
      message: result.text,
      conversationId: convId,
      toolsUsed: result.toolsUsed,
      remaining: rateCheck.remaining - 1,
    });

  } catch (err) {
    console.error('[Coach API] Unexpected error:', err);
    return NextResponse.json(
      { error: "Je n'arrive pas à te répondre là, réessaie dans un instant." },
      { status: 500 }
    );
  }
}
