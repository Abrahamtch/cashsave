'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Transaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';
import { calculateFinancialSummary, formatCFA } from '@/lib/stats';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Minus, ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, X, Check, ThumbsUp, ThumbsDown, Filter } from 'lucide-react';

import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';

export default function CashPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const supabase = createClient();

  // Form state
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
          const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });
          if (data) {
            setTransactions(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    setTransactions(localTx);
    setLoading(false);
  }

  const openModal = (type: 'INCOME' | 'EXPENSE') => {
    setModalType(type);
    setAmount('');
    setCategory('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNote('');
    setIsSatisfied(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTx(true);

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      user_id: 'demo-user',
      type: modalType,
      amount: parseFloat(amount),
      category,
      date,
      note,
      is_satisfied: modalType === 'EXPENSE' ? isSatisfied : null,
      created_at: new Date().toISOString(),
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('transactions').insert({ ...newTx, user_id: user.id });
      }
    } catch (e) {
      // Ignore
    }

    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    localTx.unshift(newTx);
    localStorage.setItem('cashsave_transactions', JSON.stringify(localTx));

    setSavingTx(false);
    setShowModal(false);
    loadTransactions();
  };

  const handleDelete = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    localStorage.setItem('cashsave_transactions', JSON.stringify(localTx.filter((t: any) => t.id !== id)));
    try {
      await supabase.from('transactions').delete().eq('id', id);
    } catch (e) {}
  };

  const summary = calculateFinancialSummary(transactions);
  const categories = modalType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Filtered transactions
  const filtered = transactions.filter(t => {
    if (filterMonth && !t.date.startsWith(filterMonth)) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  // Available months for filter
  const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort().reverse();
  const allCategories = [...new Set(transactions.map(t => t.category))].sort();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Cash</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Gestion de trésorerie</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 stagger-children">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500">Revenus</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">{formatCFA(summary.totalIncome)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-gray-500">Dépenses</span>
          </div>
          <p className="text-lg font-bold text-rose-400">{formatCFA(summary.totalExpense)}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-gray-500">Bénéfice</span>
          </div>
          <p className={`text-lg font-bold ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCFA(summary.netProfit)}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-500">Solde</span>
          </div>
          <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCFA(summary.balance)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => openModal('INCOME')} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-sm hover:bg-emerald-500/20 transition-all" id="add-income">
          <Plus className="w-5 h-5" /> Ajouter un revenu
        </button>
        <button onClick={() => openModal('EXPENSE')} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium text-sm hover:bg-rose-500/20 transition-all" id="add-expense">
          <Minus className="w-5 h-5" /> Ajouter une dépense
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-3 flex gap-2 items-center overflow-x-auto">
        <Filter className="w-4 h-4 text-gray-500 shrink-0" />
        <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="input-field py-1.5 text-xs w-auto min-w-[120px]">
          <option value="">Tous les mois</option>
          {months.map(m => (
            <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy', { locale: fr })}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-field py-1.5 text-xs w-auto min-w-[120px]">
          <option value="">Toutes catégories</option>
          {allCategories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-500 text-sm">
            Aucune transaction{filterMonth || filterCategory ? ' pour ces filtres' : ''}
          </div>
        ) : (
          filtered.map(tx => (
            <div key={tx.id} className="glass-card p-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                tx.type === 'INCOME' ? 'bg-emerald-500/15' : 'bg-rose-500/15'
              }`}>
                {tx.type === 'INCOME' ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-rose-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{tx.category}</p>
                  {tx.is_satisfied !== null && (
                    tx.is_satisfied ? <ThumbsUp className="w-3 h-3 text-emerald-400" /> : <ThumbsDown className="w-3 h-3 text-rose-400" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {tx.note || format(new Date(tx.date), 'd MMM yyyy', { locale: fr })}
                </p>
              </div>
              <p className={`text-sm font-bold shrink-0 ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tx.type === 'INCOME' ? '+' : '-'}{formatCFA(tx.amount)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">
                {modalType === 'INCOME' ? '💰 Nouveau revenu' : '💸 Nouvelle dépense'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Montant (FCFA)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required min="1" className="input-field text-2xl font-bold text-center" id="tx-amount" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} required className="input-field" id="tx-category">
                  <option value="">Choisir...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Note / Raison</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Description..." className="input-field" />
              </div>
              {modalType === 'EXPENSE' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Satisfait de cette dépense ?</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsSatisfied(true)} className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      isSatisfied === true ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-white/5 border border-white/10 text-gray-400'
                    }`}>
                      <ThumbsUp className="w-4 h-4" /> Oui
                    </button>
                    <button type="button" onClick={() => setIsSatisfied(false)} className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      isSatisfied === false ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400' : 'bg-white/5 border border-white/10 text-gray-400'
                    }`}>
                      <ThumbsDown className="w-4 h-4" /> Non
                    </button>
                  </div>
                </div>
              )}
              <button type="submit" disabled={savingTx} className={`btn-primary w-full py-3 ${
                modalType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
              }`} id="tx-submit">
                {savingTx ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Check className="w-5 h-5" /> Enregistrer</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
