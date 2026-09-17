'use client';

import { useState, useEffect } from 'react';
import { Bell, MessageSquare, Clock, Check, X, Smartphone, Sparkles, Send, ShieldCheck, Loader2, Zap } from 'lucide-react';
import {
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  requestWebNotificationPermission,
  sendLocalNotification,
  triggerTestWhatsAppReminder
} from '@/lib/notifications';
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscriptionStatus,
} from '@/lib/pushSubscription';
import { createClient } from '@/lib/supabase/client';

interface ReminderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COUNTRY_CODES = [
  { code: '+225', label: '🇨🇮 Côte d\'Ivoire (+225)' },
  { code: '+228', label: '🇹🇬 Togo (+228)' },
  { code: '+221', label: '🇸🇳 Sénégal (+221)' },
  { code: '+237', label: '🇨🇲 Cameroun (+237)' },
  { code: '+229', label: '🇧🇯 Bénin (+229)' },
  { code: '+226', label: '🇧🇫 Burkina Faso (+226)' },
  { code: '+243', label: '🇨🇩 RDC (+243)' },
  { code: '+242', label: '🇨🇬 Congo (+242)' },
  { code: '+223', label: '🇲🇱 Mali (+223)' },
  { code: '+224', label: '🇬🇳 Guinée (+224)' },
  { code: '+241', label: '🇬🇦 Gabon (+241)' },
  { code: '+33', label: '🇫🇷 France (+33)' },
];

