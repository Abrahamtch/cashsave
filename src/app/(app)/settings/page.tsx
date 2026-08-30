'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, ScoringSettings, DEFAULT_SCORING_SETTINGS, HABIT_LABELS, NUMERIC_HABIT_LABELS } from '@/types';
import { getTrialDaysRemaining } from '@/lib/stats';
import { useRouter } from 'next/navigation';
import { User, Crown, Sliders, LogOut, Check, Save, Sparkles, RefreshCw } from 'lucide-react';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Paramètres</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Gestion de votre compte &amp; configuration</p>
      </div>

      {/* Profile & Account */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center font-bold text-base" style={{ color: 'var(--text-inverse)' }}>
            {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{profile?.full_name || 'Utilisateur Cash Save'}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{profile?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn-secondary w-full py-2 text-xs"
          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' }}
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>

      {/* Subscription Card */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Statut de l&apos;abonnement</h3>
            </div>

            {profile?.is_premium ? (
              <div className="mt-2">
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: 'var(--color-success)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}
                >
                  <Check className="w-3.5 h-3.5" /> Compte Premium Actif
                </span>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Période d&apos;essai :{' '}
                  <span className="font-semibold" style={{ color: 'var(--color-warning)' }}>{trialDays} jours restants</span>
                  {' '}(sur 42)
                </p>
                <div className="progress-bar max-w-xs">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, (trialDays / 42) * 100))}%`, background: 'var(--color-warning)' }}
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

      {/* Scoring Algorithm Settings */}
      <div className="glass-card p-5 space-y-4">
        <div
          className="flex items-center justify-between pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Algorithme de score</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Points attribués à chaque action</p>
            </div>
          </div>

          <button
            onClick={resetToDefaultScores}
            className="text-xs flex items-center gap-1.5 transition-colors duration-150"
            style={{ color: 'var(--text-tertiary)' }}
            title="Réinitialiser les valeurs par défaut"
          >
            <RefreshCw className="w-3 h-3" /> Défaut
          </button>
        </div>

        {/* Boolean Habits Coefficients */}
        <div className="space-y-3">
          <h4
            className="text-[10px] font-semibold uppercase"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.09em' }}
          >
            Habitudes (Oui / Non)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(HABIT_LABELS) as Array<keyof typeof HABIT_LABELS>).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 rounded-xl"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {HABIT_LABELS[key]}
                </span>
                <input
                  type="number"
                  step="0.5"
                  value={scoringSettings[key] ?? 3}
                  onChange={(e) => handleScoreChange(key as keyof ScoringSettings, parseFloat(e.target.value) || 0)}
                  className="input-field text-right py-1"
                  style={{ width: '60px', fontSize: '12px' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Numeric Habits Coefficients */}
        <div className="space-y-3">
          <h4
            className="text-[10px] font-semibold uppercase"
            style={{ color: 'var(--text-tertiary)', letterSpacing: '0.09em' }}
          >
            Business &amp; Apprentissage (pts / unité)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(NUMERIC_HABIT_LABELS) as Array<keyof typeof NUMERIC_HABIT_LABELS>).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 rounded-xl"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {NUMERIC_HABIT_LABELS[key]}
                </span>
                <input
                  type="number"
                  step="0.1"
                  value={scoringSettings[key] ?? 1}
                  onChange={(e) => handleScoreChange(key as keyof ScoringSettings, parseFloat(e.target.value) || 0)}
                  className="input-field text-right py-1"
                  style={{ width: '60px', fontSize: '12px' }}
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
