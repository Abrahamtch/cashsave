import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : 'https://demo.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo_anon_key';
  return createBrowserClient(url, anonKey);
}
