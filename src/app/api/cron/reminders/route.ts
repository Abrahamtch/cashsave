import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { generatePushNotificationContent, generateMessageFromProfileData } from '@/lib/whatsappMessages';

/**
 * Cash Save — Cron Reminders (Production)
 *
 * This endpoint is called by Vercel Cron (or external cron service)
 * at scheduled times (19h, 20h, 21h, 22h).
 *
 * It does two things for each user who hasn't logged activity today:
 * 1. Sends a Web Push notification (if subscribed)
 * 2. Sends a WhatsApp message via Meta Cloud API (if enabled)
 *
 * Security: Protected by CRON_SECRET to prevent unauthorized access.
 */

// ─── Configuration ──────────────────────────────────────────────
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function configureWebPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@cashsave.app';

  if (!vapidPublicKey || !vapidPrivateKey) return false;

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  return true;
}

// ─── Map reminder_time to cron hours ────────────────────────────
function getCurrentHourSlot(): string {
  // Get current hour in UTC — adjust if your users are in a different timezone
  const now = new Date();
  const hour = now.getUTCHours();
  return `${String(hour).padStart(2, '0')}:00`;
}

// ─── Route Handlers ─────────────────────────────────────────────
export async function GET(request: Request) {
  return handleRemindersCron(request);
}

export async function POST(request: Request) {
  return handleRemindersCron(request);
}

