import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client for background cron execution
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  return handleRemindersCron();
}

export async function POST() {
  return handleRemindersCron();
}

async function handleRemindersCron() {
  const supabase = getSupabaseAdmin();
  const todayStr = new Date().toISOString().substring(0, 10);

  if (!supabase) {
    return NextResponse.json({
      success: true,
      message: 'Supabase client not configured for cron, returning simulated status.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // 1. Fetch profiles with notifications enabled
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, reminder_enabled, reminder_time, whatsapp_enabled, whatsapp_number')
      .or('reminder_enabled.eq.true,whatsapp_enabled.eq.true');

    if (error || !profiles) {
      return NextResponse.json({ success: false, error: error?.message || 'No profiles found' }, { status: 500 });
    }

    let sentCount = 0;
    const results = [];

    for (const profile of profiles) {
      // 2. Check if user logged any transaction or habit today
      const [txRes, habitRes] = await Promise.all([
        supabase.from('transactions').select('id').eq('user_id', profile.id).gte('date', todayStr).limit(1),
        supabase.from('daily_habits').select('id').eq('user_id', profile.id).eq('date', todayStr).limit(1),
      ]);

      const hasTx = txRes.data && txRes.data.length > 0;
      const hasHabit = habitRes.data && habitRes.data.length > 0;

      // If user already logged activity today, skip reminder
      if (hasTx || hasHabit) {
        results.push({ id: profile.id, status: 'skipped_activity_completed' });
        continue;
      }

      // 3. Send WhatsApp reminder if enabled & number exists
      if (profile.whatsapp_enabled && profile.whatsapp_number) {
        const whatsappToken = process.env.WHATSAPP_API_TOKEN;
        const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;

        if (whatsappToken && whatsappPhoneId) {
          try {
            await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: profile.whatsapp_number.replace(/[^0-9]/g, ''),
                type: 'text',
                text: {
                  body: `Salut ${profile.full_name || ''} 👋 C'est l'heure de ton bilan Cash Save !\n\nAs-tu des dépenses ou des habitudes à enregistrer aujourd'hui ? 📊✨`,
                },
              }),
            });
            sentCount++;
            results.push({ id: profile.id, status: 'whatsapp_sent' });
          } catch (e) {
            results.push({ id: profile.id, status: 'whatsapp_failed' });
          }
        } else {
          // Log simulated dispatch when live API keys are pending
          results.push({ id: profile.id, status: 'whatsapp_simulated_no_api_key' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      today: todayStr,
      checked_profiles: profiles.length,
      sent_count: sentCount,
      details: results,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
