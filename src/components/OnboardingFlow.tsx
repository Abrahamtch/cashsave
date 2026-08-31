'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  InitialBalanceSource,
  RoutineStatus,
  OnboardingStatus,
  HABIT_LABELS,
  NUMERIC_HABIT_LABELS,
} from '@/types';
import { formatCFA } from '@/lib/stats';
import { createClient } from '@/lib/supabase/client';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import {
  Wallet,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  Sliders,
  Award,
  Lock,
} from 'lucide-react';

export const ONBOARDING_ROUTINE_TIP =
  'La régularité des comportements structurés est le véritable moteur de Cash Save. Même avec de petites actions quotidiennes, la constance produit des résultats remarquables sur ta trésorerie et ton auto-discipline.';

export const INITIAL_BALANCE_SOURCES: { type: InitialBalanceSource; label: string }[] = [
  { type: 'tmoney', label: 'T-Money' },
  { type: 'flooz', label: 'Flooz' },
  { type: 'banque', label: 'Compte bancaire' },
  { type: 'especes', label: 'Espèces' },
  { type: 'portefeuille_en_ligne', label: 'Portefeuille en ligne' },
  { type: 'autre', label: 'Autre' },
];

export const DEFAULT_ONBOARDING_HABITS = [
  'prayer',
  'reading',
  'sport',
  'deep_work',
  'content_published',
];

