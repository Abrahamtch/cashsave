'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, ShieldCheck, Sparkles, CreditCard, Smartphone, ArrowRight, Lock, Check, X, Tag } from 'lucide-react';
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
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="w-full max-w-4xl animate-fade-in-up space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'linear-gradient(135deg, rgba(214,179,106,0.15), rgba(14,159,110,0.15))',
              color: '#D6B36A',
              border: '1px solid rgba(214,179,106,0.3)',
            }}
          >
            <Crown size={14} strokeWidth={1.5} /> Choisissez le Forfait Cash Save
          </div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Boostez vos finances et vos habitudes
          </h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--text-tertiary)' }}>
            Conservez le contrôle total sur votre argent, vos objectifs et votre productivité.
          </p>
        </div>

        {/* Special Offer Banner */}
        <div
          className="p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
          style={{
            background: 'linear-gradient(135deg, rgba(214,179,106,0.15) 0%, rgba(14,159,110,0.1) 100%)',
            border: '1px solid rgba(214,179,106,0.4)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(214,179,106,0.2)', color: '#D6B36A' }}>
              <Tag size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#D6B36A' }}>Offre Spéciale Nouveaux Membres</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Seulement <span className="text-emerald-500 font-extrabold text-base">1 000 FCFA / mois</span> pendant les 3 premiers mois !
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
            Économisez 66%
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Free Plan */}
          <div className="glass-card p-6 flex flex-col justify-between space-y-6" style={{ opacity: 0.9 }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Forfait Gratuit</h3>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pour débuter à votre rythme</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>
                  Gratuit à vie
                </span>
              </div>

              <div className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                0 FCFA <span className="text-xs font-normal text-[var(--text-tertiary)]">/ mois</span>
              </div>

              <ul className="space-y-3 text-xs pt-2" style={{ color: 'var(--text-secondary)' }}>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span><strong>3 transactions par jour</strong> (2 dépenses + 1 revenu)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span><strong>10 tâches actives max</strong> (To-Do List)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span><strong>5 objectifs max</strong> (Progression sur le 1er uniquement)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span><strong>5 habitudes max</strong> (personnalisées incluses)</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-50">
                  <X size={14} className="text-rose-400 shrink-0" />
                  <span>Graphiques d&apos;analyse floutés</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-50">
                  <X size={14} className="text-rose-400 shrink-0" />
                  <span>Pas de pièces jointes/reçus ni avis satisfaction</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-50">
                  <X size={14} className="text-rose-400 shrink-0" />
                  <span>Pas de glisser-déposer Kanban</span>
                </li>
              </ul>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-3 rounded-xl text-xs font-semibold text-center transition-colors cursor-pointer"
              style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
            >
              Continuer avec le forfait gratuit
            </Link>
          </div>

          {/* Premium Plan */}
          <div
            className="glass-card p-6 flex flex-col justify-between space-y-6 relative overflow-hidden"
            style={{
              border: '2px solid #D6B36A',
              boxShadow: '0 8px 32px rgba(214,179,106,0.15)',
            }}
          >
            {/* Recommended Badge */}
            <div
              className="absolute -top-px right-6 text-[10px] font-bold px-3 py-1 rounded-b-lg shadow-sm"
              style={{ background: 'linear-gradient(135deg, #D6B36A, #B8934A)', color: '#000' }}
            >
              RECOMMANDÉ
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    Forfait Premium <Crown size={16} className="text-amber-400" />
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Liberté totale & statistiques illimitées</p>
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold" style={{ color: '#D6B36A' }}>1 000 FCFA</span>
                  <span className="text-xs line-through" style={{ color: 'var(--text-tertiary)' }}>3 000 FCFA</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>/ mois (3 1er mois)</span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Puis 3 000 FCFA / mois · Sans engagement</p>
              </div>

              <ul className="space-y-3 text-xs pt-2" style={{ color: 'var(--text-primary)' }}>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>Transactions illimitées</strong> à toute heure</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>Tâches & Kanban illimités</strong> avec glisser-déposer</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>Objectifs illimités</strong> (financiers + barres de progression)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>Habitudes numériques & personnalisées illimitées</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>Graphiques d&apos;analyse débloqués</strong> & stats illimitées</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>Scans de reçu & avis satisfaction</strong> inclus</span>
                </li>
              </ul>
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
                className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #0E9F6E, #087A56)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(14,159,110,0.35)',
                }}
                id="paywall-submit-btn"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Profiter de l&apos;offre 1 000 FCFA <ArrowRight size={16} strokeWidth={2} />
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-[10px] flex items-center justify-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                  <Lock size={11} /> Paiement sécurisé via Maketou (Flooz, TMoney, MoMo, Carte)
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

