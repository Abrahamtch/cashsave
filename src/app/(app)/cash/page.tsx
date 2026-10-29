'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Transaction, Profile, INCOME_CATEGORIES, EXPENSE_CATEGORIES, SupportedCurrency } from '@/types';
import { format as formatDate } from 'date-fns';
import { fr, enUS, es, pt, de, arSA } from 'date-fns/locale';
import {
  Plus, Minus, TrendingUp, TrendingDown, Wallet, Activity,
  X, Check, ThumbsUp, ThumbsDown, SlidersHorizontal, ArrowUpRight, ArrowDownRight,
  Camera, FileImage, Pencil, Trash2, Eye, Image as ImageIcon, Sparkles, Lock, Crown, Coins
} from 'lucide-react';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { broadcastDataUpdate, markLocalSelfMutation, safeMergeAndPersist } from '@/lib/syncUser';
import { generateUUID, ensureUUID } from '@/lib/uuid';
import { ensureUserProfileExists } from '@/lib/ensureProfile';
import { isPremiumActive, isTrialActive, getTransactionQuota, hasFeature } from '@/lib/plans';
import PremiumGate from '@/components/PremiumGate';
import FuturisticDatePicker from '@/components/FuturisticDatePicker';
import PremiumLimitPopup from '@/components/PremiumLimitPopup';
import { usePreferences } from '@/contexts/PreferencesContext';
import { SUPPORTED_CURRENCIES, formatMoney } from '@/lib/currency';
import Decimal from 'decimal.js';