export default function ReminderSettingsModal({ isOpen, onClose }: ReminderSettingsModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [countryCode, setCountryCode] = useState('+225');
  const [localNumber, setLocalNumber] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    const current = getNotificationSettings();
    setSettings(current);

    if (current.whatsapp_number) {
      const match = COUNTRY_CODES.find(c => current.whatsapp_number.startsWith(c.code));
      if (match) {
        setCountryCode(match.code);
        setLocalNumber(current.whatsapp_number.replace(match.code, '').trim());
      } else {
        setLocalNumber(current.whatsapp_number);
      }
    }

    // Check push subscription status
    getPushSubscriptionStatus().then(status => {
      setPushSupported(status.supported);
      setPushSubscribed(status.subscribed);
      setPermissionStatus(status.permission);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Activate Push Notifications (full flow) ────────────────
  const handleActivatePush = async () => {
    setSubscribing(true);
    try {
      // 1. Register Service Worker
      await registerServiceWorker();

      // 2. Subscribe to push (handles permission request + VAPID + server sync)
      const subscription = await subscribeToPush();

      if (subscription) {
        setPushSubscribed(true);
        setPermissionStatus('granted');
        setSettings(prev => ({ ...prev, reminder_enabled: true }));

        // Show a confirmation notification
        sendLocalNotification(
          'Rappels Cash Save Activés ! ⚡',
          'Vous recevrez une notification chaque soir pour valider vos finances et habitudes.'
        );
      } else {
        // Permission was denied or error
        setPermissionStatus(Notification.permission);
      }
    } catch (e) {
      console.error('Push activation failed:', e);
    }
    setSubscribing(false);
  };

  // ─── Deactivate Push ────────────────────────────────────────
  const handleDeactivatePush = async () => {
    setSubscribing(true);
    try {
      await unsubscribeFromPush();
      setPushSubscribed(false);
      setSettings(prev => ({ ...prev, reminder_enabled: false }));
    } catch (e) {
      console.error('Push deactivation failed:', e);
    }
    setSubscribing(false);
  };

  const handleTestWebPush = () => {
    const success = sendLocalNotification(
      'Test de Rappel Cash Save 📊',
      'C\'est l\'heure de votre bilan quotidien ! N\'oubliez pas de noter vos transactions et habitudes.'
    );
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } else {
      alert('Veuillez d\'abord activer les notifications.');
    }
  };

  const handleTestWhatsApp = () => {
    const fullNumber = countryCode + localNumber.replace(/\s+/g, '');
    if (!fullNumber || fullNumber.length < 8) {
      alert('Veuillez entrer un numéro WhatsApp valide.');
      return;
    }
    const url = triggerTestWhatsAppReminder(fullNumber);
    window.open(url, '_blank');
  };

  const handleSave = async () => {
    const fullNumber = localNumber.trim() ? (countryCode + localNumber.replace(/\s+/g, '')) : '';
    const updated: NotificationSettings = {
      ...settings,
      whatsapp_number: fullNumber,
    };

    setSettings(updated);
    saveNotificationSettings(updated);

    // Sync with Supabase profile if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          reminder_enabled: updated.reminder_enabled,
          reminder_time: updated.reminder_time,
          whatsapp_enabled: updated.whatsapp_enabled,
          whatsapp_number: updated.whatsapp_number,
        }).eq('id', user.id);
      }
    } catch (e) {}

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="modal-overlay z-50 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      <div
        className="modal-content max-w-lg p-6 space-y-6 overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{
                background: 'rgba(14, 159, 110, 0.12)',
                border: '1px solid rgba(14, 159, 110, 0.25)',
                color: '#0E9F6E',
              }}
            >
              <Bell size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Rappels &amp; Notifications
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Notifications push + relance WhatsApp automatique
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            style={{ background: 'var(--bg-card-hover)', color: 'var(--text-tertiary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: Web Push Notifications */}
        <div className="p-4 rounded-xl space-y-3 border" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={16} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Notifications Push
              </span>
            </div>
            {pushSubscribed && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0E9F6E] bg-[#0E9F6E]/10 px-2 py-1 rounded-full border border-[#0E9F6E]/25">
                <Zap size={11} /> ACTIF
              </div>
            )}
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Recevez une notification automatique chaque soir, même quand l&apos;application est fermée. Fonctionne sur téléphone et ordinateur.
          </p>

          {!pushSupported ? (
            <div className="text-xs p-3 rounded-lg" style={{ background: 'rgba(244,63,94,0.08)', color: '#F43F5E', border: '1px solid rgba(244,63,94,0.2)' }}>
              Votre navigateur ne supporte pas les notifications push. Utilisez Chrome, Firefox ou Safari récent.
            </div>
          ) : !pushSubscribed ? (
            <button
              type="button"
              onClick={handleActivatePush}
              disabled={subscribing}
              className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
              style={{
                background: '#0E9F6E',
                color: '#FFFFFF',
                opacity: subscribing ? 0.7 : 1,
              }}
            >
              {subscribing ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Activation en cours...
                </>
              ) : (
                <>
                  <Bell size={15} /> Activer les notifications push
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-[#0E9F6E] font-medium">
                <ShieldCheck size={14} /> Notifications push activées — vous serez notifié chaque soir
              </div>

              {/* Reminder Time */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Heure du rappel du soir :
                </label>
                <select
                  value={settings.reminder_time}
                  onChange={(e) => setSettings(prev => ({ ...prev, reminder_time: e.target.value }))}
                  className="input-field py-1 px-3 text-xs font-semibold w-28 text-center cursor-pointer"
                >
                  <option value="19:00">19h00</option>
                  <option value="20:00">20h00 (Recommandé)</option>
                  <option value="21:00">21h00</option>
                  <option value="22:00">22h00</option>
                </select>
              </div>

              {/* Test & Deactivate buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTestWebPush}
                  className="flex-1 btn-secondary py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Send size={13} /> {testSent ? 'Envoyée !' : 'Tester'}
                </button>
                <button
                  type="button"
                  onClick={handleDeactivatePush}
                  disabled={subscribing}
                  className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {subscribing ? <Loader2 size={13} className="animate-spin" /> : 'Désactiver'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: WhatsApp Automatique */}
        <div
          className="p-4 rounded-xl space-y-3.5 border relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(37,211,102,0.06), rgba(14,159,110,0.03))',
            borderColor: 'rgba(37,211,102,0.3)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-[#25D366]" />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Relance WhatsApp Automatique
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.whatsapp_enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]" />
            </label>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Recevez un message personnalisé sur WhatsApp avec votre streak, score et résumé financier si vous n&apos;avez pas encore enregistré votre journée.
          </p>

          {settings.whatsapp_enabled && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Numéro WhatsApp avec indicatif :
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="input-field py-2 text-xs cursor-pointer truncate"
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    value={localNumber}
                    onChange={(e) => setLocalNumber(e.target.value)}
                    placeholder="Ex: 0708091011"
                    className="input-field py-2 text-xs sm:col-span-2 font-medium"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestWhatsApp}
                className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all border shadow-sm"
                style={{
                  background: 'rgba(37,211,102,0.12)',
                  borderColor: 'rgba(37,211,102,0.3)',
                  color: '#25D366',
                }}
              >
                <MessageSquare size={14} /> Tester le rappel WhatsApp personnalisé
              </button>

              <p className="text-[10px] leading-relaxed px-1" style={{ color: 'var(--text-tertiary)' }}>
                💡 Le test ouvre WhatsApp avec un message pré-rempli basé sur vos données réelles. En production, les messages sont envoyés automatiquement chaque soir.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2.5 px-4 text-xs font-medium cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary py-2.5 px-6 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
            style={savedSuccess ? { background: '#0E9F6E' } : undefined}
          >
            {savedSuccess ? (
              <>
                <Check size={15} /> Préférences enregistrées
              </>
            ) : (
              'Enregistrer mes rappels'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
