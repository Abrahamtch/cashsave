'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { getTrialDaysRemaining } from '@/lib/stats';
import { useRouter } from 'next/navigation';
import { Crown, LogOut, Check } from 'lucide-react';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
    localStorage.removeItem('cashsave_user');
    router.push('/auth/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="h-32 skeleton" />
        <div className="h-32 skeleton" />
      </div>
    );
  }

  const trialDays = profile ? getTrialDaysRemaining(profile.trial_start_date) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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

        <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleLogout}
            className="btn-secondary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer font-medium"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' }}
          >
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
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
              className="btn-primary text-xs py-2 px-3 shrink-0 cursor-pointer"
              id="upgrade-btn"
            >
              Passer Premium
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
