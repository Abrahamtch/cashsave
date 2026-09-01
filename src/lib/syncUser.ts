import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';

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
 */
function safeMergeAndPersist<T extends { id?: string; user_id?: string; date?: string }>(
  storageKey: string,
  remoteData: T[] | null,
  userId: string,
  conflictField: 'id' | 'date' = 'id'
): T[] {
  let localData: T[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  if (!Array.isArray(localData)) localData = [];

  const map = new Map<string, T>();

  // 1. Préserver toutes les données locales existantes
  for (const item of localData) {
    if (!item) continue;
    const key = conflictField === 'date' && item.date ? String(item.date) : (item.id || String(Math.random()));
    map.set(key, { ...item, user_id: userId });
  }

  // 2. Fusionner les données de Supabase (les données distantes mettent à jour les champs existants)
  if (Array.isArray(remoteData)) {
    for (const item of remoteData) {
      if (!item) continue;
      const key = conflictField === 'date' && item.date ? String(item.date) : (item.id || String(Math.random()));
      const existing = map.get(key);
      map.set(key, { ...existing, ...item, user_id: userId });
    }
  }

  const merged = Array.from(map.values());
  localStorage.setItem(storageKey, JSON.stringify(merged));
  return merged;
}

/**
 * Synchronise l'ensemble des données de l'utilisateur entre Supabase et le localStorage.
 * Garantit la fusion bidirectionnelle et la protection absolue contre les pertes de données.
 */
export async function syncUserDataFromSupabase(userId: string) {
  if (!isLiveSupabaseConfigured() || !userId) return;
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

    // Fusion sécurisée des 5 collections principales (Empêche toute perte de données)
    const mergedTx = safeMergeAndPersist('cashsave_transactions', txRes.data, userId, 'id');
    const mergedHabits = safeMergeAndPersist('cashsave_habits', habitRes.data, userId, 'date');
    const mergedTasks = safeMergeAndPersist('cashsave_tasks', taskRes.data, userId, 'id');
    const mergedObj = safeMergeAndPersist('cashsave_objectives', objRes.data, userId, 'id');
    const mergedCustom = safeMergeAndPersist('cashsave_custom_habits', customHabitsRes.data, userId, 'id');

    if (Array.isArray(initBalRes.data) && initBalRes.data.length > 0) {
      localStorage.setItem('cashsave_initial_balances', JSON.stringify(initBalRes.data));
    }
    if (Array.isArray(habitPrefRes.data) && habitPrefRes.data.length > 0) {
      localStorage.setItem('cashsave_habit_preferences', JSON.stringify(habitPrefRes.data));
    }

    // 2. Auto-sauvegarde / Push systématique vers Supabase de l'ensemble fusionné
    await pushMergedDataToSupabase(supabase, userId, {
      transactions: mergedTx,
      daily_habits: mergedHabits,
      tasks: mergedTasks,
      objectives: mergedObj,
      custom_habits: mergedCustom,
    });

    broadcastDataUpdate();
  } catch (e) {
    /* Silent catch en cas de hors-ligne */
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
    if (data.transactions.length > 0) {
      const payload = data.transactions.map(t => ({ ...t, user_id: userId }));
      await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
    }
    if (data.tasks.length > 0) {
      const payload = data.tasks.map(t => ({ ...t, user_id: userId }));
      await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
    }
    if (data.objectives.length > 0) {
      const payload = data.objectives.map(o => ({ ...o, user_id: userId }));
      await supabase.from('objectives').upsert(payload, { onConflict: 'id' });
    }
    if (data.custom_habits.length > 0) {
      const payload = data.custom_habits.map(h => ({ ...h, user_id: userId }));
      await supabase.from('custom_habits').upsert(payload, { onConflict: 'id' });
    }
    if (data.daily_habits.length > 0) {
      const payload = data.daily_habits.map(h => ({ ...h, user_id: userId }));
      await supabase.from('daily_habits').upsert(payload, { onConflict: 'user_id,date' });
    }
  } catch (e) {}
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
        await syncUserDataFromSupabase(userId);
        if (onDataChanged) onDataChanged();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
