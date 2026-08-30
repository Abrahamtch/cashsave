'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Target, Award, ArrowRight } from 'lucide-react';
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
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 gradient-mesh">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="glass-card p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Bienvenue sur Cash Save ! 🚀</h2>
              <p className="text-sm text-gray-400">
                Transformez vos habitudes quotidiennes et reprenez le contrôle total de vos finances et de votre productivité.
              </p>

              <div>
                <label className="block text-xs text-left font-medium text-gray-400 mb-1">Comment souhaitez-vous être appelé ?</label>
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
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold">Fixez votre premier objectif</h2>
              <p className="text-sm text-gray-400">
                Quel score quotidien visez-vous pour rester au sommet de vos performances ?
              </p>

              <div className="glass-card p-4 space-y-3 bg-white/5">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>Score quotidien cible</span>
                  <span className="text-indigo-400 text-lg font-bold">{dailyGoal} pts</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <p className="text-[11px] text-gray-500">
                  Un score supérieur à 50 vous permettra de maintenir des streaks impressionnants !
                </p>
              </div>

              <button
                onClick={handleFinish}
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Initialisation...' : 'Démarrer mon aventure Cash Save ⚡'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
