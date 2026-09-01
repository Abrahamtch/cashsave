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
  Camera, FileImage, Pencil, Trash2, Eye, Image as ImageIcon, Sparkles
} from 'lucide-react';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { broadcastDataUpdate } from '@/lib/syncUser';
import { generateUUID, ensureUUID } from '@/lib/uuid';
import FuturisticDatePicker from '@/components/FuturisticDatePicker';

export default function CashPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const supabase = createClient();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [savingTx, setSavingTx] = useState(false);
  const [initialBalanceTotal, setInitialBalanceTotal] = useState(0);

  useEffect(() => { loadTransactions(); }, []);

  async function loadTransactions() {
    const isLive = isLiveSupabaseConfigured();
    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    setTransactions(localTx);

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [txRes, profileRes, initBalRes] = await Promise.all([
            supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
            supabase.from('profiles').select('initial_balance_total').eq('id', user.id).single(),
            supabase.from('initial_balances').select('amount').eq('user_id', user.id),
          ]);
          if (txRes.data && txRes.data.length > 0) {
            setTransactions(txRes.data);
            localStorage.setItem('cashsave_transactions', JSON.stringify(txRes.data));
          }
          let totalBal = profileRes.data?.initial_balance_total || 0;
          if (initBalRes.data && initBalRes.data.length > 0) {
            const sum = initBalRes.data.reduce((acc, b) => acc + (b.amount || 0), 0);
            if (sum > 0) totalBal = sum;
          }
          setInitialBalanceTotal(totalBal);
        }
      } catch (e) { /* fallback */ }
    }
    setLoading(false);
  }

  const openCreateModal = (type: 'INCOME' | 'EXPENSE') => {
    setEditingTx(null);
    setModalType(type);
    const defaultCats = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setAmount('');
    setCategory(defaultCats[0] || 'Autre');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNote('');
    setIsSatisfied(true);
    setImageUrl(null);
    setShowModal(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setModalType(tx.type);
    setAmount(String(tx.amount));
    setCategory(tx.category);
    setDate(tx.date || format(new Date(), 'yyyy-MM-dd'));
    setNote(tx.note || '');
    setIsSatisfied(tx.is_satisfied);
    setImageUrl(tx.image_url || null);
    setShowModal(true);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    setSavingTx(true);

    const defaultCats = modalType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const finalCategory = category || defaultCats[0] || 'Autre';

    if (editingTx) {
      const validId = ensureUUID(editingTx.id);
      const updatedTx: Transaction = {
        ...editingTx,
        id: validId,
        type: modalType,
        amount: numAmount,
        category: finalCategory,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        note: note || '',
        is_satisfied: modalType === 'EXPENSE' ? (isSatisfied ?? true) : null,
        image_url: imageUrl,
      };

      setTransactions(prev => prev.map(t => t.id === editingTx.id ? updatedTx : t));
      const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
      const updatedLocal = localTx.map((t: any) => t.id === editingTx.id ? updatedTx : t);
      localStorage.setItem('cashsave_transactions', JSON.stringify(updatedLocal));

      setSavingTx(false);
      setShowModal(false);
      broadcastDataUpdate();

      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.from('transactions').update({
              type: updatedTx.type,
              amount: updatedTx.amount,
              category: updatedTx.category,
              date: updatedTx.date,
              note: updatedTx.note,
              is_satisfied: updatedTx.is_satisfied,
              image_url: updatedTx.image_url,
              user_id: user.id,
            }).eq('id', validId);
            if (error) console.error('Supabase transaction update error:', error);
          }
        } catch (e) {}
      }
    } else {
      const newId = generateUUID();
      const newTx: Transaction = {
        id: newId,
        user_id: 'demo-user',
        type: modalType,
        amount: numAmount,
        category: finalCategory,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        note: note || '',
        is_satisfied: modalType === 'EXPENSE' ? (isSatisfied ?? true) : null,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };

      setTransactions(prev => [newTx, ...prev]);
      const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
      localTx.unshift(newTx);
      localStorage.setItem('cashsave_transactions', JSON.stringify(localTx));

      setSavingTx(false);
      setShowModal(false);
      broadcastDataUpdate();

      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.from('transactions').insert({ ...newTx, id: newId, user_id: user.id });
            if (error) console.error('Supabase transaction insert error:', error);
          }
        } catch (e) {}
      }
    }
  };

  const handleDelete = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    localStorage.setItem('cashsave_transactions', JSON.stringify(localTx.filter((t: any) => t.id !== id)));
    broadcastDataUpdate();
    try { await supabase.from('transactions').delete().eq('id', id); } catch (e) {}
  };

  const summary = calculateFinancialSummary(transactions, initialBalanceTotal);
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
            onClick={() => openCreateModal('EXPENSE')}
            id="add-expense"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
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
            onClick={() => openCreateModal('INCOME')}
            id="add-income"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {card.label}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: card.bg }}
                >
                  <Icon size={16} strokeWidth={1.5} style={{ color: card.color }} />
                </div>
              </div>
              <p
                className="text-xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
              >
                {formatCFA(card.value)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters & List */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <SlidersHorizontal size={14} /> Transactions ({filtered.length})
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {months.length > 0 && (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="input-field py-1 px-2.5 text-xs w-auto"
              >
                <option value="">Tous les mois</option>
                {months.map(m => (
                  <option key={m} value={m}>
                    {format(new Date(m + '-01'), 'MMMM yyyy', { locale: fr })}
                  </option>
                ))}
              </select>
            )}

            {allCategories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="input-field py-1 px-2.5 text-xs w-auto"
              >
                <option value="">Toutes catégories</option>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card-hover)] flex items-center justify-center mx-auto" style={{ color: 'var(--text-tertiary)' }}>
              <Wallet size={20} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Aucune transaction trouvée</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Ajoutez un revenu ou une dépense pour commencer le suivi.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-xl transition-all duration-150 group hover:bg-[var(--bg-card-hover)] border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: tx.type === 'INCOME' ? 'rgba(14,159,110,0.1)' : 'rgba(244,63,94,0.1)',
                    }}
                  >
                    {tx.type === 'INCOME'
                      ? <ArrowUpRight size={15} strokeWidth={1.5} style={{ color: '#0E9F6E' }} />
                      : <ArrowDownRight size={15} strokeWidth={1.5} style={{ color: '#F43F5E' }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {tx.category}
                      </p>
                      {tx.is_satisfied !== null && (
                        tx.is_satisfied
                          ? <ThumbsUp size={11} strokeWidth={1.5} style={{ color: '#0E9F6E', flexShrink: 0 }} />
                          : <ThumbsDown size={11} strokeWidth={1.5} style={{ color: '#F43F5E', flexShrink: 0 }} />
                      )}
                      {tx.image_url && (
                        <button
                          type="button"
                          onClick={() => setViewingReceiptUrl(tx.image_url || null)}
                          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-border)] hover:opacity-80 cursor-pointer shrink-0"
                          title="Voir le justificatif"
                        >
                          <ImageIcon size={11} /> Reçu
                        </button>
                      )}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {tx.note || format(new Date(tx.date), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <p
                    className="text-sm font-semibold tracking-tight"
                    style={{
                      color: tx.type === 'INCOME' ? '#0E9F6E' : '#F43F5E',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {tx.type === 'INCOME' ? '+' : '−'}{formatCFA(tx.amount)}
                  </p>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEditModal(tx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Modifier la transaction"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tx.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/10 transition-colors cursor-pointer"
                      style={{ color: 'var(--color-danger)' }}
                      title="Supprimer la transaction"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Transaction (Création & Édition) */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-content p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {editingTx
                    ? 'Modifier la transaction'
                    : (modalType === 'INCOME' ? 'Nouveau revenu' : 'Nouvelle dépense')}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {modalType === 'INCOME' ? 'Enregistrez vos revenus' : 'Enregistrez vos dépenses & justificatifs'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer"
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
                  Note / Description
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Description optionnelle..."
                  className="input-field"
                />
              </div>

              {/* Attachement de Photo / Reçu / Justificatif */}
              <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Justificatif / Reçu de la transaction
                </label>

                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border p-2 flex items-center justify-between" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Aperçu reçu" className="w-12 h-12 object-cover rounded-lg border border-white/20" />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Photo de justificatif jointe</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="btn-secondary py-1 px-2.5 text-xs"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      Supprimer
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      htmlFor="tx-file-input"
                      className="btn-secondary py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <FileImage size={15} /> Importer photo
                    </label>
                    <input
                      type="file"
                      id="tx-file-input"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFile}
                    />

                    <label
                      htmlFor="tx-camera-input"
                      className="btn-secondary py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{ color: 'var(--accent)', borderColor: 'var(--accent-border)' }}
                    >
                      <Camera size={15} /> Prendre photo
                    </label>
                    <input
                      type="file"
                      id="tx-camera-input"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageFile}
                    />
                  </div>
                )}
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
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
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
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
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
                className="btn-primary w-full py-3 cursor-pointer"
                id="tx-submit"
                style={modalType === 'INCOME'
                  ? { background: 'linear-gradient(135deg, #0E9F6E, #087A56)', boxShadow: '0 2px 8px rgba(14,159,110,0.3)' }
                  : { background: 'linear-gradient(135deg, #F43F5E, #E11D48)', boxShadow: '0 2px 8px rgba(244,63,94,0.3)' }
                }
              >
                {savingTx ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  editingTx ? 'Enregistrer les modifications' : (modalType === 'INCOME' ? 'Ajouter ce revenu' : 'Ajouter cette dépense')
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Reçu Photo Modal */}
      {viewingReceiptUrl && (
        <div
          className="modal-overlay z-50 backdrop-blur-xl"
          onClick={() => setViewingReceiptUrl(null)}
        >
          <div
            className="modal-content max-w-2xl p-4 flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <ImageIcon size={18} style={{ color: 'var(--accent)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Justificatif de transaction</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer"
                style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="w-full flex items-center justify-center p-2 rounded-xl border bg-black/40 overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingReceiptUrl}
                alt="Justificatif grand format"
                className="max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
