/**
 * Cash Save — Notifications & Rappels Discipline (Production)
 *
 * Gère les paramètres de notification, les notifications locales,
 * et l'intégration avec le système Web Push et WhatsApp.
 */

import { generateSmartWhatsAppMessage, WhatsAppMessageContext } from './whatsappMessages';

export interface NotificationSettings {
  reminder_enabled: boolean;
  reminder_time: string; // HH:mm format, e.g. "20:00"
  whatsapp_enabled: boolean;
  whatsapp_number: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  reminder_enabled: true,
  reminder_time: '20:00',
  whatsapp_enabled: false,
  whatsapp_number: '',
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const saved = localStorage.getItem('cashsave_notification_settings');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('cashsave_notification_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('cashsave_data_updated'));
  } catch (e) {}
}

export async function requestWebNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    return 'denied';
  }
}

export function sendLocalNotification(title: string, body: string, icon = '/icons/icon-192.png'): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag: 'cashsave-reminder',
          data: { url: '/habits' },
        });
      });
    } else {
      new Notification(title, { body, icon });
    }
    return true;
  } catch (e) {
    console.error('Error sending local notification:', e);
    return false;
  }
}

export function checkTodayActivityLogged(): boolean {
  if (typeof window === 'undefined') return false;
  const todayStr = new Date().toISOString().substring(0, 10);

  // 1. Check transactions
  const tx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
  const hasTx = Array.isArray(tx) && tx.some((t: any) => t?.date && String(t.date).substring(0, 10) === todayStr);
  if (hasTx) return true;

  // 2. Check habits logged
  const habits = JSON.parse(localStorage.getItem('cashsave_habits') || '[]');
  const foundHabit = Array.isArray(habits) && habits.find((h: any) => h?.date && String(h.date).substring(0, 10) === todayStr);
  if (foundHabit) {
    const activeKeys = Object.keys(foundHabit).filter(k => 
      !['id', 'user_id', 'date', 'comments', 'progression', 'created_at', 'updated_at', 'habit_score', 'work_score', 'business_score', 'learning_score', 'total_score', 'custom_logs'].includes(k)
    );
    const hasAnyLogged = activeKeys.some(k => Boolean(foundHabit[k]));
    if (hasAnyLogged) return true;
  }

  return false;
}

// ─── WhatsApp: Smart Message (for test button in ReminderSettingsModal) ─────
export function triggerTestWhatsAppReminder(phoneNumber: string): string {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

  // Gather context from localStorage for personalized test message
  const context = getLocalUserContext();
  const message = generateSmartWhatsAppMessage(context);
  const text = encodeURIComponent(message);

  return `https://wa.me/${cleanNumber}?text=${text}`;
}

// ─── Legacy wrapper for backward compat ─────────────────────────
export function triggerTestWhatsAppReminderLegacy(phoneNumber: string): string {
  return triggerTestWhatsAppReminder(phoneNumber);
}

// ─── Gather user context from localStorage (client-side only) ───
export function getLocalUserContext(): WhatsAppMessageContext {
  if (typeof window === 'undefined') {
    return {
      userName: 'Champion',
      currentStreak: 0,
      yesterdayScore: 0,
      weeklyAverage: 0,
      weekExpenses: 0,
      weekIncome: 0,
      totalActiveHabits: 0,
      completedHabitsYesterday: 0,
    };
  }

  const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
  const habits: any[] = JSON.parse(localStorage.getItem('cashsave_habits') || '[]');
  const transactions: any[] = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');

  // Calculate streak
  let currentStreak = 0;
  if (habits.length > 0) {
    const sorted = [...habits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const habitDate = new Date(sorted[i].date);
      habitDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (habitDate.getTime() !== expectedDate.getTime()) break;
      if (sorted[i].total_score >= 50) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Yesterday's score
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().substring(0, 10);
  const yesterdayHabit = habits.find(h => h.date === yesterdayStr);
  const yesterdayScore = yesterdayHabit ? Math.round(yesterdayHabit.total_score || 0) : 0;

  // Weekly expenses/income
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const weekTx = transactions.filter(t => t.date >= weekAgo);
  const weekExpenses = weekTx.filter(t => t.type === 'EXPENSE').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  const weekIncome = weekTx.filter(t => t.type === 'INCOME').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

  // Active habits count
  const prefs = JSON.parse(localStorage.getItem('cashsave_habit_preferences') || '[]');
  const customHabits = JSON.parse(localStorage.getItem('cashsave_custom_habits') || '[]');
  const totalActiveHabits = (Array.isArray(prefs) ? prefs.filter((p: any) => p.is_active).length : 0) +
    (Array.isArray(customHabits) ? customHabits.length : 0);

  // Weekly average
  const last7Habits = habits.filter(h => h.date >= weekAgo);
  const weeklyAverage = last7Habits.length > 0
    ? Math.round(last7Habits.reduce((sum: number, h: any) => sum + (h.total_score || 0), 0) / last7Habits.length)
    : 0;

  return {
    userName: localUser.full_name || 'Champion',
    currentStreak,
    yesterdayScore,
    weeklyAverage,
    weekExpenses: Math.round(weekExpenses),
    weekIncome: Math.round(weekIncome),
    totalActiveHabits,
    completedHabitsYesterday: 0,
  };
}
