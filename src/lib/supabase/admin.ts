import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase « service role » — SERVEUR UNIQUEMENT.
 * Contourne la RLS : à réserver aux opérations de confiance (paiements, webhooks).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !url.startsWith('http') || !serviceKey || serviceKey.startsWith('your_')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non configurée.');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
