// ============================================
// Coach Abraham — Route API POST /api/coach/feedback
// Pouces haut/bas sur les réponses du coach
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
    }

    const { messageId, feedback } = body as { messageId: string; feedback: number };

    if (!messageId || (feedback !== 1 && feedback !== -1)) {
      return NextResponse.json({ error: 'messageId et feedback (-1 ou 1) requis' }, { status: 400 });
    }

    // Mise à jour — RLS garantit que l'utilisateur ne peut modifier que ses messages
    const { error } = await supabase
      .from('coach_messages')
      .update({ feedback })
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Impossible de sauvegarder le feedback' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Coach Feedback] Error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