export const HABIT_AXES = [
  {
    key: 'esprit',
    label: 'Esprit & Foi',
    habits: ['bible', 'prayer', 'meditation', 'reading', 'documentary'],
  },
  {
    key: 'sante',
    label: 'Santé & Énergie',
    habits: ['sport'],
  },
  {
    key: 'travail',
    label: 'Focus & Travail',
    habits: ['light_work', 'deep_work', 'after_work'],
  },
  {
    key: 'business',
    label: 'Business & Growth',
    habits: [
      'prospects_contacted',
      'calls_made',
      'content_published',
      'client_projects',
      'learning_minutes',
    ],
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
  isReconfiguring?: boolean;
}

export default function OnboardingFlow({
  onComplete,
  onSkip,
  isReconfiguring = false,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Step 1 State: Initial Balances
  const [selectedSources, setSelectedSources] = useState<InitialBalanceSource[]>([]);
  const [sourceAmounts, setSourceAmounts] = useState<Record<string, string>>({});
  const [customSourceLabel, setCustomSourceLabel] = useState('');

  // Step 2 State: Routine
  const [routineStatus, setRoutineStatus] = useState<RoutineStatus | null>(null);

  // Step 3 State: Habit selection
  const [selectedHabits, setSelectedHabits] = useState<string[]>(DEFAULT_ONBOARDING_HABITS);
  const [expandedAxes, setExpandedAxes] = useState<Record<string, boolean>>({
    esprit: true,
    sante: true,
    travail: true,
    business: true,
  });

  // Step 4 Accordion
  const [showHabitsDetail, setShowHabitsDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  // Load existing draft or pre-fill from localStorage / profile
  useEffect(() => {
    try {
      const draft = localStorage.getItem('onboarding_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.selectedSources) setSelectedSources(parsed.selectedSources);
        if (parsed.sourceAmounts) setSourceAmounts(parsed.sourceAmounts);
        if (parsed.customSourceLabel) setCustomSourceLabel(parsed.customSourceLabel);
        if (parsed.routineStatus) setRoutineStatus(parsed.routineStatus);
        if (parsed.selectedHabits) setSelectedHabits(parsed.selectedHabits);
      } else {
        const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
        if (localUser.routine_status) setRoutineStatus(localUser.routine_status);
        const prefs = JSON.parse(localStorage.getItem('cashsave_habit_preferences') || '[]');
        if (Array.isArray(prefs) && prefs.length > 0) {
          const activeKeys = prefs.filter((p: any) => p.is_active).map((p: any) => p.habit_key);
          if (activeKeys.length > 0) setSelectedHabits(activeKeys);
        }
      }
    } catch (e) {}
  }, []);

  // Auto-save draft on step/input changes
  useEffect(() => {
    try {
      const draft = {
        selectedSources,
        sourceAmounts,
        customSourceLabel,
        routineStatus,
        selectedHabits,
        step,
      };
      localStorage.setItem('onboarding_draft', JSON.stringify(draft));
    } catch (e) {}
  }, [selectedSources, sourceAmounts, customSourceLabel, routineStatus, selectedHabits, step]);

  // Compute live total starting balance
  const totalStartingBalance = useMemo(() => {
    return selectedSources.reduce((sum, src) => {
      const val = parseFloat(sourceAmounts[src] || '0');
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [selectedSources, sourceAmounts]);

  const toggleSource = (src: InitialBalanceSource) => {
    if (selectedSources.includes(src)) {
      setSelectedSources(prev => prev.filter(s => s !== src));
    } else {
      setSelectedSources(prev => [...prev, src]);
    }
  };

  const handleAmountChange = (src: InitialBalanceSource, rawVal: string) => {
    const cleanDigits = rawVal.replace(/\D/g, '');
    setSourceAmounts(prev => ({ ...prev, [src]: cleanDigits }));
  };

  const toggleHabit = (habitKey: string) => {
    if (selectedHabits.includes(habitKey)) {
      setSelectedHabits(prev => prev.filter(h => h !== habitKey));
    } else {
      setSelectedHabits(prev => [...prev, habitKey]);
    }
  };

  const toggleAxisAccordion = (axisKey: string) => {
    setExpandedAxes(prev => ({ ...prev, [axisKey]: !prev[axisKey] }));
  };

  // Final Persistence (Offline-First)
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const finalStatus: OnboardingStatus = 'completed';

    // 1. Balances payload
    const initialBalancesList = selectedSources.map(src => ({
      id: `init-${src}-${Date.now()}`,
      user_id: 'demo-user',
      source_type: src,
      source_label: src === 'autre' ? customSourceLabel : '',
      amount: parseFloat(sourceAmounts[src] || '0') || 0,
      created_at: new Date().toISOString(),
    }));

    // 2. Habit Preferences payload (All 14 habits)
    const allHabitKeys = [
      ...HABIT_AXES[0].habits,
      ...HABIT_AXES[1].habits,
      ...HABIT_AXES[2].habits,
      ...HABIT_AXES[3].habits,
    ];

    const habitPreferencesList = allHabitKeys.map(key => ({
      id: `pref-${key}`,
      user_id: 'demo-user',
      habit_key: key,
      is_active: selectedHabits.includes(key),
      created_at: new Date().toISOString(),
    }));

    // LocalStorage Updates (0ms latency)
    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    const updatedUser = {
      ...localUser,
      onboarding_status: finalStatus,
      routine_status: routineStatus || 'none',
      initial_balance_total: totalStartingBalance,
    };
    localStorage.setItem('cashsave_user', JSON.stringify(updatedUser));
    localStorage.setItem('cashsave_initial_balances', JSON.stringify(initialBalancesList));
    localStorage.setItem('cashsave_habit_preferences', JSON.stringify(habitPreferencesList));
    localStorage.removeItem('onboarding_draft');

    // Async Supabase Sync
    if (isLiveSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({
            onboarding_status: finalStatus,
            routine_status: routineStatus || 'none',
            initial_balance_total: totalStartingBalance,
          }).eq('id', user.id);

          // Clear & upsert initial balances
          await supabase.from('initial_balances').delete().eq('user_id', user.id);
          if (initialBalancesList.length > 0) {
            await supabase.from('initial_balances').insert(
              initialBalancesList.map(b => ({
                user_id: user.id,
                source_type: b.source_type,
                source_label: b.source_label,
                amount: b.amount,
              }))
            );
          }

          // Clear & upsert habit preferences
          await supabase.from('user_habit_preferences').delete().eq('user_id', user.id);
          await supabase.from('user_habit_preferences').insert(
            habitPreferencesList.map(h => ({
              user_id: user.id,
              habit_key: h.habit_key,
              is_active: h.is_active,
            }))
          );
        }
      } catch (e) {
        /* Fallback handled via localStorage */
      }
    }

    setIsSubmitting(false);
    onComplete();
  };

  const handleConfirmSkip = async () => {
    const hasData = selectedSources.length > 0 || routineStatus !== null;
    const finalStatus: OnboardingStatus = hasData ? 'partial' : 'skipped';

    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    localStorage.setItem(
      'cashsave_user',
      JSON.stringify({ ...localUser, onboarding_status: finalStatus })
    );

    if (isLiveSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ onboarding_status: finalStatus }).eq('id', user.id);
        }
      } catch (e) {}
    }

    setShowSkipConfirm(false);
    onSkip();
  };

  const formatInputValue = (digits: string) => {
    if (!digits) return '';
    const num = parseInt(digits, 10);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-between overflow-y-auto animate-fade-in"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Top Header Bar */}
      <header
        className="w-full max-w-3xl mx-auto px-4 py-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-xs">CS</span>
          </div>
          <div>
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Cash Save
            </span>
            <span className="text-xs ml-2 font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {isReconfiguring ? 'Configuration' : 'Configuration initiale'}
            </span>
          </div>
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={() => setShowSkipConfirm(true)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 hover:bg-[var(--bg-card-hover)] cursor-pointer"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Ignorer pour l&apos;instant
        </button>
      </header>

      {/* Stepper Progress Bar */}
      <div className="w-full max-w-3xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          <span>Étape {step} sur 4</span>
          <span>
            {step === 1 && 'Trésorerie de départ'}
            {step === 2 && 'Diagnostic routine'}
            {step === 3 && 'Habitudes clés'}
            {step === 4 && 'Validation'}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 4) * 100}%`, background: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Main Form Content Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col justify-center">
        <div className="glass-card p-6 sm:p-8 rounded-2xl relative shadow-xl">
          
          {/* STEP 1: COMPTES & SOLDES DE DÉPART */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  D&apos;où partons-nous ?
                </h2>
                <div className="flex items-start gap-2 mt-2 p-3 rounded-xl border" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border)' }}>
                  <ShieldCheck size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Ces informations servent uniquement à configurer ta trésorerie de départ. Elles restent strictement confidentielles et ne sont jamais partagées.
                  </p>
                </div>
              </div>

              {/* Source Chips Multi-Select */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-tertiary)' }}>
                  Sélectionne tes comptes actuels
                </label>
                <div className="flex flex-wrap gap-2">
                  {INITIAL_BALANCE_SOURCES.map(source => {
                    const isSelected = selectedSources.includes(source.type);
                    return (
                      <button
                        key={source.type}
                        type="button"
                        onClick={() => toggleSource(source.type)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none"
                        style={{
                          background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-input)',
                          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          boxShadow: isSelected ? '0 0 12px var(--accent-subtle)' : 'none',
                        }}
                      >
                        {isSelected ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-[var(--border)]" />}
                        {source.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Inputs for Selected Sources */}
              {selectedSources.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Renseigne le solde actuel par compte
                  </label>
                  {selectedSources.map(src => {
                    const labelName = src === 'autre' ? (customSourceLabel || 'Autre compte') : INITIAL_BALANCE_SOURCES.find(s => s.type === src)?.label;
                    return (
                      <div
                        key={src}
                        className="p-3 rounded-xl space-y-2 animate-fade-in"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {labelName}
                          </span>
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                            FCFA
                          </span>
                        </div>

                        {src === 'autre' && (
                          <input
                            type="text"
                            maxLength={30}
                            value={customSourceLabel}
                            onChange={(e) => setCustomSourceLabel(e.target.value)}
                            placeholder="Nom du moyen (ex: Crypto, Wise...)"
                            className="input-field text-xs mb-1.5"
                          />
                        )}

                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatInputValue(sourceAmounts[src] || '')}
                          onChange={(e) => handleAmountChange(src, e.target.value)}
                          placeholder="Solde actuel (ex: 150 000)"
                          className="input-field text-sm font-semibold"
                        />
                      </div>
                    );
                  })}

                  {/* Live Total Display */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border mt-3" style={{ background: 'var(--accent-subtle)', borderColor: 'var(--accent-border)' }}>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                      Solde net de départ
                    </span>
                    <span className="text-base font-extrabold" style={{ color: 'var(--accent)' }}>
                      {formatCFA(totalStartingBalance)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl text-center border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                  <p className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                    Tu pourras renseigner ton solde plus tard depuis My Cash.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DIAGNOSTIC DE ROUTINE */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  As-tu déjà une routine quotidienne ?
                </h2>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Cela nous aide à calibrer la méthode Cash Save selon ton niveau d&apos;habitude.
                </p>
              </div>

              {/* 3 Radio Cards */}
              <div className="space-y-3">
                {[
                  {
                    key: 'regular' as RoutineStatus,
                    title: 'Oui, assez régulière',
                    desc: 'J’exécute déjà des habitudes structurées presque chaque jour.',
                  },
                  {
                    key: 'irregular' as RoutineStatus,
                    title: 'Un peu, mais pas constante',
                    desc: 'J’essaie d’avoir une routine mais je perds souvent le rythme.',
                  },
                  {
                    key: 'none' as RoutineStatus,
                    title: 'Non, pas vraiment',
                    desc: 'Je n’ai pas de routine établie et je souhaite démarrer sur de bonnes bases.',
                  },
                ].map(item => {
                  const isSelected = routineStatus === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRoutineStatus(item.key)}
                      className="w-full text-left p-4 rounded-xl transition-all duration-150 cursor-pointer flex items-start gap-3 select-none"
                      style={{
                        background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-input)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        boxShadow: isSelected ? '0 0 16px var(--accent-subtle)' : 'none',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                        style={{
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                          background: isSelected ? 'var(--accent)' : 'transparent',
                        }}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Educational Tip Box (if irregular or none) */}
              {(routineStatus === 'irregular' || routineStatus === 'none') && (
                <div className="p-4 rounded-xl border space-y-1.5 animate-fade-in" style={{ background: 'color-mix(in srgb, var(--accent-gold) 10%, var(--bg-card))', borderColor: 'var(--accent-gold)' }}>
                  <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: 'var(--accent-gold)' }}>
                    <Sparkles size={14} /> Le conseil Cash Save
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {ONBOARDING_ROUTINE_TIP}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SÉLECTION DES HABITUDES À SUIVRE */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Choisis tes habitudes de départ
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  On te propose un socle simple — tu pourras tout ajuster plus tard dans My Habits.
                </p>
              </div>

              {/* Soft warning if > 8 habits */}
              {selectedHabits.length > 8 && (
                <div className="p-3 rounded-xl border flex items-center gap-2" style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning-border)' }}>
                  <Info size={15} className="shrink-0" style={{ color: 'var(--color-warning)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-warning)' }}>
                    Beaucoup d&apos;habitudes à la fois peut être difficile à tenir — on te conseille de commencer simple.
                  </p>
                </div>
              )}

              {/* Accordion Grouped by 4 Axes */}
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {HABIT_AXES.map(axis => {
                  const isExpanded = expandedAxes[axis.key] ?? true;
                  return (
                    <div
                      key={axis.key}
                      className="rounded-xl overflow-hidden border"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleAxisAccordion(axis.key)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                        style={{ background: 'var(--bg-card-hover)' }}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                          {axis.label}
                        </span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {isExpanded && (
                        <div className="p-3 flex flex-wrap gap-2">
                          {axis.habits.map(habitKey => {
                            const isSelected = selectedHabits.includes(habitKey);
                            const label = HABIT_LABELS[habitKey] || NUMERIC_HABIT_LABELS[habitKey];
                            const isNumeric = Boolean(NUMERIC_HABIT_LABELS[habitKey]);

                            return (
                              <button
                                key={habitKey}
                                type="button"
                                onClick={() => toggleHabit(habitKey)}
                                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none"
                                style={{
                                  background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-card)',
                                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                                }}
                              >
                                {isSelected ? (
                                  <CheckCircle2 size={13} />
                                ) : (
                                  <div className="w-3 h-3 rounded-full border border-[var(--border)]" />
                                )}
                                <span>{label}</span>
                                {isNumeric && !isSelected && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-base)] text-[var(--text-tertiary)] ml-1">
                                    à activer plus tard
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: RÉCAPITULATIF & VALIDATION */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Tout est prêt
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Voici la synthèse de ton point de départ sur Cash Save.
                </p>
              </div>

              {/* 3 Summary Cards */}
              <div className="space-y-3">
                {/* 1. Solde net */}
                <div className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        Solde net de départ
                      </p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {formatCFA(totalStartingBalance)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)]">
                    {selectedSources.length} compte(s)
                  </span>
                </div>

                {/* 2. Statut routine */}
                <div className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(214, 179, 106, 0.15)', color: 'var(--accent-gold)' }}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                        Statut de routine
                      </p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {routineStatus === 'regular' && 'Oui, assez régulière'}
                        {routineStatus === 'irregular' && 'Un peu, pas constante'}
                        {(routineStatus === 'none' || !routineStatus) && 'Non, à construire'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Habitudes activées */}
                <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                        <Award size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                          Habitudes activées
                        </p>
                        <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {selectedHabits.length} habitude(s) sélectionnée(s)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowHabitsDetail(!showHabitsDetail)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer"
                      style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                    >
                      {showHabitsDetail ? 'Masquer' : 'Voir le détail'}
                      {showHabitsDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {showHabitsDetail && (
                    <div className="pt-2 border-t flex flex-wrap gap-1.5 animate-fade-in" style={{ borderColor: 'var(--border)' }}>
                      {selectedHabits.map(h => (
                        <span key={h} className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]">
                          {HABIT_LABELS[h] || NUMERIC_HABIT_LABELS[h]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 4) setStep(3);
                  else if (step === 3) setStep(2);
                  else if (step === 2) setStep(1);
                }}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={15} /> Précédent
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) setStep(2);
                  else if (step === 2) setStep(3);
                  else if (step === 3) setStep(4);
                }}
                className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5 cursor-pointer"
              >
                Suivant <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="btn-primary text-xs py-2.5 px-6 flex items-center gap-2 font-bold shadow-lg shadow-emerald-900/30"
              >
                {isSubmitting ? (
                  'Initialisation...'
                ) : (
                  <>
                    <Sparkles size={15} /> {isReconfiguring ? 'Valider les modifications' : 'Commencer'}
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </main>

      {/* Confirmation Modal for Skip */}
      {showSkipConfirm && (
        <div className="modal-overlay" onClick={() => setShowSkipConfirm(false)}>
          <div className="modal-content p-6 max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Ignorer pour l&apos;instant ?
              </h3>
              <button
                type="button"
                onClick={() => setShowSkipConfirm(false)}
                className="p-1 rounded-md hover:bg-[var(--bg-card-hover)]"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Tu pourras configurer ces informations plus tard depuis les Réglages (&quot;Configurer mon point de départ&quot;).
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSkipConfirm(false)}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSkip}
                className="btn-primary flex-1 py-2 text-xs font-semibold"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrete Footer */}
      <footer className="py-3 text-center text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
        Cash Save © 2026 — Quiet Luxury Productivity &amp; Financial Management
      </footer>
    </div>
  );
}
