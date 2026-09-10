'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, ArrowRight, Lock, Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

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
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="w-full max-w-3xl animate-fade-in-up space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Investissez dans votre discipline
          </h1>
          <p
            className="text-sm max-w-lg mx-auto leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Choisissez la formule adaptée à vos ambitions financières et de productivité.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Free Plan */}
          <div
            className="p-7 rounded-2xl flex flex-col justify-between space-y-8"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Formule Découverte
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    Accès essentiel
                  </p>
                </div>
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md"
                  style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                >
                  Gratuit
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    0 FCFA
                  </span>
                  <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                    / mois
                  </span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Sans aucune limite de durée
                </p>
              </div>

              <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p className="font-medium text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  Inclus dans la formule :
                </p>
                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span>3 transactions par jour (2 dépenses, 1 revenu)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span>10 tâches actives (To-Do List)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span>5 objectifs actifs (suivi 1er objectif)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span>5 habitudes de vie &amp; travail</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span>Historique d&apos;analyse sur 7 jours</span>
                  </li>
                </ul>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-3 rounded-xl text-xs font-medium text-center transition-all duration-200 cursor-pointer"
              style={{
                background: 'var(--bg-card-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              Continuer en gratuit
            </Link>
          </div>

          {/* Premium Plan */}
          <div
            className="p-7 rounded-2xl flex flex-col justify-between space-y-8 relative overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid rgba(214,179,106,0.35)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            }}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    Formule Premium
                    <Crown size={16} style={{ color: '#D6B36A' }} />
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    Maîtrise totale &amp; illimitée
                  </p>
                </div>
                <span
                  className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md"
                  style={{
                    background: 'rgba(214,179,106,0.12)',
                    color: '#D6B36A',
                    border: '1px solid rgba(214,179,106,0.25)',
                  }}
                >
                  Recommandé
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight" style={{ color: '#D6B36A' }}>
                    1 000 FCFA
                  </span>
                  <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                    / mois
                  </span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Tarif spécial les 3 premiers mois (puis 3 000 FCFA / mois)
                </p>
              </div>

              <div className="space-y-3 text-xs" style={{ color: 'var(--text-primary)' }}>
                <p className="font-medium text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  Tout le potentiel Cash Save débloqué :
                </p>
                <ul className="space-y-2.5">
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span><strong>Transactions illimitées</strong> &amp; calcul de trésorerie net</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span><strong>Kanban illimité</strong> avec glisser-déposer intuitif</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span><strong>Objectifs financiers</strong> avec allocation de budget</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span><strong>Habitudes numériques</strong> (min. d&apos;apprentissage, appels, etc.)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span><strong>Graphiques d&apos;analyse débloqués</strong> sans restriction</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-[#0E9F6E] shrink-0" />
                    <span><strong>Scans de reçu photo</strong> &amp; avis de satisfaction</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              {error && (
                <div
                  className="text-xs rounded-lg p-3"
                  style={{
                    color: 'var(--color-danger)',
                    background: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger-border)',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 cursor-pointer shadow-sm"
                style={{
                  background: '#0E9F6E',
                  color: '#FFFFFF',
                }}
                id="paywall-submit-btn"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Passer à la formule Premium (1 000 FCFA) <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center space-y-1.5 pt-2">
          <p className="text-[11px] flex items-center justify-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
            <Lock size={12} className="text-[#0E9F6E]" /> Paiement sécurisé via Maketou (Flooz, TMoney, MoMo, Carte bancaire)
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            Abonnement sans engagement · Annulation simple à tout moment
          </p>
        </div>

      </div>
    </div>
  );
}


