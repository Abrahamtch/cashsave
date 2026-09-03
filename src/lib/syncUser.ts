import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { ensureUUID } from '@/lib/uuid';
import { ensureUserProfileExists } from '@/lib/ensureProfile';

let isSyncingInFlight = false;
let isLocalSelfMutation = false;
let selfMutationTimeout: NodeJS.Timeout | null = null;
let lastSyncTime = 0;

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

/**
 * Nettoie intégralement les données de session du localStorage lors de la déconnexion
 * pour éviter toute contamination des données lors du changement de compte.
 */
export function clearUserDataOnLogout() {
  if (typeof window === 'undefined') return;
  const keysToRemove = [
    'cashsave_user',
    'cashsave_transactions',
    'cashsave_habits',
    'cashsave_tasks',
    'cashsave_objectives',
    'cashsave_custom_habits',
    'cashsave_initial_balances',
    'cashsave_habit_preferences',
    'cashsave_habit_targets',
    'onboarding_draft',
  ];
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  });
}

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
  }, 5000); // 5 secondes de fenêtre de protection contre l'écho
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
 * Fusionne intelligemment et sans risque de perte les données distantes Supabase avec le localStorage.
 * NE SUPPRIME JAMAIS de données locales créées par l'utilisateur.
 */
export function safeMergeAndPersist<T extends { id?: string; user_id?: string; date?: string }>(
  storageKey: string,
  remoteData: T[] | null,
  userId: string,
  conflictField: 'id' | 'date' = 'id'
): { merged: T[]; hasChanged: boolean; unsyncedLocal: T[] } {
  let localData: T[] = [];
  const rawBefore = localStorage.getItem(storageKey) || '[]';
  try {
    if (rawBefore) localData = JSON.parse(rawBefore);
  } catch (e) {}

  if (!Array.isArray(localData)) localData = [];

  const map = new Map<string, T>();
  const remoteKeys = new Set<string>();

  // 1. Charger les données distantes (source de vérité cloud)
  if (Array.isArray(remoteData)) {
    for (const item of remoteData) {
      if (!item) continue;
      const validId = ensureUUID(item.id);
      const key = conflictField === 'date' && item.date ? String(item.date).substring(0, 10) : validId;
      remoteKeys.add(key);
      map.set(key, { ...item, id: validId, user_id: userId });
    }
  }

  const unsyncedLocal: T[] = [];

  // 2. Préserver les éléments locaux qui n'existent pas encore sur le serveur (données non synchronisées)
  for (const item of localData) {
    if (!item) continue;
    if (item.user_id && item.user_id !== userId && item.user_id !== 'demo-user' && item.user_id.length > 20) {
      continue;
    }
    const validId = ensureUUID(item.id);
    const key = conflictField === 'date' && item.date ? String(item.date).substring(0, 10) : validId;

    if (!map.has(key)) {
      const sanitizedLocal = { ...item, id: validId, user_id: userId };
      map.set(key, sanitizedLocal);
      unsyncedLocal.push(sanitizedLocal);
    }
  }

  const merged = Array.from(map.values());
  const rawAfter = JSON.stringify(merged);
  const hasChanged = rawBefore !== rawAfter;

  if (hasChanged) {
    localStorage.setItem(storageKey, rawAfter);
  }

  return { merged, hasChanged, unsyncedLocal };
}

/**
 * Synchronise les données entre Supabase et le stockage local de manière intelligente.
 * Evite les rafraîchissements intempestifs et les boucles de synchronisation infinies.
 */
