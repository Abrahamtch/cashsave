/**
 * Cash Save — Notifications & Rappels Discipline
 */

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

export function sendLocalNotification(title: string, body: string, icon = '/icons/icon-192x192.png'): boolean {
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
          data: { url: '/cash' },
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
      !['id', 'user_id', 'date', 'comments', 'progression', 'created_at', 'habit_score', 'work_score', 'business_score', 'learning_score', 'total_score'].includes(k)
    );
    const hasAnyLogged = activeKeys.some(k => Boolean(foundHabit[k]));
    if (hasAnyLogged) return true;
  }

  return false;
}

export function triggerTestWhatsAppReminder(phoneNumber: string): string {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(
    `Salut ! 👋 C'est Cash Save.\n\n` +
    `💡 Rappel quotidien : As-tu enregistré tes revenus, dépenses et habitudes aujourd'hui ?\n\n` +
    `Prends 2 minutes pour garder ta trésorerie et ta discipline sous contrôle ! 📊✨`
  );
  return `https://wa.me/${cleanNumber}?text=${text}`;
}
