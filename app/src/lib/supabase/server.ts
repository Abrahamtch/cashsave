import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : 'https://demo.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo_anon_key';

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be ignored if called from a Server Component
        }
      },
    },
  });
}
