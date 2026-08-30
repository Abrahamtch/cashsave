'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, ArrowRight, Target } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [dailyGoal, setDailyGoal] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          full_name: fullName || 'Utilisateur',
        }).eq('id', user.id);
      }
    } catch (e) {
      // Ignore fallback
    }

    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    localStorage.setItem('cashsave_user', JSON.stringify({
      ...localUser,
      full_name: fullName || localUser.full_name || 'Utilisateur Cash Save',
      daily_goal: dailyGoal,
    }));

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 800);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="glass-card p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Bienvenue sur Cash Save
                </h2>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Transformez vos habitudes quotidiennes et reprenez le contrôle de vos finances.
                </p>
              </div>

              <div className="text-left">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Comment souhaitez-vous être appelé ?
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Votre prénom ou nom"
                  className="input-field"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                className="btn-primary w-full py-3"
              >
                Continuer <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Fixez votre objectif
                </h2>
                <p className="text-sm mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Quel score quotidien visez-vous pour maintenir votre discipline ?
                </p>
              </div>

              <div
                className="p-4 space-y-3 rounded-xl"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
              >
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span style={{ color: 'var(--text-secondary)' }}>Score quotidien cible</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{dailyGoal} pts</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Un score supérieur à 50 vous permettra de maintenir vos séries actives.
                </p>
              </div>

              <button
                onClick={handleFinish}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Initialisation...' : 'Démarrer l\'aventure'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