export default function CashPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const supabase = createClient();

  const { currency, language, format: formatPreferred, convert, t, translateCategory } = usePreferences();

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<SupportedCurrency>(currency);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [savingTx, setSavingTx] = useState(false);
  const [initialBalanceTotal, setInitialBalanceTotal] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  const dateLocales = { fr, en: enUS, es, pt, de, ar: arSA };
  const currentLocale = dateLocales[language] || fr;

  useEffect(() => {
    loadTransactions();
    loadProfile();

    const handleUpdate = () => loadTransactions();
    window.addEventListener('cashsave_data_updated', handleUpdate);
    return () => window.removeEventListener('cashsave_data_updated', handleUpdate);
  }, []);

  // Synchroniser la devise de saisie par défaut avec la devise active de consultation
  useEffect(() => {
    if (!editingTx) {
      setTxCurrency(currency);
    }
  }, [currency, editingTx]);

  function loadProfile() {
    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    setProfile({
      id: localUser.id || 'demo-user',
      email: localUser.email || '',
      full_name: localUser.full_name || '',
      avatar_url: '',
      trial_start_date: localUser.trial_start_date || new Date().toISOString(),
      is_premium: localUser.is_premium || false,
      premium_expires_at: localUser.premium_expires_at || null,
      trial_7d_used: localUser.trial_7d_used || false,
      trial_7d_start: localUser.trial_7d_start || null,
      active_days_count: localUser.active_days_count || 0,
      created_at: localUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Profile);
  }

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
            supabase.from('initial_balances').select('amount, currency').eq('user_id', user.id),
          ]);
          
          const { merged } = safeMergeAndPersist('cashsave_transactions', txRes.data, user.id, 'id');
          setTransactions(merged);

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

  const [limitPopup, setLimitPopup] = useState<{ isOpen: boolean; title?: string; message: string }>({ isOpen: false, message: '' });

  const userIsPremium = isPremiumActive(profile) || isTrialActive(profile);

  const openCreateModal = (type: 'INCOME' | 'EXPENSE') => {
    // Check quota for free users
    if (!userIsPremium) {
      const quota = getTransactionQuota(profile, transactions, type);
      if (quota.reached) {
        const typeLabel = type === 'EXPENSE' ? t('cash.expense').toLowerCase() : t('cash.income').toLowerCase();
        setLimitPopup({
          isOpen: true,
          title: 'Limite quotidienne atteinte',
          message: `Vous avez atteint la limite de ${quota.limit} ${typeLabel} par jour du forfait gratuit. Passez au forfait Premium pour un enregistrement illimité.`,
        });
        return;
      }
    }
    setEditingTx(null);
    setModalType(type);
    const defaultCats = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setAmount('');
    setTxCurrency(currency);
    setCategory(defaultCats[0] || 'Autre');
    setDate(formatDate(new Date(), 'yyyy-MM-dd'));
    setNote('');
    setIsSatisfied(true);
    setImageUrl(null);
    setShowModal(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setModalType(tx.type);
    setAmount(String(tx.amount));
    setTxCurrency(tx.original_currency || 'XOF');
    setCategory(tx.category);
    setDate(tx.date || formatDate(new Date(), 'yyyy-MM-dd'));
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
    markLocalSelfMutation();

    const defaultCats = modalType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const finalCategory = category || defaultCats[0] || 'Autre';

    if (editingTx) {
      const validId = ensureUUID(editingTx.id);
      const updatedTx: Transaction = {
        ...editingTx,
        id: validId,
        type: modalType,
        amount: numAmount,
        original_currency: txCurrency,
        category: finalCategory,
        date: date || formatDate(new Date(), 'yyyy-MM-dd'),
        note: note || '',
        is_satisfied: modalType === 'EXPENSE' ? (isSatisfied ?? true) : null,
        image_url: imageUrl,
      };

      setTransactions(prev => prev.map(t => t.id === editingTx.id ? updatedTx : t));
      const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
      const updatedLocal = localTx.map((t: any) => t.id === editingTx.id ? updatedTx : t);
      localStorage.setItem('cashsave_transactions', JSON.stringify(updatedLocal));

      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await ensureUserProfileExists(supabase, user);
            const { error } = await supabase.from('transactions').update({
              type: updatedTx.type,
              amount: updatedTx.amount,
              original_currency: updatedTx.original_currency,
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

      setSavingTx(false);
      setShowModal(false);
      broadcastDataUpdate();
    } else {
      const newId = generateUUID();
      const newTx: Transaction = {
        id: newId,
        user_id: profile?.id || 'demo-user',
        type: modalType,
        amount: numAmount,
        original_currency: txCurrency,
        category: finalCategory,
        date: date || formatDate(new Date(), 'yyyy-MM-dd'),
        note: note || '',
        is_satisfied: modalType === 'EXPENSE' ? (isSatisfied ?? true) : null,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };

      setTransactions(prev => [newTx, ...prev]);
      const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
      localTx.unshift(newTx);
      localStorage.setItem('cashsave_transactions', JSON.stringify(localTx));

      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await ensureUserProfileExists(supabase, user);
            const { error } = await supabase.from('transactions').insert({
              ...newTx,
              id: newId,
              user_id: user.id,
            });
            if (error) console.error('Supabase transaction insert error:', error);
          }
        } catch (e) {}
      }

      setSavingTx(false);
      setShowModal(false);
      broadcastDataUpdate();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('cash.delete_confirm'))) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    localStorage.setItem('cashsave_transactions', JSON.stringify(localTx.filter((t: any) => t.id !== id)));
    broadcastDataUpdate();
    try { await supabase.from('transactions').delete().eq('id', id); } catch (e) {}
  };

  // CALCULS FINANCIERS HAUTE PRÉCISION EN DEVISE PRÉFÉRÉE
  const financialSummary = useMemo(() => {
    let decIncome = new Decimal(0);
    let decExpense = new Decimal(0);

    for (const tx of transactions) {
      const txCurr = tx.original_currency || 'XOF';
      const convertedVal = convert(tx.amount || 0, txCurr);
      if (tx.type === 'INCOME') {
        decIncome = decIncome.plus(convertedVal);
      } else {
        decExpense = decExpense.plus(convertedVal);
      }
    }

    const convertedInitialBalance = new Decimal(convert(initialBalanceTotal || 0, 'XOF'));
    const netProfit = decIncome.minus(decExpense);
    const balance = convertedInitialBalance.plus(netProfit);

    return {
      totalIncome: decIncome.toNumber(),
      totalExpense: decExpense.toNumber(),
      netProfit: netProfit.toNumber(),
      balance: balance.toNumber(),
      initialBalance: convertedInitialBalance.toNumber(),
    };
  }, [transactions, initialBalanceTotal, convert]);

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
    { label: t('cash.income'), value: financialSummary.totalIncome, color: '#0E9F6E', bg: 'rgba(14,159,110,0.09)', icon: TrendingUp },
    { label: t('cash.expense'), value: financialSummary.totalExpense, color: '#F43F5E', bg: 'rgba(244,63,94,0.09)', icon: TrendingDown },
    { label: t('cash.net_profit'), value: financialSummary.netProfit, color: financialSummary.netProfit >= 0 ? '#0E9F6E' : '#F43F5E', bg: financialSummary.netProfit >= 0 ? 'rgba(14,159,110,0.09)' : 'rgba(244,63,94,0.09)', icon: Activity },
    { label: t('cash.balance'), value: financialSummary.balance, color: financialSummary.balance >= 0 ? '#0E9F6E' : '#F43F5E', bg: financialSummary.balance >= 0 ? 'rgba(14,159,110,0.09)' : 'rgba(244,63,94,0.09)', icon: Wallet },
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
            {t('cash.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('cash.subtitle')}
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
            {t('cash.add_expense')}
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
            {t('cash.add_income')}
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
                {formatPreferred(card.value)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters & List */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <SlidersHorizontal size={14} /> {t('cash.transactions_count')} ({filtered.length})
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {months.length > 0 && (
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="input-field py-1 px-2.5 text-xs w-auto"
              >
                <option value="">{t('cash.all_months')}</option>
                {months.map(m => (
                  <option key={m} value={m}>
                    {formatDate(new Date(m + '-01'), 'MMMM yyyy', { locale: currentLocale })}
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
                <option value="">{t('cash.all_categories')}</option>
                {allCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
              </select>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card-hover)] flex items-center justify-center mx-auto" style={{ color: 'var(--text-tertiary)' }}>
              <Wallet size={20} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('cash.no_transactions')}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('cash.no_transactions_desc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => {
              const txOrigCurrency = tx.original_currency || 'XOF';
              const isDifferentCurrency = txOrigCurrency !== currency;
              const convertedAmount = convert(tx.amount, txOrigCurrency);

              return (
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
                          {translateCategory(tx.category)}
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
                        {tx.note || formatDate(new Date(tx.date), 'd MMM yyyy', { locale: currentLocale })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p
                        className="text-sm font-semibold tracking-tight"
                        style={{
                          color: tx.type === 'INCOME' ? '#0E9F6E' : '#F43F5E',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {tx.type === 'INCOME' ? '+' : '-'}{formatPreferred(convertedAmount)}
                      </p>
                      {/* Affichage du montant d'origine si la devise native diffère */}
                      {isDifferentCurrency && (
                        <p className="text-[10px] font-medium opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                          {t('cash.original_amount')}: {formatMoney(tx.amount, txOrigCurrency, language)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="p-1 rounded hover:bg-[var(--bg-input)] cursor-pointer text-gray-400 hover:text-white"
                        title={t('common.edit')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 rounded hover:bg-[var(--bg-input)] cursor-pointer text-rose-400 hover:text-rose-300"
                        title={t('common.delete')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Reçu plein écran */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-lg w-full bg-[var(--bg-card)] rounded-2xl p-4 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Justificatif de dépense</h3>
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl flex items-center justify-center bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={viewingReceiptUrl} alt="Reçu complet" className="w-full h-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout / Modification Transaction */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="glass-card max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl relative"
            style={{ border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: modalType === 'INCOME' ? 'rgba(14,159,110,0.1)' : 'rgba(244,63,94,0.1)',
                  }}
                >
                  {modalType === 'INCOME'
                    ? <ArrowUpRight size={16} style={{ color: '#0E9F6E' }} />
                    : <ArrowDownRight size={16} style={{ color: '#F43F5E' }} />
                  }
                </div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                  {editingTx ? t('cash.modal_edit_title') : modalType === 'INCOME' ? t('cash.modal_income_title') : t('cash.modal_expense_title')}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg transition-colors cursor-pointer"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Montant + Choix de la devise de la transaction */}
              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('cash.amount_label')} &amp; {t('cash.currency_label')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    required min="0.01"
                    className="input-field flex-1 text-2xl font-semibold text-center"
                    style={{ letterSpacing: '-0.02em' }}
                    id="tx-amount"
                  />
                  <select
                    value={txCurrency}
                    onChange={(e) => setTxCurrency(e.target.value as SupportedCurrency)}
                    className="input-field w-32 text-xs font-bold"
                  >
                    {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('cash.category_label')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="input-field"
                  id="tx-category"
                >
                  <option value="">Sélectionner...</option>
                  {categories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
                </select>
              </div>

              <FuturisticDatePicker
                label={t('cash.date_label')}
                value={date}
                onChange={setDate}
              />

              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('cash.note_label')}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('cash.note_placeholder')}
                  className="input-field"
                />
              </div>

              {/* Justificatif / Reçu */}
              <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {t('cash.receipt_label')}
                </label>

                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border p-2 flex items-center justify-between" style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Aperçu reçu" className="w-12 h-12 object-cover rounded-lg border border-white/20" />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Reçu joint</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="btn-secondary py-1 px-2.5 text-xs"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {userIsPremium ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setLimitPopup({
                            isOpen: true,
                            title: 'Fonctionnalité Premium',
                            message: 'L\'ajout de reçu et justificatif photo est réservé aux membres Premium. Passez au forfait Premium pour débloquer cette option.'
                          })}
                          className="btn-secondary py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <FileImage size={15} /> Importer photo
                        </button>
                        <button
                          type="button"
                          onClick={() => setLimitPopup({
                            isOpen: true,
                            title: 'Fonctionnalité Premium',
                            message: 'L\'ajout de reçu et justificatif photo est réservé aux membres Premium. Passez au forfait Premium pour débloquer cette option.'
                          })}
                          className="btn-secondary py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          style={{ color: 'var(--accent)', borderColor: 'var(--accent-border)' }}
                        >
                          <Camera size={15} /> Prendre photo
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {modalType === 'EXPENSE' && (
                <div>
                  <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {t('cash.satisfaction_label')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!userIsPremium) {
                          setLimitPopup({
                            isOpen: true,
                            title: 'Fonctionnalité Premium',
                            message: 'Le suivi de satisfaction des dépenses est réservé aux membres Premium.'
                          });
                        } else {
                          setIsSatisfied(true);
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
                      style={{
                        background: isSatisfied === true ? 'rgba(14,159,110,0.12)' : 'var(--bg-card-hover)',
                        border: isSatisfied === true ? '1px solid rgba(14,159,110,0.25)' : '1px solid var(--border)',
                        color: isSatisfied === true ? '#0E9F6E' : 'var(--text-secondary)',
                      }}
                    >
                      <ThumbsUp size={14} strokeWidth={1.5} />
                      {t('cash.satisfied_yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!userIsPremium) {
                          setLimitPopup({
                            isOpen: true,
                            title: 'Fonctionnalité Premium',
                            message: 'Le suivi de satisfaction des dépenses est réservé aux membres Premium.'
                          });
                        } else {
                          setIsSatisfied(false);
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
                      style={{
                        background: isSatisfied === false ? 'rgba(244,63,94,0.1)' : 'var(--bg-card-hover)',
                        border: isSatisfied === false ? '1px solid rgba(244,63,94,0.2)' : '1px solid var(--border)',
                        color: isSatisfied === false ? '#F43F5E' : 'var(--text-secondary)',
                      }}
                    >
                      <ThumbsDown size={14} strokeWidth={1.5} />
                      {t('cash.satisfied_no')}
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
                  : { background: 'linear-gradient(135deg, #F43F5E, #E11D48)', boxShadow: '0 2px 8px rgba(244,63,94,0.3)' }}
              >
                {savingTx ? t('common.loading') : editingTx ? t('common.save') : modalType === 'INCOME' ? t('cash.add_income') : t('cash.add_expense')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Popup Limite Forfait Gratuit */}
      <PremiumLimitPopup
        isOpen={limitPopup.isOpen}
        onClose={() => setLimitPopup({ isOpen: false, message: '' })}
        title={limitPopup.title}
        message={limitPopup.message}
      />
    </div>
  );
}
