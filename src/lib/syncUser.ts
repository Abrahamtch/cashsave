import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { ensureUUID } from '@/lib/uuid';
import { ensureUserProfileExists } from '@/lib/ensureProfile';

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
 * Isole les données pour éviter toute contamination inter-comptes.
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

  // 1. Préserver les données locales qui appartiennent à cet utilisateur ou créées sans ID spécifique
  for (const item of localData) {
    if (!item) continue;
    // Sécurité inter-compte : Si l'élément appartient explicitement à un autre utilisateur UUID, on l'ignore
    if (item.user_id && item.user_id !== userId && item.user_id !== 'demo-user' && item.user_id.length > 20) {
      continue;
    }
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
 * Garantit la fusion bidirectionnelle, l'auto-creation du profil et la protection contre la perte de données.
 */
export async function syncUserDataFromSupabase(userId: string) {
  if (!isLiveSupabaseConfigured() || !userId || isSyncingInFlight) return;
  isSyncingInFlight = true;

  const supabase = createClient();

  try {
    // 0. Auto-provisionnement garanti du profil utilisateur pour éliminer tout risque de Foreign Key Violation
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      await ensureUserProfileExists(supabase, authData.user);
    } else {
      await ensureUserProfileExists(supabase, { id: userId });
    }

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

    // 2. Auto-sauvegarde / Push systématique par lots (chunks de 100) vers Supabase de l'ensemble fusionné
    await pushMergedDataToSupabase(supabase, userId, {
      transactions: resTx.merged,
      daily_habits: resHabits.merged,
      tasks: resTasks.merged,
      objectives: resObj.merged,
      custom_habits: resCustom.merged,
    });

    const anyChanged = resTx.hasChanged || resHabits.hasChanged || resTasks.hasChanged || resObj.hasChanged || resCustom.hasChanged;

    if (anyChanged) {
      broadcastDataUpdate();
    }
  } catch (e) {
    console.error('Error syncing user data from Supabase:', e);
  } finally {
    isSyncingInFlight = false;
  }
}

/**
 * Envoie les données vers Supabase par lots (chunks de 100) pour accueillir des milliers
 * d'utilisateurs et des volumes massifs de données sans dépasser les limites de requêtes HTTP / PostgREST.
 */
async function pushMergedDataToSupabase(supabase: any, userId: string, data: {
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
        const retryRes = await supabase.from(table).upsert(fallbackChunk, { onConflict });
        if (retryRes.error) {
          console.error(`Supabase ${table} fallback chunk upsert error:`, retryRes.error);
        }
      } else if (error) {
        console.error(`Supabase ${table} chunk upsert error:`, error);
      }
    }
  }

  try {
    // Transactions
    if (data.transactions.length > 0) {
      const payload = data.transactions.map(t => sanitizeObject({ ...t, id: ensureUUID(t.id), user_id: userId }, ALLOWED_TX_FIELDS));
      await batchUpsert('transactions', payload, 'id');
    }

    // Tasks
    if (data.tasks.length > 0) {
      const payload = data.tasks.map(t => sanitizeObject({ ...t, id: ensureUUID(t.id), user_id: userId }, ALLOWED_TASK_FIELDS));
      await batchUpsert('tasks', payload, 'id');
    }

    // Objectives
    if (data.objectives.length > 0) {
      const payload = data.objectives.map(o => sanitizeObject({ ...o, id: ensureUUID(o.id), user_id: userId }, ALLOWED_OBJ_FIELDS));
      const fallbackFields = ALLOWED_OBJ_FIELDS.filter(f => f !== 'target_amount' && f !== 'allocated_budget');
      await batchUpsert('objectives', payload, 'id', fallbackFields);
    }

    // Custom Habits
    if (data.custom_habits.length > 0) {
      const payload = data.custom_habits.map(h => sanitizeObject({ ...h, id: ensureUUID(h.id), user_id: userId }, ALLOWED_CUSTOM_HABIT_FIELDS));
      const fallbackFields = ALLOWED_CUSTOM_HABIT_FIELDS.filter(f => f !== 'target_quantity');
      await batchUpsert('custom_habits', payload, 'id', fallbackFields);
    }

    // Daily Habits
    if (data.daily_habits.length > 0) {
      const payload = data.daily_habits.map(h => sanitizeObject({ ...h, id: ensureUUID(h.id), user_id: userId }, ALLOWED_DAILY_HABIT_FIELDS));
      await batchUpsert('daily_habits', payload, 'user_id,date');
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
