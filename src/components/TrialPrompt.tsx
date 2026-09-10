'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Sparkles, X, Timer, CheckCircle2 } from 'lucide-react';
import { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';

interface TrialPromptProps {
  profile: Profile;
  onDismiss: () => void;
  onActivate: () => void;
}

export default function TrialPrompt({ profile, onDismiss, onActivate }: TrialPromptProps) {
  const [activating, setActivating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleActivate = async () => {
    setActivating(true);
    try {
      const trialStart = new Date().toISOString();
      
      // Update locally
      const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
      localUser.trial_7d_used = true;
      localUser.trial_7d_start = trialStart;
      localUser.is_premium = true;
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      localUser.premium_expires_at = trialEnd.toISOString();
      localUser.last_trial_prompt_day = profile.active_days_count || 0;
      localStorage.setItem('cashsave_user', JSON.stringify(localUser));

      // Update Supabase
      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').update({
              trial_7d_used: true,
              trial_7d_start: trialStart,
              is_premium: true,
              premium_expires_at: trialEnd.toISOString(),
              last_trial_prompt_day: profile.active_days_count || 0,
            }).eq('id', user.id);
          }
        } catch (e) {}
      }

      onActivate();
    } catch (e) {
      setActivating(false);
    }
  };

  const handleDismiss = async () => {
    // Record that prompt was shown at this day count
    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    localUser.last_trial_prompt_day = profile.active_days_count || 0;
    localStorage.setItem('cashsave_user', JSON.stringify(localUser));

    if (isLiveSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({
            last_trial_prompt_day: profile.active_days_count || 0,
          }).eq('id', user.id);
        }
      } catch (e) {}
    }

    onDismiss();
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleDismiss}
    >
      <div
        className="modal-content p-6 max-w-sm mx-4 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Decorative gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(214,179,106,0.06) 0%, rgba(14,159,110,0.04) 50%, transparent 100%)',
          }}
        />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer z-10"
          style={{ background: 'var(--bg-card-hover)', color: 'var(--text-tertiary)' }}
        >
          <X size={13} />
        </button>

        <div className="relative z-10 space-y-5">
          {/* Icon */}
          <div className="flex justify-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(214,179,106,0.2), rgba(14,159,110,0.15))',
                border: '1px solid rgba(214,179,106,0.3)',
              }}
            >
              <Crown size={24} strokeWidth={1.5} style={{ color: '#D6B36A' }} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h3
              className="text-lg font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              Essayez Premium gratuitement
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Débloquez toutes les fonctionnalités pendant <strong style={{ color: 'var(--text-secondary)' }}>7 jours</strong> — sans engagement ni paiement.
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {[
              'Transactions illimitées',
              'Graphiques détaillés & analyses',
              'Objectifs financiers avec barre de progression',
              'Habitudes numériques avancées',
              'Glisser-déposer Kanban & justificatifs',
            ].map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2.5">
                <CheckCircle2 size={14} strokeWidth={2} style={{ color: '#0E9F6E', flexShrink: 0 }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <button
            onClick={handleActivate}
            disabled={activating}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #0E9F6E, #087A56)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(14,159,110,0.3)',
            }}
          >
            {activating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles size={15} />
                Activer mon essai gratuit de 7 jours
              </>
            )}
          </button>

          {/* Skip */}
          <button
            onClick={handleDismiss}
            className="w-full text-center text-[11px] font-medium py-1 cursor-pointer"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Non merci, peut-être plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
