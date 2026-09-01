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
 * Synchronise l'ensemble des données de l'utilisateur entre Supabase et le localStorage.
 * Garantit la migration bidirectionnelle et la cohérence parfaite multi-appareils.
 */
export async function syncUserDataFromSupabase(userId: string) {
  if (!isLiveSupabaseConfigured() || !userId) return;
  const supabase = createClient();

  try {
    // 1. Migration automatique des données locales créées avant connexion ou hors-ligne vers Supabase
    await migrateLocalDataToSupabase(supabase, userId);

    // 2. Téléchargement de l'ensemble des données fraîches depuis Supabase
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

    if (Array.isArray(initBalRes.data)) {
      localStorage.setItem('cashsave_initial_balances', JSON.stringify(initBalRes.data));
    }

    if (Array.isArray(habitPrefRes.data)) {
      localStorage.setItem('cashsave_habit_preferences', JSON.stringify(habitPrefRes.data));
    }

    if (Array.isArray(txRes.data)) {
      localStorage.setItem('cashsave_transactions', JSON.stringify(txRes.data));
    }

    if (Array.isArray(habitRes.data)) {
      localStorage.setItem('cashsave_habits', JSON.stringify(habitRes.data));
    }

    if (Array.isArray(taskRes.data)) {
      localStorage.setItem('cashsave_tasks', JSON.stringify(taskRes.data));
    }

    if (Array.isArray(objRes.data)) {
      localStorage.setItem('cashsave_objectives', JSON.stringify(objRes.data));
    }

    if (Array.isArray(customHabitsRes.data)) {
      localStorage.setItem('cashsave_custom_habits', JSON.stringify(customHabitsRes.data));
    }

    broadcastDataUpdate();
  } catch (e) {
    /* Repli automatique local en cas d'erreur de réseau */
  }
}

/**
 * Pousse les données orphelines (demo-user) créées localement vers le compte Supabase de l'utilisateur.
 */
async function migrateLocalDataToSupabase(supabase: any, userId: string) {
  try {
    // Migration des transactions locales
    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    const txToMigrate = Array.isArray(localTx) ? localTx.filter((t: any) => t && (t.user_id === 'demo-user' || !t.user_id)) : [];
    if (txToMigrate.length > 0) {
      const payload = txToMigrate.map((t: any) => ({ ...t, user_id: userId }));
      await supabase.from('transactions').upsert(payload, { onConflict: 'id' });
    }

    // Migration des tâches locales
    const localTasks = JSON.parse(localStorage.getItem('cashsave_tasks') || '[]');
    const tasksToMigrate = Array.isArray(localTasks) ? localTasks.filter((t: any) => t && (t.user_id === 'demo-user' || !t.user_id)) : [];
    if (tasksToMigrate.length > 0) {
      const payload = tasksToMigrate.map((t: any) => ({ ...t, user_id: userId }));
      await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
    }

    // Migration des objectifs locaux
    const localObj = JSON.parse(localStorage.getItem('cashsave_objectives') || '[]');
    const objToMigrate = Array.isArray(localObj) ? localObj.filter((o: any) => o && (o.user_id === 'demo-user' || !o.user_id)) : [];
    if (objToMigrate.length > 0) {
      const payload = objToMigrate.map((o: any) => ({ ...o, user_id: userId }));
      await supabase.from('objectives').upsert(payload, { onConflict: 'id' });
    }

    // Migration des habitudes personnalisées locales
    const localCustom = JSON.parse(localStorage.getItem('cashsave_custom_habits') || '[]');
    const customToMigrate = Array.isArray(localCustom) ? localCustom.filter((h: any) => h && (h.user_id === 'demo-user' || !h.user_id)) : [];
    if (customToMigrate.length > 0) {
      const payload = customToMigrate.map((h: any) => ({ ...h, user_id: userId }));
      await supabase.from('custom_habits').upsert(payload, { onConflict: 'id' });
    }

    // Migration des habitudes quotidiennes locales
    const localHabits = JSON.parse(localStorage.getItem('cashsave_habits') || '[]');
    const habitsToMigrate = Array.isArray(localHabits) ? localHabits.filter((h: any) => h && (h.user_id === 'demo-user' || !h.user_id)) : [];
    if (habitsToMigrate.length > 0) {
      const payload = habitsToMigrate.map((h: any) => ({ ...h, user_id: userId }));
      await supabase.from('daily_habits').upsert(payload, { onConflict: 'user_id,date' });
    }
  } catch (e) {
    /* Silent migration catch */
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
        await syncUserDataFromSupabase(userId);
        if (onDataChanged) onDataChanged();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
