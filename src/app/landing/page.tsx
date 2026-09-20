import LandingPage from '@/components/LandingPage';
import { createClient } from '@/lib/supabase/server';

export default async function LandingRoute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <LandingPage isLoggedIn={!!user} />;
}
