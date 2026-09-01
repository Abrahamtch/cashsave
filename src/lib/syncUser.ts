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
 * Synchronise l'ensemble des données de l'utilisateur depuis Supabase vers le localStorage.
 * Permet une expérience multi-appareils sans faille et garantit que l'espace utilisateur
 * retrouve ses soldes, ses habitudes et ses tâches sur n'importe quel navigateur/appareil.
 */
export async function syncUserDataFromSupabase(userId: string) {
  if (!isLiveSupabaseConfigured()) return;
  const supabase = createClient();

  try {
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
      localStorage.setItem(
        'cashsave_user',
        JSON.stringify({ ...localUser, ...profileRes.data })
      );
    }

    if (initBalRes.data && initBalRes.data.length > 0) {
      localStorage.setItem('cashsave_initial_balances', JSON.stringify(initBalRes.data));
    }

    if (habitPrefRes.data && habitPrefRes.data.length > 0) {
      localStorage.setItem('cashsave_habit_preferences', JSON.stringify(habitPrefRes.data));
    }

    if (txRes.data && txRes.data.length > 0) {
      localStorage.setItem('cashsave_transactions', JSON.stringify(txRes.data));
    }

    if (habitRes.data && habitRes.data.length > 0) {
      localStorage.setItem('cashsave_habits', JSON.stringify(habitRes.data));
    }

    if (taskRes.data && taskRes.data.length > 0) {
      localStorage.setItem('cashsave_tasks', JSON.stringify(taskRes.data));
    }

    if (objRes.data && objRes.data.length > 0) {
      localStorage.setItem('cashsave_objectives', JSON.stringify(objRes.data));
    }

    if (customHabitsRes.data && customHabitsRes.data.length > 0) {
      localStorage.setItem('cashsave_custom_habits', JSON.stringify(customHabitsRes.data));
    }

    broadcastDataUpdate();
  } catch (e) {
    /* Repli automatique local en cas de déconnexion */
  }
}

/**
 * Souscrit en temps réel aux canaux Supabase Postgres Changes
 * pour répercuter immédiatement sur cet appareil les modifications
 * effectuées sur un autre ordinateur / téléphone par le même utilisateur.
 */
export function subscribeToUserRealtimeChanges(userId: string, onDataChanged?: () => void) {
  if (!isLiveSupabaseConfigured()) return () => {};
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
