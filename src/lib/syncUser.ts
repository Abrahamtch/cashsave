import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';

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
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('initial_balances').select('*').eq('user_id', userId),
      supabase.from('user_habit_preferences').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('daily_habits').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('objectives').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
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
  } catch (e) {
    /* Repli automatique local en cas de déconnexion */
  }
}
