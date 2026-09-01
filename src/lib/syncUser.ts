import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { ensureUUID } from '@/lib/uuid';

let isSyncingInFlight = false;
let isLocalSelfMutation = false;
let selfMutationTimeout: NodeJS.Timeout | null = null;

const ALLOWED_TX_FIELDS = ['id', 'user_id', 'type', 'amount', 'category', 'date', 'note', 'is_satisfied', 'image_url', 'created_at'];
const ALLOWED_TASK_FIELDS = ['id', 'user_id', 'title', 'deadline', 'priority', 'status', 'position', 'created_at', 'updated_at'];
const ALLOWED_OBJ_FIELDS = ['id', 'user_id', 'title', 'deadline', 'target_amount', 'allocated_budget', 'progress', 'status', 'created_at', 'updated_at'];
const ALLOWED_CUSTOM_HABIT_FIELDS = ['id', 'user_id', 'title', 'axis', 'type', 'icon', 'target_quantity', 'is_active', 'created_at'];
const ALLOWED_DAILY_HABIT_FIELDS = [
  'id', 'user_id', 'date', 'bible', 'prayer', 'meditation', 'reading', 'documentary', 'sport',
  'light_work', 'deep_work', 'after_work', 'prospects_contacted', 'calls_made', 'content_published',
  'client_projects', 'learning_minutes', 'comments', 'progression', 'habit_score', 'work_score',
  'business_score', 'learning_score', 'total_score', 'created_at', 'updated_at'
];