// ─── Main Cron Logic ────────────────────────────────────────────
async function handleRemindersCron(request: Request) {
  // Security: verify cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      success: false,
      error: 'Supabase not configured.',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }

  const webPushConfigured = configureWebPush();
  const whatsappToken = process.env.WHATSAPP_API_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;
  const whatsappConfigured = !!(whatsappToken && whatsappPhoneId);

  const currentHourSlot = getCurrentHourSlot();
  const todayStr = new Date().toISOString().substring(0, 10);
  const weekAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  try {
    // 1. Fetch profiles with notifications enabled AND matching reminder_time
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, reminder_enabled, reminder_time, whatsapp_enabled, whatsapp_number')
      .or('reminder_enabled.eq.true,whatsapp_enabled.eq.true')
      .eq('reminder_time', currentHourSlot);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No profiles scheduled for ${currentHourSlot}.`,
        today: todayStr,
        checked_profiles: 0,
      });
    }

    const results: Array<{ id: string; push?: string; whatsapp?: string }> = [];
    let pushSentCount = 0;
    let whatsappSentCount = 0;

    for (const profile of profiles) {
      const result: { id: string; push?: string; whatsapp?: string } = { id: profile.id };

      // 2. Check if user logged any activity today
      const [txRes, habitRes] = await Promise.all([
        supabase.from('transactions').select('id').eq('user_id', profile.id).gte('date', todayStr).limit(1),
        supabase.from('daily_habits').select('id, total_score').eq('user_id', profile.id).eq('date', todayStr).limit(1),
      ]);

      const hasTx = txRes.data && txRes.data.length > 0;
      const hasHabit = habitRes.data && habitRes.data.length > 0;

      if (hasTx || hasHabit) {
        result.push = 'skipped_already_logged';
        result.whatsapp = 'skipped_already_logged';
        results.push(result);
        continue;
      }

      // 3. Gather user context for personalized messages
      const userContext = await getUserContext(supabase, profile.id, profile.full_name, todayStr, yesterdayStr, weekAgoStr);

      // 4. Send Web Push if enabled & configured
      if (profile.reminder_enabled && webPushConfigured) {
        const pushResult = await sendWebPush(supabase, profile.id, userContext);
        result.push = pushResult;
        if (pushResult === 'sent') pushSentCount++;
      }

      // 5. Send WhatsApp if enabled & configured
      if (profile.whatsapp_enabled && profile.whatsapp_number && whatsappConfigured) {
        const waResult = await sendWhatsAppMessage(
          profile.whatsapp_number,
          userContext,
          whatsappToken!,
          whatsappPhoneId!
        );
        result.whatsapp = waResult;
        if (waResult === 'sent') whatsappSentCount++;
      } else if (profile.whatsapp_enabled && !whatsappConfigured) {
        result.whatsapp = 'skipped_api_not_configured';
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      today: todayStr,
      reminder_time_slot: currentHourSlot,
      checked_profiles: profiles.length,
      push_sent: pushSentCount,
      whatsapp_sent: whatsappSentCount,
      web_push_configured: webPushConfigured,
      whatsapp_configured: whatsappConfigured,
      details: results,
    });
  } catch (e: any) {
    console.error('[Cron Reminders] Server error:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}

// ─── Gather User Context for Personalized Messages ──────────────
async function getUserContext(
  supabase: any,
  userId: string,
  fullName: string | null,
  todayStr: string,
  yesterdayStr: string,
  weekAgoStr: string
) {
  let currentStreak = 0;
  let yesterdayScore = 0;
  let weeklyAverage = 0;
  let weekExpenses = 0;
  let weekIncome = 0;
  let totalActiveHabits = 0;
  let completedHabitsYesterday = 0;

  try {
    // Get yesterday's habit data
    const { data: yesterdayHabit } = await (supabase
      .from('daily_habits') as any)
      .select('total_score')
      .eq('user_id', userId)
      .eq('date', yesterdayStr)
      .single();

    if (yesterdayHabit) {
      yesterdayScore = Math.round(yesterdayHabit.total_score || 0);
    }

    // Get streak (consecutive days with score >= 50, counting backwards from yesterday)
    const { data: recentHabits } = await (supabase
      .from('daily_habits') as any)
      .select('date, total_score')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(60);

    if (recentHabits && recentHabits.length > 0) {
      // Calculate streak
      const today = new Date(todayStr);
      for (let i = 0; i < recentHabits.length; i++) {
        const habitDate = new Date(recentHabits[i].date);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        if (habitDate.toISOString().substring(0, 10) !== expectedDate.toISOString().substring(0, 10)) break;
        if (recentHabits[i].total_score >= 50) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Weekly average
      const last7 = recentHabits.filter((h: any) => h.date >= weekAgoStr);
      if (last7.length > 0) {
        weeklyAverage = Math.round(last7.reduce((sum: number, h: any) => sum + (h.total_score || 0), 0) / last7.length);
      }
    }

    // Get weekly financial data
    const { data: weekTx } = await (supabase
      .from('transactions') as any)
      .select('type, amount')
      .eq('user_id', userId)
      .gte('date', weekAgoStr);

    if (weekTx && weekTx.length > 0) {
      weekExpenses = weekTx.filter((t: any) => t.type === 'EXPENSE').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      weekIncome = weekTx.filter((t: any) => t.type === 'INCOME').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    }

    // Get active habits count
    const { count } = await (supabase
      .from('user_habit_preferences') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    totalActiveHabits = count || 0;
  } catch (e) {
    // Graceful degradation — messages will just be less personalized
    console.warn('[Cron] Error fetching user context:', e);
  }

  return {
    userName: fullName || 'Champion',
    currentStreak,
    yesterdayScore,
    weeklyAverage,
    weekExpenses: Math.round(weekExpenses),
    weekIncome: Math.round(weekIncome),
    totalActiveHabits,
    completedHabitsYesterday,
  };
}

// ─── Send Web Push Notification ─────────────────────────────────
async function sendWebPush(
  supabase: any,
  userId: string,
  context: any
): Promise<string> {
  try {
    // Get all push subscriptions for this user
    const { data: subscriptions } = await (supabase
      .from('push_subscriptions') as any)
      .select('endpoint, keys_p256dh, keys_auth')
      .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) {
      return 'no_subscription';
    }

    const pushContent = generatePushNotificationContent(context);
    const payload = JSON.stringify({
      title: pushContent.title,
      body: pushContent.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'cashsave-evening-reminder',
      data: { url: '/habits' },
    });

    let sentAtLeastOne = false;

    for (const sub of subscriptions as any[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys_p256dh,
              auth: sub.keys_auth,
            },
          },
          payload
        );
        sentAtLeastOne = true;
      } catch (pushError: any) {
        // If subscription is expired/invalid, remove it
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await (supabase
            .from('push_subscriptions') as any)
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', sub.endpoint);
          console.log(`[Cron] Removed expired subscription for user ${userId}`);
        } else {
          console.error(`[Cron] Push send error for user ${userId}:`, pushError.message);
        }
      }
    }

    return sentAtLeastOne ? 'sent' : 'all_expired';
  } catch (e: any) {
    console.error('[Cron] Web Push error:', e);
    return 'error';
  }
}

// ─── Send WhatsApp Message via Meta Cloud API ───────────────────
async function sendWhatsAppMessage(
  phoneNumber: string,
  context: Parameters<typeof generateMessageFromProfileData>[0],
  apiToken: string,
  phoneId: string
): Promise<string> {
  try {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 8) return 'invalid_number';

    const message = generateMessageFromProfileData(context);

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanNumber,
        type: 'text',
        text: {
          preview_url: true,
          body: message,
        },
      }),
    });

    if (response.ok) {
      return 'sent';
    }

    const errorData = await response.json().catch(() => null);
    console.error(`[Cron] WhatsApp API error for ${cleanNumber}:`, errorData);
    return 'api_error';
  } catch (e: any) {
    console.error('[Cron] WhatsApp send error:', e);
    return 'error';
  }
}
