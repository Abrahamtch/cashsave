/**
 * Détecte si des clés Supabase de production réelles sont configurées dans .env.local
 */
export function isLiveSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (url.includes('your-project-id') || url.includes('demo.supabase') || url.includes('placeholder')) return false;
  if (key.includes('your_') || key.includes('demo_') || key.includes('placeholder')) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  return true;
}
