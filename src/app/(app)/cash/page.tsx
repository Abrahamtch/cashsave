'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Transaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';
import { calculateFinancialSummary, formatCFA } from '@/lib/stats';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, Minus, TrendingUp, TrendingDown, Wallet, Activity,
  X, Check, ThumbsUp, ThumbsDown, SlidersHorizontal, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import FuturisticDatePicker from '@/components/FuturisticDatePicker';

export default function CashPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const supabase = createClient();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null);
  const [savingTx, setSavingTx] = useState(false);

  useEffect(() => { loadTransactions(); }, []);

  async function loadTransactions() {
    const isLive = isLiveSupabaseConfigured();
    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false });
          if (data) { setTransactions(data); setLoading(false); return; }
        }
      } catch (e) { /* fallback */ }
    }
    setTransactions(JSON.parse(localStorage.getItem('cashsave_transactions') || '[]'));
    setLoading(false);
  }

  const openModal = (type: 'INCOME' | 'EXPENSE') => {
    setModalType(type);
    const defaultCats = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setAmount('');
    setCategory(defaultCats[0] || 'Autre');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNote('');
    setIsSatisfied(true);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    setSavingTx(true);

    const defaultCats = modalType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const finalCategory = category || defaultCats[0] || 'Autre';

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      user_id: 'demo-user',
      type: modalType,
      amount: numAmount,
      category: finalCategory,
      date: date || format(new Date(), 'yyyy-MM-dd'),
      note: note || '',
      is_satisfied: modalType === 'EXPENSE' ? (isSatisfied ?? true) : null,
      created_at: new Date().toISOString(),
    };

    // 1. Mise à jour locale instantanée (0ms de latence)
    setTransactions(prev => [newTx, ...prev]);

    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    localTx.unshift(newTx);
    localStorage.setItem('cashsave_transactions', JSON.stringify(localTx));

    setSavingTx(false);
    setShowModal(false);

    // 2. Synchro Supabase en arrière-plan
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from('transactions').insert({ ...newTx, user_id: user.id });
      } catch (e) { /* silent */ }
    })();
  };

  const handleDelete = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    localStorage.setItem('cashsave_transactions', JSON.stringify(localTx.filter((t: any) => t.id !== id)));
    try { await supabase.from('transactions').delete().eq('id', id); } catch (e) {}
  };

  const summary = calculateFinancialSummary(transactions);
  const categories = modalType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const filtered = transactions.filter(t => {
    if (filterMonth && !t.date.startsWith(filterMonth)) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });
  const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort().reverse();
  const allCategories = [...new Set(transactions.map(t => t.category))].sort();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="h-6 w-40 skeleton rounded-md" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Revenus', value: summary.totalIncome, color: '#0E9F6E', bg: 'rgba(14,159,110,0.09)', icon: TrendingUp },
    { label: 'Dépenses', value: summary.totalExpense, color: '#F43F5E', bg: 'rgba(244,63,94,0.09)', icon: TrendingDown },
    { label: 'Bénéfice', value: summary.netProfit, color: summary.netProfit >= 0 ? '#0E9F6E' : '#F43F5E', bg: summary.netProfit >= 0 ? 'rgba(14,159,110,0.09)' : 'rgba(244,63,94,0.09)', icon: Activity },
    { label: 'Solde', value: summary.balance, color: summary.balance >= 0 ? '#0E9F6E' : '#F43F5E', bg: summary.balance >= 0 ? 'rgba(14,159,110,0.09)' : 'rgba(244,63,94,0.09)', icon: Wallet },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Trésorerie
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Suivi de vos revenus et dépenses
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('EXPENSE')}
            id="add-expense"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.18)',
              color: '#F43F5E',
            }}
          >
            <Minus size={13} strokeWidth={2} />
            Dépense
          </button>
          <button
            onClick={() => openModal('INCOME')}
            id="add-income"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: 'rgba(14,159,110,0.08)',
              border: '1px solid rgba(14,159,110,0.2)',
              color: '#0E9F6E',
            }}
          >
            <Plus size={13} strokeWidth={2} />
            Revenu
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: bg }}
              >
                <Icon size={14} strokeWidth={1.5} style={{ color }} />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
            </div>
            <p
              className="text-base font-semibold tracking-tight"
              style={{ color, letterSpacing: '-0.01em' }}
            >
              {formatCFA(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      {(months.length > 0 || allCategories.length > 0) && (
        <div
          className="glass-card flex items-center gap-3 px-4 py-3 overflow-x-auto"
        >
          <SlidersHorizontal size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="input-field py-1.5 text-xs"
            style={{ minWidth: '130px', width: 'auto' }}
          >
            <option value="">Tous les mois</option>
            {months.map(m => (
              <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy', { locale: fr })}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field py-1.5 text-xs"
            style={{ minWidth: '130px', width: 'auto' }}
          >
            <option value="">Toutes catégories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Transactions Container — Spaced Cards (No harsh divider lines) */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
            Historique des transactions
          </p>
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} opération{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div
            className="py-12 flex flex-col items-center gap-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Wallet size={28} strokeWidth={1} />
            <p className="text-sm">
              {filterMonth || filterCategory ? 'Aucune transaction pour ces filtres' : 'Aucune transaction enregistrée'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(tx => (
              <div
                key={tx.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
                style={{ background: 'var(--bg-card-hover)', border: '1px solid transparent' }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: tx.type === 'INCOME' ? 'rgba(14,159,110,0.1)' : 'rgba(244,63,94,0.1)',
                  }}
                >
                  {tx.type === 'INCOME'
                    ? <ArrowUpRight size={14} strokeWidth={1.5} style={{ color: '#0E9F6E' }} />
                    : <ArrowDownRight size={14} strokeWidth={1.5} style={{ color: '#F43F5E' }} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {tx.category}
                    </p>
                    {tx.is_satisfied !== null && (
                      tx.is_satisfied
                        ? <ThumbsUp size={11} strokeWidth={1.5} style={{ color: '#0E9F6E', flexShrink: 0 }} />
                        : <ThumbsDown size={11} strokeWidth={1.5} style={{ color: '#F43F5E', flexShrink: 0 }} />
                    )}
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {tx.note || format(new Date(tx.date), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>

                <p
                  className="text-sm font-semibold shrink-0"
                  style={{
                    color: tx.type === 'INCOME' ? '#0E9F6E' : '#F43F5E',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {tx.type === 'INCOME' ? '+' : '−'}{formatCFA(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-content p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {modalType === 'INCOME' ? 'Nouveau revenu' : 'Nouvelle dépense'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {modalType === 'INCOME' ? 'Enregistrez un revenu' : 'Enregistrez une dépense'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                aria-label="Fermer"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  required min="1"
                  className="input-field text-2xl font-semibold text-center"
                  style={{ letterSpacing: '-0.02em' }}
                  id="tx-amount"
                />
              </div>

              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="input-field"
                  id="tx-category"
                >
                  <option value="">Sélectionner...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <FuturisticDatePicker
                label="Date"
                value={date}
                onChange={setDate}
              />

              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Note
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Description optionnelle..."
                  className="input-field"
                />
              </div>

              {modalType === 'EXPENSE' && (
                <div>
                  <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Satisfait de cette dépense ?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSatisfied(true)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                      style={{
                        background: isSatisfied === true ? 'rgba(14,159,110,0.12)' : 'var(--bg-card-hover)',
                        border: isSatisfied === true ? '1px solid rgba(14,159,110,0.25)' : '1px solid var(--border)',
                        color: isSatisfied === true ? '#0E9F6E' : 'var(--text-secondary)',
                      }}
                    >
                      <ThumbsUp size={14} strokeWidth={1.5} />
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSatisfied(false)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                      style={{
                        background: isSatisfied === false ? 'rgba(244,63,94,0.1)' : 'var(--bg-card-hover)',
                        border: isSatisfied === false ? '1px solid rgba(244,63,94,0.2)' : '1px solid var(--border)',
                        color: isSatisfied === false ? '#F43F5E' : 'var(--text-secondary)',
                      }}
                    >
                      <ThumbsDown size={14} strokeWidth={1.5} />
                      Non
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={savingTx}
                className="btn-primary w-full py-3"
                id="tx-submit"
                style={modalType === 'INCOME'
                  ? { background: 'linear-gradient(135deg, #0E9F6E, #087A56)', boxShadow: '0 2px 8px rgba(14,159,110,0.3)' }
                  : { background: 'linear-gradient(135deg, #F43F5E, #E11D48)', boxShadow: '0 2px 8px rgba(244,63,94,0.3)' }
                }
              >
                {savingTx
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Check size={15} strokeWidth={2} /> Enregistrer</>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
