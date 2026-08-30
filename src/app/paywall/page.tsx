'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, ShieldCheck, Sparkles, CreditCard, Smartphone, ArrowRight, Lock } from 'lucide-react';

export default function PaywallPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'initiation du paiement.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 gradient-mesh">
      <div className="w-full max-w-lg animate-fade-in-up space-y-6">
        {/* Badge Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Crown className="w-4 h-4" /> Passer à Cash Save Premium
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-300 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Débloquez 100% de votre potentiel
          </h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Votre période d&apos;essai de 42 jours est terminée. Vos données sont conservées en toute sécurité.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="glass-card p-6 border-indigo-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-baseline justify-between mb-6 pb-4 border-b border-white/10">
            <div>
              <span className="text-xs text-gray-400 block font-medium">Abonnement Mensuel</span>
              <span className="text-3xl font-black text-white">3 000 FCFA</span>
              <span className="text-xs text-gray-400 font-normal"> / mois</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              Sans engagement
            </span>
          </div>

          {/* Features */}
          <ul className="space-y-3 text-xs text-gray-300 mb-6">
            {[
              'Suivi quotidien des habitudes & algorithme de scoring',
              'Gestion de trésorerie & calcul du bénéfice net',
              'Graphiques d\'analyse visuels (Recharts)',
              'Statistiques gamifiées (Streaks, Records & Moyennes)',
              'To-Do List Kanban & Gestion d\'objectifs',
              'Personnalisation complète des coefficients de scoring',
              'Accès mobile PWA offline & sauvegardes cloud sécurisées',
            ].map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* Payment Providers */}
          <div className="bg-white/5 rounded-xl p-3 mb-6">
            <p className="text-[11px] text-gray-400 mb-2 font-medium flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Moyens de paiement acceptés :
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-gray-300">
              <span className="bg-white/10 px-2 py-1 rounded">Flooz</span>
              <span className="bg-white/10 px-2 py-1 rounded">TMoney</span>
              <span className="bg-white/10 px-2 py-1 rounded">Orange Money</span>
              <span className="bg-white/10 px-2 py-1 rounded">MTN MoMo</span>
              <span className="bg-white/10 px-2 py-1 rounded">Carte Bancaire (Visa/Mastercard)</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-rose-400 text-xs bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
              {error}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="btn-primary w-full py-3 text-base font-bold shadow-lg shadow-indigo-500/25"
            id="paywall-submit-btn"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                S&apos;abonner pour 3 000 FCFA <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-gray-500 mt-3 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-gray-500" /> Paiement sécurisé via Maketou Payment Gateway
          </p>
        </div>
      </div>
    </div>
  );
}