function sanitizeObject(obj: any, allowedKeys: string[]) {
  if (!obj || typeof obj !== 'object') return {};
  const cleaned: any = {};
  for (const key of allowedKeys) {
    if (key in obj && obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

/**
 * Marque qu'une action de modification a été effectuée localement par cet appareil,
 * afin de ne pas déclencher de boucle de ré-actualisation lors de l'écho Realtime Supabase.
 */
export function markLocalSelfMutation() {
  isLocalSelfMutation = true;
  if (selfMutationTimeout) clearTimeout(selfMutationTimeout);
  selfMutationTimeout = setTimeout(() => {
    isLocalSelfMutation = false;
  }, 3000);
}

/**
 * Dispatche un événement personnalisé dans la fenêtre browser
 * pour informer immédiatement tous les composants réactifs des changements de données.
 */
export function broadcastDataUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cashsave_data_updated'));
  }
}

/**
 * Fusionne en toute sécurité les données locales et distantes.
 * AUCUNE DONNÉE LOCALE N'EST JAMAIS SUPPRIMÉE OU EFFACÉE PAR ERREUR.
 * Retourne si les données ont réellement changé.
 */
function safeMergeAndPersist<T extends { id?: string; user_id?: string; date?: string }>(
  storageKey: string,
  remoteData: T[] | null,
  userId: string,
  conflictField: 'id' | 'date' = 'id'
): { merged: T[]; hasChanged: boolean } {
  let localData: T[] = [];
  const rawBefore = localStorage.getItem(storageKey) || '[]';
  try {
    if (rawBefore) localData = JSON.parse(rawBefore);
  } catch (e) {}

  if (!Array.isArray(localData)) localData = [];

  const map = new Map<string, T>();

  // 1. Préserver toutes les données locales existantes
  for (const item of localData) {
    if (!item) continue;
    const validId = ensureUUID(item.id);
    const key = conflictField === 'date' && item.date ? String(item.date).substring(0, 10) : validId;
    map.set(key, { ...item, id: validId, user_id: userId });
  }

  // 2. Fusionner les données de Supabase (les données distantes mettent à jour les champs existants)
  if (Array.isArray(remoteData)) {
    for (const item of remoteData) {
      if (!item) continue;
      const validId = ensureUUID(item.id);
      const key = conflictField === 'date' && item.date ? String(item.date).substring(0, 10) : validId;
      const existing = map.get(key);
      map.set(key, { ...existing, ...item, id: validId, user_id: userId });
    }
  }

  const merged = Array.from(map.values());
  const rawAfter = JSON.stringify(merged);
  const hasChanged = rawBefore !== rawAfter;

  if (hasChanged) {
    localStorage.setItem(storageKey, rawAfter);
  }

  return { merged, hasChanged };
}

/**
 * Synchronise l'ensemble des données de l'utilisateur entre Supabase et le localStorage.
 * Garantit la fusion bidirectionnelle et la protection absolue contre les pertes de données.
 */
export async function syncUserDataFromSupabase(userId: string) {
  if (!isLiveSupabaseConfigured() || !userId || isSyncingInFlight) return;
  isSyncingInFlight = true;

  const supabase = createClient();

  try {
    // 1. Récupération simultanée de toutes les tables Supabase
    const [
      profileRes,
      initBalRes,
      habitPrefRes,
      txRes,
      habitRes,
      taskRes,
      objRes,
      customHabitsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('initial_balances').select('*').eq('user_id', userId),
      supabase.from('user_habit_preferences').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('daily_habits').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('objectives').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('custom_habits').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    // Profile
    if (profileRes.data) {
      const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
      localStorage.setItem('cashsave_user', JSON.stringify({ ...localUser, ...profileRes.data }));
    }

    // Fusion sécurisée des 5 collections principales avec UUIDs valides
    const resTx = safeMergeAndPersist('cashsave_transactions', txRes.data, userId, 'id');
    const resHabits = safeMergeAndPersist('cashsave_habits', habitRes.data, userId, 'date');
    const resTasks = safeMergeAndPersist('cashsave_tasks', taskRes.data, userId, 'id');
    const resObj = safeMergeAndPersist('cashsave_objectives', objRes.data, userId, 'id');
    const resCustom = safeMergeAndPersist('cashsave_custom_habits', customHabitsRes.data, userId, 'id');

    if (Array.isArray(initBalRes.data) && initBalRes.data.length > 0) {
      localStorage.setItem('cashsave_initial_balances', JSON.stringify(initBalRes.data));
    }
    if (Array.isArray(habitPrefRes.data) && habitPrefRes.data.length > 0) {
      localStorage.setItem('cashsave_habit_preferences', JSON.stringify(habitPrefRes.data));
    }

    // 2. Auto-sauvegarde / Push systématique vers Supabase de l'ensemble fusionné
    await pushMergedDataToSupabase(supabase, userId, {
      transactions: resTx.merged,
      daily_habits: resHabits.merged,
      tasks: resTasks.merged,
      objectives: resObj.merged,
      custom_habits: resCustom.merged,
    });

    const anyChanged = resTx.hasChanged || resHabits.hasChanged || resTasks.hasChanged || resObj.hasChanged || resCustom.hasChanged;

    // Seulement si des données ont VRAIMENT changé par rapport au stockage local
    if (anyChanged) {
      broadcastDataUpdate();
    }
  } catch (e) {
    console.error('Error syncing user data from Supabase:', e);
  } finally {
    isSyncingInFlight = false;
  }
}

async function pushMergedDataToSupabase(supabase: any, userId: string, data: {
  transactions: any[];
  daily_habits: any[];
  tasks: any[];
  objectives: any[];
  custom_habits: any[];
}) {
  try {
    // Transactions
    if (data.transactions.length > 0) {
      const payload = data.transactions.map(t => sanitizeObject({ ...t, id: ensureUUID(t.id), user_id: userId }, ALLOWED_TX_FIELDS));
      const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
      if (error) console.error('Supabase transactions upsert error:', error);
    }

    // Tasks
    if (data.tasks.length > 0) {
      const payload = data.tasks.map(t => sanitizeObject({ ...t, id: ensureUUID(t.id), user_id: userId }, ALLOWED_TASK_FIELDS));
      const { error } = await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
      if (error) console.error('Supabase tasks upsert error:', error);
    }

    // Objectives
    if (data.objectives.length > 0) {
      const payload = data.objectives.map(o => sanitizeObject({ ...o, id: ensureUUID(o.id), user_id: userId }, ALLOWED_OBJ_FIELDS));
      let { error } = await supabase.from('objectives').upsert(payload, { onConflict: 'id' });
      if (error && error.message?.includes('column')) {
        // Fallback si la migration 004 n'a pas encore été exécutée dans Supabase SQL Editor
        const fallbackFields = ALLOWED_OBJ_FIELDS.filter(f => f !== 'target_amount' && f !== 'allocated_budget');
        const fallbackPayload = data.objectives.map(o => sanitizeObject({ ...o, id: ensureUUID(o.id), user_id: userId }, fallbackFields));
        const retryRes = await supabase.from('objectives').upsert(fallbackPayload, { onConflict: 'id' });
        if (retryRes.error) console.error('Supabase objectives fallback error:', retryRes.error);
      }
    }

    // Custom Habits
    if (data.custom_habits.length > 0) {
      const payload = data.custom_habits.map(h => sanitizeObject({ ...h, id: ensureUUID(h.id), user_id: userId }, ALLOWED_CUSTOM_HABIT_FIELDS));
      let { error } = await supabase.from('custom_habits').upsert(payload, { onConflict: 'id' });
      if (error && error.message?.includes('column')) {
        // Fallback si target_quantity n'existe pas encore dans la base
        const fallbackFields = ALLOWED_CUSTOM_HABIT_FIELDS.filter(f => f !== 'target_quantity');
        const fallbackPayload = data.custom_habits.map(h => sanitizeObject({ ...h, id: ensureUUID(h.id), user_id: userId }, fallbackFields));
        const retryRes = await supabase.from('custom_habits').upsert(fallbackPayload, { onConflict: 'id' });
        if (retryRes.error) console.error('Supabase custom_habits fallback error:', retryRes.error);
      }
    }

    // Daily Habits
    if (data.daily_habits.length > 0) {
      const payload = data.daily_habits.map(h => sanitizeObject({ ...h, id: ensureUUID(h.id), user_id: userId }, ALLOWED_DAILY_HABIT_FIELDS));
      const { error } = await supabase.from('daily_habits').upsert(payload, { onConflict: 'user_id,date' });
      if (error) console.error('Supabase daily_habits upsert error:', error);
    }
  } catch (e) {
    console.error('pushMergedDataToSupabase error:', e);
  }
}

/**
 * Souscrit en temps réel aux canaux Supabase Postgres Changes
 * pour répercuter immédiatement sur cet appareil les modifications
 * effectuées sur un autre ordinateur / téléphone par le même utilisateur.
 */
export function subscribeToUserRealtimeChanges(userId: string, onDataChanged?: () => void) {
  if (!isLiveSupabaseConfigured() || !userId) return () => {};
  const supabase = createClient();

  const channel = supabase
    .channel(`user-sync-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', filter: `user_id=eq.${userId}` },
      async () => {
        // Si la modification vient de cet appareil lui-même, on n'invalide pas l'IHM
        if (isLocalSelfMutation) return;

        await syncUserDataFromSupabase(userId);
        if (onDataChanged) onDataChanged();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
