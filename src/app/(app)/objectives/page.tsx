'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Objective, ObjectiveStatus, Transaction } from '@/types';
import { calculateFinancialSummary, formatCFA } from '@/lib/stats';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Target, Plus, Calendar, CheckCircle, Clock, Trash2, Edit3, X, Wallet, AlertCircle, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import FuturisticDatePicker from '@/components/FuturisticDatePicker';

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [isFinancial, setIsFinancial] = useState(true);
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [allocatedBudget, setAllocatedBudget] = useState<string>('');
  const [generalProgress, setGeneralProgress] = useState<number>(0);
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<ObjectiveStatus>('IN_PROGRESS');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const [initialBalanceTotal, setInitialBalanceTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const isLive = isLiveSupabaseConfigured();
    const localObj = JSON.parse(localStorage.getItem('cashsave_objectives') || '[]');
    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    if (localUser.initial_balance_total) {
      setInitialBalanceTotal(localUser.initial_balance_total);
    }

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [objRes, txRes, profileRes] = await Promise.all([
            supabase.from('objectives').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
            supabase.from('profiles').select('initial_balance_total').eq('id', user.id).single(),
          ]);
          if (profileRes.data && profileRes.data.initial_balance_total) {
            setInitialBalanceTotal(profileRes.data.initial_balance_total);
          }
          let hasSupabaseData = false;
          if (objRes.data && objRes.data.length > 0) {
            setObjectives(objRes.data);
            localStorage.setItem('cashsave_objectives', JSON.stringify(objRes.data));
            hasSupabaseData = true;
          }
          if (txRes.data && txRes.data.length > 0) {
            setTransactions(txRes.data);
            localStorage.setItem('cashsave_transactions', JSON.stringify(txRes.data));
            hasSupabaseData = true;
          }
          if (hasSupabaseData) {
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    setObjectives(localObj);
    setTransactions(localTx);
    setLoading(false);
  }

  // Calcul du solde trésorerie actuel (incluant le solde initial de départ)
  const cashSummary = useMemo(() => calculateFinancialSummary(transactions, initialBalanceTotal), [transactions, initialBalanceTotal]);
  const cashBalance = Math.max(0, cashSummary.balance);

  // Somme des budgets alloués sur les AUTRES objectifs actifs
  const allocatedByOthers = useMemo(() => {
    return objectives
      .filter(o => o.id !== editingObjective?.id && o.status !== 'ABANDONED')
      .reduce((sum, o) => sum + (o.allocated_budget || 0), 0);
  }, [objectives, editingObjective]);

  // Budget disponible maximal attribuable à cet objectif
  const maxAvailableBudgetForThis = Math.max(0, cashBalance - allocatedByOthers);

  // Valeurs numériques saisies dans le formulaire
  const parsedTarget = Math.max(0, parseFloat(targetAmount) || 0);
  const parsedAllocated = Math.max(0, parseFloat(allocatedBudget) || 0);

  // Progression calculée automatiquement si financier
  const computedProgress = useMemo(() => {
    if (!isFinancial) return generalProgress;
    if (parsedTarget <= 0) return 0;
    return Math.min(100, Math.round((parsedAllocated / parsedTarget) * 100));
  }, [isFinancial, parsedTarget, parsedAllocated, generalProgress]);

  // Détection de dépassement de budget Trésorerie
  const isOverBudget = isFinancial && parsedAllocated > maxAvailableBudgetForThis;

  const openCreateModal = () => {
    setEditingObjective(null);
    setTitle('');
    setIsFinancial(true);
    setTargetAmount('');
    setAllocatedBudget('');
    setGeneralProgress(0);
    setDeadline(format(new Date(), 'yyyy-MM-dd'));
    setStatus('IN_PROGRESS');
    setShowModal(true);
  };

  const openEditModal = (obj: Objective) => {
    setEditingObjective(obj);
    setTitle(obj.title);
    const hasFinancial = (obj.target_amount || 0) > 0 || (obj.allocated_budget || 0) > 0;
    setIsFinancial(hasFinancial);
    setTargetAmount(obj.target_amount ? String(obj.target_amount) : '');
    setAllocatedBudget(obj.allocated_budget ? String(obj.allocated_budget) : '');
    setGeneralProgress(obj.progress || 0);
    setDeadline(obj.deadline || '');
    setStatus(obj.status);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverBudget) return;
    setSaving(true);

    const isCompleted = computedProgress === 100 ? 'COMPLETED' : status;
    const newObj: Objective = {
      id: editingObjective ? editingObjective.id : `obj-${Date.now()}`,
      user_id: 'demo-user',
      title,
      deadline: deadline || null,
      target_amount: isFinancial ? parsedTarget : 0,
      allocated_budget: isFinancial ? parsedAllocated : 0,
      progress: computedProgress,
      status: isCompleted,
      created_at: editingObjective ? editingObjective.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Mise à jour locale immédiate (0ms réactivité)
    setObjectives(prev => {
      if (editingObjective) {
        return prev.map(o => o.id === editingObjective.id ? newObj : o);
      }
      return [newObj, ...prev];
    });

    const localObj = JSON.parse(localStorage.getItem('cashsave_objectives') || '[]');
    if (editingObjective) {
      const idx = localObj.findIndex((o: any) => o.id === editingObjective.id);
      if (idx >= 0) localObj[idx] = newObj;
    } else {
      localObj.unshift(newObj);
    }
    localStorage.setItem('cashsave_objectives', JSON.stringify(localObj));

    if (computedProgress === 100) triggerConfetti();

    setSaving(false);
    setShowModal(false);

    // 2. Synchronisation Supabase en arrière-plan
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (editingObjective) {
            await supabase.from('objectives').update(newObj).eq('id', editingObjective.id);
          } else {
            await supabase.from('objectives').insert({ ...newObj, user_id: user.id });
          }
        }
      } catch (err) { /* silent background sync */ }
    })();
  };

  const handleDelete = (id: string) => {
    setObjectives(prev => prev.filter(o => o.id !== id));
    const localObj = JSON.parse(localStorage.getItem('cashsave_objectives') || '[]');
    localStorage.setItem('cashsave_objectives', JSON.stringify(localObj.filter((o: any) => o.id !== id)));
    (async () => {
      try {
        await supabase.from('objectives').delete().eq('id', id);
      } catch (e) {}
    })();
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#0E9F6E', '#087A56', '#D6B36A'],
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="h-6 w-40 skeleton rounded-md" />
        <div className="grid grid-cols-1 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Objectifs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Allocation stratégique de votre trésorerie et suivi d&apos;objectifs
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn-primary cursor-pointer"
          id="add-objective-btn"
        >
          <Plus size={15} strokeWidth={2} /> Nouvel objectif
        </button>
      </div>

      {/* Trésorerie & Allocations Banner */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
            <Wallet size={20} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Solde Trésorerie disponible</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCFA(cashBalance)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <p style={{ color: 'var(--text-tertiary)' }}>Budgets déjà alloués</p>
            <p className="font-semibold" style={{ color: 'var(--accent)' }}>{formatCFA(allocatedByOthers)}</p>
          </div>
          <div className="w-px h-8" style={{ background: 'var(--border)' }} />
          <div>
            <p style={{ color: 'var(--text-tertiary)' }}>Reste attribuable</p>
            <p className="font-semibold" style={{ color: maxAvailableBudgetForThis > 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}>
              {formatCFA(maxAvailableBudgetForThis)}
            </p>
          </div>
        </div>
      </div>

      {/* Objectives List */}
      <div className="space-y-3">
        {objectives.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
            <Target size={36} strokeWidth={1} style={{ color: 'var(--accent)', opacity: 0.5, marginBottom: '12px' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Aucun objectif défini pour le moment.
            </p>
            <button type="button" onClick={openCreateModal} className="btn-secondary text-xs mt-4">
              Définir mon premier objectif
            </button>
          </div>
        ) : (
          objectives.map((obj) => {
            const isFin = (obj.target_amount || 0) > 0;
            return (
              <div key={obj.id} className="glass-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                        {obj.title}
                      </h3>
                      {obj.status === 'COMPLETED' ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{
                            background: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                            border: '1px solid var(--color-success-border)',
                          }}
                        >
                          <CheckCircle size={12} strokeWidth={2} /> Atteint
                        </span>
                      ) : isFin ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                        >
                          Financier
                        </span>
                      ) : null}
                    </div>

                    {obj.deadline && (
                      <p className="text-xs flex items-center gap-1 mt-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        <Calendar size={13} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                        Échéance : {format(new Date(obj.deadline), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(obj)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
                      style={{ color: 'var(--text-tertiary)' }}
                      aria-label="Éditer l'objectif"
                    >
                      <Edit3 size={15} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(obj.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
                      style={{ color: 'var(--text-tertiary)' }}
                      aria-label="Supprimer l'objectif"
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Details & Progress */}
                {isFin && (
                  <div className="flex items-center justify-between text-xs p-3 rounded-xl" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ color: 'var(--text-tertiary)' }}>Budget alloué</p>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{formatCFA(obj.allocated_budget || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p style={{ color: 'var(--text-tertiary)' }}>Coût total visé</p>
                      <p className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{formatCFA(obj.target_amount || 0)}</p>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>Progression</span>
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>{obj.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${obj.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                {editingObjective ? "Éditer l'objectif" : 'Nouvel objectif'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                aria-label="Fermer"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Intitulé de l&apos;objectif
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: iPhone 16 Pro, Fonds de Roulement..."
                  required
                  className="input-field"
                />
              </div>

              {/* Selector Type */}
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setIsFinancial(true)}
                  className="flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer"
                  style={{
                    background: isFinancial ? 'var(--accent)' : 'transparent',
                    color: isFinancial ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  Objectif Financier
                </button>
                <button
                  type="button"
                  onClick={() => setIsFinancial(false)}
                  className="flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer"
                  style={{
                    background: !isFinancial ? 'var(--accent)' : 'transparent',
                    color: !isFinancial ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  Objectif Général
                </button>
              </div>

              {/* Financial Inputs */}
              {isFinancial ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Coût total de l&apos;objectif (FCFA)
                    </label>
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="Ex: 800000"
                      min="0"
                      required={isFinancial}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Budget actuellement alloué (FCFA)
                      </label>
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        Max dispo : <strong style={{ color: 'var(--text-primary)' }}>{formatCFA(maxAvailableBudgetForThis)}</strong>
                      </span>
                    </div>
                    <input
                      type="number"
                      value={allocatedBudget}
                      onChange={(e) => setAllocatedBudget(e.target.value)}
                      placeholder="Ex: 250000"
                      min="0"
                      className="input-field"
                    />
                  </div>

                  {/* Warning exceed Cash Balance */}
                  {isOverBudget && (
                    <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)' }}>
                      <AlertCircle size={16} strokeWidth={2} className="shrink-0 mt-0.5" />
                      <p>
                        Le budget alloué total dépasserait votre solde Trésorerie disponible ({formatCFA(cashBalance)}). Vous pouvez allouer au maximum <strong>{formatCFA(maxAvailableBudgetForThis)}</strong>.
                      </p>
                    </div>
                  )}

                  {/* Calculated Progress Preview */}
                  {parsedTarget > 0 && !isOverBudget && (
                    <div className="p-3 rounded-xl text-xs flex justify-between items-center" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Progression calculée automatique :</span>
                      <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>{computedProgress}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Progression actuelle ({generalProgress}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={generalProgress}
                    onChange={(e) => setGeneralProgress(parseInt(e.target.value, 10) || 0)}
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
              )}

              <FuturisticDatePicker
                label="Échéance"
                value={deadline}
                onChange={setDeadline}
              />

              <button
                type="submit"
                disabled={saving || isOverBudget}
                className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? 'Enregistrement...' : editingObjective ? 'Mettre à jour' : 'Créer l\'objectif'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
