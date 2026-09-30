// ============================================
// Coach Abraham — Guards (validation, rate limit, sanitation)
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// ── Configuration (faciles à modifier) ──────────────────

export const LIMITS = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_HISTORY_MESSAGES: 12,
  MESSAGES_PER_HOUR: 20,
  MESSAGES_PER_DAY: 40,
  TIMEOUT_MS: 25_000,
} as const;

// ── Validation ──────────────────────────────────────────

export function validateMessage(message: unknown): { valid: boolean; error?: string } {
  if (typeof message !== 'string') {
    return { valid: false, error: 'Le message doit être une chaîne de caractères.' };
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Le message ne peut pas être vide.' };
  }
  if (trimmed.length > LIMITS.MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Le message ne peut pas dépasser ${LIMITS.MAX_MESSAGE_LENGTH} caractères.` };
  }
  return { valid: true };
}

export function sanitizeMessage(message: string): string {
  return message.trim().slice(0, LIMITS.MAX_MESSAGE_LENGTH);
}

// ── Rate Limiting ───────────────────────────────────────

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Upsert le compteur du jour
  const { data: usage } = await supabase
    .from('coach_usage')
    .select('messages')
    .eq('user_id', userId)
    .eq('day', today)
    .single();

  const currentCount = usage?.messages ?? 0;

  if (currentCount >= LIMITS.MESSAGES_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: LIMITS.MESSAGES_PER_DAY - currentCount };
}

export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Upsert: insérer ou incrémenter
  const { data: existing } = await supabase
    .from('coach_usage')
    .select('messages')
    .eq('user_id', userId)
    .eq('day', today)
    .single();

  if (existing) {
    await supabase
      .from('coach_usage')
      .update({ messages: existing.messages + 1 })
      .eq('user_id', userId)
      .eq('day', today);
  } else {
    await supabase
      .from('coach_usage')
      .insert({ user_id: userId, day: today, messages: 1 });
  }
}
