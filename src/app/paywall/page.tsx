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
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg animate-fade-in-up space-y-6">
        {/* Badge Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
              border: '1px solid var(--color-warning-border)',
            }}
          >
            <Crown size={14} strokeWidth={1.5} /> Passer à Cash Save Premium
          </div>
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Débloquez 100% de votre potentiel
          </h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-tertiary)' }}>
            Votre période d&apos;essai de 42 jours est terminée. Vos données sont conservées en toute sécurité.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div
            className="flex items-baseline justify-between mb-6 pb-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              <span className="text-xs block font-medium" style={{ color: 'var(--text-tertiary)' }}>Abonnement Mensuel</span>
              <span className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>3 000 FCFA</span>
              <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}> / mois</span>
            </div>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
              style={{
                background: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                border: '1px solid var(--color-success-border)',
              }}
            >
              Sans engagement
            </span>
          </div>

          {/* Features */}
          <ul className="space-y-3 text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>
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
                <CheckCircle2 size={15} strokeWidth={2} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '1px' }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* Payment Providers */}
          <div
            className="rounded-xl p-3 mb-6"
            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
          >
            <p className="text-[11px] mb-2 font-medium flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Smartphone size={13} strokeWidth={1.5} style={{ color: 'var(--accent)' }} /> Moyens de paiement acceptés :
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {['Flooz', 'TMoney', 'Orange Money', 'MTN MoMo', 'Carte Bancaire (Visa/Mastercard)'].map((p) => (
                <span
                  key={p}
                  className="px-2 py-1 rounded-md"
                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div
              className="mb-4 text-xs rounded-lg p-3"
              style={{
                color: 'var(--color-danger)',
                background: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-border)',
              }}
            >
              {error}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="btn-primary w-full py-3.5 text-sm font-semibold"
            id="paywall-submit-btn"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                S&apos;abonner pour 3 000 FCFA <ArrowRight size={16} strokeWidth={2} />
              </>
            )}
          </button>

          <p className="text-center text-[10px] mt-3 flex items-center justify-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <Lock size={12} strokeWidth={1.5} /> Paiement sécurisé via Maketou Payment Gateway
          </p>
        </div>
      </div>
    </div>
  );
}
