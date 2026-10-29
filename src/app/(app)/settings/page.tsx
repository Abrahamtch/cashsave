'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, SupportedCurrency, SupportedLanguage } from '@/types';
import { getTrialDaysRemaining } from '@/lib/stats';
import { useRouter } from 'next/navigation';
import {
  Crown, LogOut, Check, MessageSquare, Send, Bug, Lightbulb, Star,
  HelpCircle, Globe, Coins, AlertCircle, RefreshCw, CheckCircle2, ChevronRight
} from 'lucide-react';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { clearUserDataOnLogout } from '@/lib/syncUser';
import { usePreferences } from '@/contexts/PreferencesContext';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { format } from 'date-fns';
import { fr, enUS, es, pt, de, arSA } from 'date-fns/locale';

type SupportCategory = 'bug' | 'suggestion' | 'feedback' | 'question';

const SUPPORT_CATEGORIES: { id: SupportCategory; label: string; icon: any }[] = [
  { id: 'bug', label: 'Signalement de bug', icon: Bug },
  { id: 'suggestion', label: 'Suggestion & Idée', icon: Lightbulb },
  { id: 'feedback', label: 'Avis & Témoignage', icon: Star },
  { id: 'question', label: 'Question générale', icon: HelpCircle },
];

const AVAILABLE_LANGUAGES: { code: SupportedLanguage; label: string; flag: string; nativeLabel: string }[] = [
  { code: 'fr', label: 'Français', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', nativeLabel: 'Português', flag: '🇵🇹' },
  { code: 'de', label: 'Deutsch', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', nativeLabel: 'العربية', flag: '🇸🇦' },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportCategory, setSupportCategory] = useState<SupportCategory>('bug');
  const [supportMessage, setSupportMessage] = useState('');
  const [currencySearch, setCurrencySearch] = useState('');
  const [selectedCurrencyPending, setSelectedCurrencyPending] = useState<SupportedCurrency | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const {
    language,
    currency,
    setLanguage,
    setCurrency,
    ratesLastUpdated,
    isRatesOffline,
    t
  } = usePreferences();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const isLive = isLiveSupabaseConfigured();

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (data) {
            setProfile(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    setProfile({
      id: 'demo-user',
      email: localUser.email || 'demo@cashsave.app',
      full_name: localUser.full_name || 'Utilisateur Cash Save',
      avatar_url: '',
      trial_start_date: localUser.trial_start_date || new Date().toISOString(),
      is_premium: localUser.is_premium || false,
      premium_expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    document.cookie = 'cashsave_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    clearUserDataOnLogout();
    router.push('/auth/login');
    router.refresh();
  };

  const handleLanguageChange = async (newLang: SupportedLanguage) => {
    if (newLang === language) return;
    setIsSavingLanguage(true);
    await setLanguage(newLang);
    setIsSavingLanguage(false);
    showToast(t('settings.language_changed'));
  };

  const initiateCurrencyChange = (newCurr: SupportedCurrency) => {
    if (newCurr === currency) return;
    setSelectedCurrencyPending(newCurr);
    setShowCurrencyModal(true);
  };

  const confirmCurrencyChange = async () => {
    if (!selectedCurrencyPending) return;
    setIsSavingCurrency(true);
    await setCurrency(selectedCurrencyPending);
    setIsSavingCurrency(false);
    setShowCurrencyModal(false);
    showToast(`${t('settings.currency_title')} : ${selectedCurrencyPending}`);
    setSelectedCurrencyPending(null);
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSendWhatsAppSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    const categoryLabel = SUPPORT_CATEGORIES.find(c => c.id === supportCategory)?.label || 'Support';
    const userName = profile?.full_name || 'Utilisateur Cash Save';
    const userEmail = profile?.email || 'Non renseigné';

    const text = `👋 *Bonjour l'équipe Support Cash Save !*

📌 *Type* : ${categoryLabel}
👤 *Nom* : ${userName}
📧 *Email* : ${userEmail}

💬 *Message* :
${supportMessage.trim()}

---
_Envoyé depuis l'application Cash Save_`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/22892639867?text=${encodedText}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // Locale date format
  const dateLocales = { fr, en: enUS, es, pt, de, ar: arSA };
  const currentLocale = dateLocales[language] || fr;

  const formattedRatesDate = ratesLastUpdated
    ? format(new Date(ratesLastUpdated), 'dd MMMM yyyy HH:mm', { locale: currentLocale })
    : '';

  // Filtrage des devises par recherche
  const filteredCurrencies = Object.values(SUPPORTED_CURRENCIES).filter((curr) => {
    const q = currencySearch.toLowerCase();
    const currName = curr.name[language] || curr.name.fr;
    return (
      curr.code.toLowerCase().includes(q) ||
      currName.toLowerCase().includes(q) ||
      curr.symbol.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-48 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 backdrop-blur-md shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 size={16} />
          {successToast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {t('settings.title')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Profile & Account */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center font-bold text-base shadow-sm" style={{ color: 'var(--text-inverse)' }}>
            {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              {profile?.full_name || 'Utilisateur Cash Save'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{profile?.email}</p>
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleLogout}
            className="btn-secondary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer font-medium"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' }}
          >
            <LogOut className="w-4 h-4" /> {t('settings.logout')}
          </button>
        </div>
      </div>

      {/* SECTION 1: LANGUE DE L'APPLICATION */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              {t('settings.language_title')}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {t('settings.language_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
          {AVAILABLE_LANGUAGES.map((langItem) => {
            const isSelected = language === langItem.code;
            return (
              <button
                key={langItem.code}
                type="button"
                onClick={() => handleLanguageChange(langItem.code)}
                disabled={isSavingLanguage}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)] shadow-sm scale-[1.01]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] bg-[var(--bg-input)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{langItem.flag}</span>
                  <div className="text-left">
                    <p className="font-semibold">{langItem.nativeLabel}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{langItem.label}</p>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-[var(--accent)] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: DEVISE PRÉFÉRÉE */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <Coins size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                {t('settings.currency_title')}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {t('settings.currency_desc')}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-xs font-bold text-[var(--accent)]">
            <span>{SUPPORTED_CURRENCIES[currency]?.flag}</span>
            <span>{currency}</span>
            <span className="text-[10px] opacity-75">({SUPPORTED_CURRENCIES[currency]?.symbol})</span>
          </div>
        </div>

        {/* Notice informative de non-altération */}
        <div className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border)' }}>
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('settings.currency_notice')}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              <span>
                {t('settings.rates_last_updated')} : <strong className="font-semibold text-[var(--text-secondary)]">{formattedRatesDate || 'En direct'}</strong>
              </span>
              {isRatesOffline && (
                <span className="text-amber-400 font-medium">
                  • {t('settings.rates_offline_warning')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Champ de recherche de devise */}
        <div>
          <input
            type="text"
            value={currencySearch}
            onChange={(e) => setCurrencySearch(e.target.value)}
            placeholder="Rechercher une devise (ex: EUR, USD, Franc CFA, Dollar...)"
            className="input-field w-full text-xs p-2.5 mb-2"
          />
        </div>

        {/* Grille des devises */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
          {filteredCurrencies.map((currItem) => {
            const isSelected = currency === currItem.code;
            const localizedName = currItem.name[language] || currItem.name.fr;
            return (
              <button
                key={currItem.code}
                type="button"
                onClick={() => initiateCurrencyChange(currItem.code)}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)] shadow-sm'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] bg-[var(--bg-input)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">{currItem.flag}</span>
                  <div className="text-left min-w-0">
                    <p className="font-bold truncate text-[13px]">
                      {currItem.code} <span className="font-normal text-[11px] opacity-75">({currItem.symbol})</span>
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {localizedName}
                    </p>
                  </div>
                </div>
                {isSelected ? (
                  <Check size={15} className="text-[var(--accent)] shrink-0 ml-2" />
                ) : (
                  <ChevronRight size={13} className="text-[var(--text-tertiary)] shrink-0 opacity-50 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subscription Card */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('settings.subscription_title')}
              </h3>
            </div>

            {profile?.is_premium ? (
              <div className="mt-2 space-y-1">
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: '#D6B36A', background: 'rgba(214,179,106,0.1)', border: '1px solid rgba(214,179,106,0.3)' }}
                >
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  {profile?.trial_7d_used && profile?.premium_expires_at ? t('settings.trial_active') : t('settings.premium_active')}
                </span>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Accès illimité à toutes les fonctionnalités de l&apos;application.
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
                >
                  {t('settings.free_tier')}
                </span>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Limité à 3 transactions/jour, 10 tâches, 5 objectifs &amp; 5 habitudes.
                </p>
              </div>
            )}
          </div>

          {!profile?.is_premium && (
            <button
              onClick={() => router.push('/paywall')}
              className="btn-primary text-xs py-2.5 px-4 shrink-0 cursor-pointer shadow-md"
              id="upgrade-btn"
            >
              <Crown size={14} className="text-amber-300" /> {t('settings.upgrade_to_premium')}
            </button>
          )}
        </div>
      </div>

      {/* Section Contacter le support sur WhatsApp */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              {t('settings.support_title')}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {t('settings.support_desc')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSendWhatsAppSupport} className="space-y-4 pt-2">
          {/* Sélection du Type de message */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('settings.support_type')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUPPORT_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isSelected = supportCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSupportCategory(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-subtle)] border-[var(--accent)] text-[var(--accent)] shadow-sm scale-[1.02]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-border)]'
                    }`}
                  >
                    <Icon size={14} className={isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saisie du Message */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t('settings.support_message')}
            </label>
            <textarea
              rows={4}
              required
              value={supportMessage}
              onChange={e => setSupportMessage(e.target.value)}
              placeholder={t('settings.support_placeholder')}
              className="input-field w-full text-xs p-3 resize-none leading-relaxed"
            />
          </div>

          {/* Bouton d'envoi WhatsApp */}
          <button
            type="submit"
            disabled={!supportMessage.trim()}
            className="btn-primary w-full py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: supportMessage.trim() ? 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' : undefined,
              color: '#FFFFFF',
              border: 'none',
            }}
          >
            <Send size={15} />
            {t('settings.support_send')}
          </button>
        </form>
      </div>

      {/* MODAL DE CONFIRMATION DU CHANGEMENT DE DEVISE */}
      {showCurrencyModal && selectedCurrencyPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl border" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-xl shrink-0">
                {SUPPORTED_CURRENCIES[selectedCurrencyPending]?.flag}
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {t('settings.currency_confirm_title')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {SUPPORTED_CURRENCIES[selectedCurrencyPending]?.name[language]} ({selectedCurrencyPending})
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('settings.currency_confirm_msg', {
                currency: `${SUPPORTED_CURRENCIES[selectedCurrencyPending]?.name[language]} (${selectedCurrencyPending})`,
              })}
            </p>

            <div className="p-3 rounded-xl border text-[11px] flex items-center gap-2" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
              <Coins size={14} className="text-[var(--accent)] shrink-0" />
              <span>
                Devise actuelle : <strong className="font-semibold text-[var(--text-primary)]">{currency}</strong> → Nouvelle devise : <strong className="font-semibold text-[var(--accent)]">{selectedCurrencyPending}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCurrencyModal(false);
                  setSelectedCurrencyPending(null);
                }}
                disabled={isSavingCurrency}
                className="btn-secondary flex-1 py-2.5 text-xs font-semibold cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmCurrencyChange}
                disabled={isSavingCurrency}
                className="btn-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isSavingCurrency ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    {t('common.confirm')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
