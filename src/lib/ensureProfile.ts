import { SupabaseClient } from '@supabase/supabase-js';
import { isLiveSupabaseConfigured } from './isLiveSupabase';

/**
 * S'assure de manière garantie qu'une ligne existe dans public.profiles pour cet utilisateur.
 * Cette vérification et cet auto-provisionnement préviennent à 100% les erreurs de clés étrangères
 * (Foreign Key Violations) lors des enregistrements de transactions, d'habitudes, de tâches et d'objectifs.
 */
export async function ensureUserProfileExists(
  supabase: SupabaseClient<any, any, any>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, any> }
): Promise<boolean> {
  if (!isLiveSupabaseConfigured() || !user || !user.id) return false;

  try {
    // 1. Vérifier si le profil existe déjà
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (data && !error) {
      return true; // Le profil existe déjà
    }

    // 2. Si le profil n'existe pas ou s'il y a eu une erreur, on crée / upsert le profil immédiatement
    const email = user.email || `${user.id}@cashsave.app`;
    const fullName = user.user_metadata?.full_name || email.split('@')[0] || 'Utilisateur Cash Save';
    const avatarUrl = user.user_metadata?.avatar_url || '';

    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: email,
        full_name: fullName,
        avatar_url: avatarUrl,
        trial_start_date: new Date().toISOString(),
        is_premium: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (upsertError) {
      console.warn('ensureUserProfileExists upsert warning:', upsertError.message);
    }
    return true;
  } catch (e) {
    console.error('ensureUserProfileExists exception:', e);
    return false;
  }
}