export async function syncUserDataFromSupabase(userId: string) {
  if (!isLiveSupabaseConfigured() || !userId || isSyncingInFlight) return;
  const now = Date.now();
  // Anti-rebond (debounce) de 2 secondes pour éviter les exécutions en rafale
  if (now - lastSyncTime < 2000) return;

  isSyncingInFlight = true;
  lastSyncTime = now;

  const supabase = createClient();

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      await ensureUserProfileExists(supabase, authData.user);
    } else {
      await ensureUserProfileExists(supabase, { id: userId });
    }

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

    if (profileRes.data) {
      const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
      localStorage.setItem('cashsave_user', JSON.stringify({ ...localUser, ...profileRes.data }));
    }

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

    // Pousser VERS Supabase UNIQUEMENT les éléments locaux non encore présents sur le serveur
    const hasUnsynced = 
      resTx.unsyncedLocal.length > 0 ||
      resHabits.unsyncedLocal.length > 0 ||
      resTasks.unsyncedLocal.length > 0 ||
      resObj.unsyncedLocal.length > 0 ||
      resCustom.unsyncedLocal.length > 0;

    if (hasUnsynced) {
      await pushUnsyncedDataToSupabase(supabase, userId, {
        transactions: resTx.unsyncedLocal,
        daily_habits: resHabits.unsyncedLocal,
        tasks: resTasks.unsyncedLocal,
        objectives: resObj.unsyncedLocal,
        custom_habits: resCustom.unsyncedLocal,
      });
    }

    const anyChanged = resTx.hasChanged || resHabits.hasChanged || resTasks.hasChanged || resObj.hasChanged || resCustom.hasChanged;

    // Ne notifier l'IHM QUE si des données distantes ont réellement modifié le cache local
    // et qu'aucune mutation locale n'est en cours (pour éviter de fermer les modals/formulaires)
    if (anyChanged && !isLocalSelfMutation) {
      broadcastDataUpdate();
    }
  } catch (e) {
    console.error('Error syncing user data from Supabase:', e);
  } finally {
    isSyncingInFlight = false;
  }
}

/**
 * Pousse UNIQUEMENT les éléments non encore enregistrés sur le serveur par lots de 100
 */
async function pushUnsyncedDataToSupabase(supabase: any, userId: string, data: {
  transactions: any[];
  daily_habits: any[];
  tasks: any[];
  objectives: any[];
  custom_habits: any[];
}) {
  const CHUNK_SIZE = 100;

  async function batchUpsert(table: string, payload: any[], onConflict: string, fallbackFields?: string[]) {
    if (payload.length === 0) return;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      let { error } = await supabase.from(table).upsert(chunk, { onConflict });
      if (error && fallbackFields && error.message?.includes('column')) {
        const fallbackChunk = chunk.map(item => sanitizeObject(item, fallbackFields));
        await supabase.from(table).upsert(fallbackChunk, { onConflict });
      }
    }
  }

  try {
    // Verrouiller temporairement la détection d'écho Realtime pendant notre propre push
    markLocalSelfMutation();

    if (data.transactions.length > 0) {
      const payload = data.transactions.map(t => sanitizeObject({ ...t, id: ensureUUID(t.id), user_id: userId }, ALLOWED_TX_FIELDS));
      await batchUpsert('transactions', payload, 'id');
    }
    if (data.tasks.length > 0) {
      const payload = data.tasks.map(t => sanitizeObject({ ...t, id: ensureUUID(t.id), user_id: userId }, ALLOWED_TASK_FIELDS));
      await batchUpsert('tasks', payload, 'id');
    }
    if (data.objectives.length > 0) {
      const payload = data.objectives.map(o => sanitizeObject({ ...o, id: ensureUUID(o.id), user_id: userId }, ALLOWED_OBJ_FIELDS));
      const fallbackFields = ALLOWED_OBJ_FIELDS.filter(f => f !== 'target_amount' && f !== 'allocated_budget');
      await batchUpsert('objectives', payload, 'id', fallbackFields);
    }
    if (data.custom_habits.length > 0) {
      const payload = data.custom_habits.map(h => sanitizeObject({ ...h, id: ensureUUID(h.id), user_id: userId }, ALLOWED_CUSTOM_HABIT_FIELDS));
      const fallbackFields = ALLOWED_CUSTOM_HABIT_FIELDS.filter(f => f !== 'target_quantity');
      await batchUpsert('custom_habits', payload, 'id', fallbackFields);
    }
    if (data.daily_habits.length > 0) {
      const payload = data.daily_habits.map(h => sanitizeObject({ ...h, id: ensureUUID(h.id), user_id: userId }, ALLOWED_DAILY_HABIT_FIELDS));
      await batchUpsert('daily_habits', payload, 'user_id,date');
    }
  } catch (e) {
    console.error('pushUnsyncedDataToSupabase error:', e);
  }
}

export function subscribeToUserRealtimeChanges(userId: string, onDataChanged?: () => void) {
  if (!isLiveSupabaseConfigured() || !userId) return () => {};
  const supabase = createClient();

  const channel = supabase
    .channel(`user-sync-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', filter: `user_id=eq.${userId}` },
      async () => {
        // Bloquer l'écho en temps réel si l'action vient de cet appareil
        if (isLocalSelfMutation || isSyncingInFlight) return;
        await syncUserDataFromSupabase(userId);
        if (onDataChanged) onDataChanged();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
