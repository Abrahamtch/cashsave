'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, ScoringSettings, DEFAULT_SCORING_SETTINGS, HABIT_LABELS, NUMERIC_HABIT_LABELS } from '@/types';
import { getTrialDaysRemaining } from '@/lib/stats';
import { useRouter } from 'next/navigation';
import { User, Crown, Sliders, Moon, Sun, LogOut, Check, Save, Sparkles, RefreshCw } from 'lucide-react';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scoringSettings, setScoringSettings] = useState<ScoringSettings>(DEFAULT_SCORING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
            if (data.scoring_settings) {
              setScoringSettings({ ...DEFAULT_SCORING_SETTINGS, ...data.scoring_settings });
            }
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
      scoring_settings: localUser.scoring_settings || DEFAULT_SCORING_SETTINGS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (localUser.scoring_settings) {
      setScoringSettings({ ...DEFAULT_SCORING_SETTINGS, ...localUser.scoring_settings });
    }
    setLoading(false);
  }

  const handleScoreChange = (key: keyof ScoringSettings, val: number) => {
    setScoringSettings(prev => ({ ...prev, [key]: val }));
    setSavedSuccess(false);
  };

  const saveAlgorithmSettings = async () => {
    setSavingSettings(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ scoring_settings: scoringSettings }).eq('id', user.id);
      }
    } catch (e) {}

    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    localStorage.setItem('cashsave_user', JSON.stringify({ ...localUser, scoring_settings: scoringSettings }));

    setSavingSettings(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const resetToDefaultScores = () => {
    setScoringSettings(DEFAULT_SCORING_SETTINGS);
    setSavedSuccess(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    document.cookie = 'cashsave_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('cashsave_user');
    router.push('/auth/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-64 skeleton" />
      </div>
    );
  }

  const trialDays = profile ? getTrialDaysRemaining(profile.trial_start_date) : 0;

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Gestion de votre compte & configuration</p>
      </div>

      {/* Profile & Account */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg">
            {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-base">{profile?.full_name || 'Utilisateur Cash Save'}</h3>
            <p className="text-xs text-gray-400">{profile?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn-secondary w-full py-2 text-rose-400 hover:text-rose-300 border-rose-500/20 hover:border-rose-500/30 text-xs"
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>

      {/* Subscription Card */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-sm">Statut de l&apos;abonnement</h3>
            </div>

            {profile?.is_premium ? (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" /> Compte Premium Actif
                </span>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-300">
                  Période d&apos;essai : <span className="font-bold text-amber-400">{trialDays} jours restants</span> (sur 42)
                </p>
                <div className="progress-bar max-w-xs mt-2">
                  <div
                    className="progress-bar-fill bg-amber-500"
                    style={{ width: `${Math.min(100, Math.max(0, (trialDays / 42) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {!profile?.is_premium && (
            <button
              onClick={() => router.push('/paywall')}
              className="btn-primary text-xs py-2 px-3 shrink-0"
              id="upgrade-btn"
            >
              Passer Premium
            </button>
          )}
        </div>
      </div>

      {/* App Appearance / Theme Toggle */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Sun className="w-5 h-5 hidden dark:block text-amber-400" />
            <Moon className="w-5 h-5 block dark:hidden text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Mode Sombre / Mode Clair</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Basculez entre le thème sombre d&apos;action et le thème clair</p>
          </div>
        </div>

        <ThemeToggle />
      </div>

      {/* Scoring Algorithm Settings */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-sm">Configuration de l&apos;Algorithme</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ajustez la valeur en points attribuée à chaque action</p>
            </div>
          </div>

          <button
            onClick={resetToDefaultScores}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            title="Réinitialiser les valeurs par défaut"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Par défaut
          </button>
        </div>

        {/* Boolean Habits Coefficients */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Habitudes (Oui/Non)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(HABIT_LABELS) as Array<keyof typeof HABIT_LABELS>).map((key) => (
              <div key={key} className="flex items-center justify-between bg-gray-100 dark:bg-white/5 p-2.5 rounded-xl">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{HABIT_LABELS[key]}</span>
                <input
                  type="number"
                  step="0.5"
                  value={scoringSettings[key] ?? 3}
                  onChange={(e) => handleScoreChange(key as keyof ScoringSettings, parseFloat(e.target.value) || 0)}
                  className="w-16 text-right text-xs bg-white dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Numeric Habits Coefficients */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Business & Apprentissage (Points / Unité)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(NUMERIC_HABIT_LABELS) as Array<keyof typeof NUMERIC_HABIT_LABELS>).map((key) => (
              <div key={key} className="flex items-center justify-between bg-gray-100 dark:bg-white/5 p-2.5 rounded-xl">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{NUMERIC_HABIT_LABELS[key]}</span>
                <input
                  type="number"
                  step="0.1"
                  value={scoringSettings[key] ?? 1}
                  onChange={(e) => handleScoreChange(key as keyof ScoringSettings, parseFloat(e.target.value) || 0)}
                  className="w-16 text-right text-xs bg-white dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            onClick={saveAlgorithmSettings}
            disabled={savingSettings}
            className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" /> Paramètres enregistrés !
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {savingSettings ? 'Enregistrement...' : 'Sauvegarder l\'algorithme'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
