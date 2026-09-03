'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyHabit, Transaction, Profile } from '@/types';
import {
  calculateCurrentStreak,
  calculateRecordStreak,
  calculateWeeklyAverage,
  getScoreChartData,
  getExpensesByCategory,
  getMonthlyRevenueVsExpenses,
  formatCFA,
  getTrialDaysRemaining,
} from '@/lib/stats';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { syncUserDataFromSupabase } from '@/lib/syncUser';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from 'recharts';
import {
  Zap, Trophy, BarChart2, Wallet,
  TrendingUp, TrendingDown, Crown, Timer,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 365>(30);
  const [loading, setLoading] = useState(true);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    handlePaymentSuccessCheck();
    loadData();
    const handleUpdate = () => { loadData(); };
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('cashsave_data_updated', handleUpdate);
    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('cashsave_data_updated', handleUpdate);
    };
  }, []);

  async function handlePaymentSuccessCheck() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' || params.get('payment') === 'success_demo') {
      setShowPaymentSuccess(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ['#0E9F6E', '#087A56', '#D6B36A'] });
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
      localStorage.setItem('cashsave_user', JSON.stringify({ ...localUser, is_premium: true, premium_expires_at: expiresAt }));
      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('profiles').update({ is_premium: true, premium_expires_at: expiresAt }).eq('id', user.id);
          }
        } catch (e) { /* silent */ }
      }
    }
  }

  async function loadData() {
    const isLive = isLiveSupabaseConfigured();
    const localHabits = JSON.parse(localStorage.getItem('cashsave_habits') || '[]');
    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');

    setHabits(localHabits);
    setTransactions(localTx);

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await syncUserDataFromSupabase(user.id);
          const [profileRes, habitsRes, transactionsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('daily_habits').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(365),
            supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
          ]);
          if (profileRes.data) setProfile(profileRes.data);
          if (Array.isArray(habitsRes.data) && habitsRes.data.length > 0) {
            setHabits(habitsRes.data);
            localStorage.setItem('cashsave_habits', JSON.stringify(habitsRes.data));
          }
          if (Array.isArray(transactionsRes.data) && transactionsRes.data.length > 0) {
            setTransactions(transactionsRes.data);
            localStorage.setItem('cashsave_transactions', JSON.stringify(transactionsRes.data));
          }
        }
      } catch (e) { /* fallback */ }
    }
    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    setProfile({
      id: 'demo-user',
      email: localUser.email || 'demo@cashsave.app',
      full_name: localUser.full_name || 'Utilisateur Cash Save',
      avatar_url: '',
      trial_start_date: localUser.trial_start_date || new Date().toISOString(),
      is_premium: localUser.is_premium || false,
      premium_expires_at: null,
      onboarding_status: localUser.onboarding_status || 'not_started',
      routine_status: localUser.routine_status || 'none',
      initial_balance_total: localUser.initial_balance_total || 0,
      scoring_settings: localUser.scoring_settings || {
        bible: 3, prayer: 3, meditation: 3, reading: 4, documentary: 2, sport: 5,
        light_work: 2, deep_work: 5, after_work: 3, prospects_contacted: 2,
        calls_made: 3, content_published: 4, client_projects: 5, learning_minutes: 0.1,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setHabits(JSON.parse(localStorage.getItem('cashsave_habits') || '[]'));
    setTransactions(JSON.parse(localStorage.getItem('cashsave_transactions') || '[]'));
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="h-6 w-40 skeleton rounded-md" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
        <div className="h-72 skeleton rounded-xl" />
      </div>
    );
  }

  const currentStreak = calculateCurrentStreak(habits);
  const recordStreak = calculateRecordStreak(habits);
  const weeklyAvg = calculateWeeklyAverage(habits);
  const scoreData = getScoreChartData(habits, chartPeriod);
  const expenseCategories = getExpensesByCategory(transactions);
  const monthlyData = getMonthlyRevenueVsExpenses(transactions);
  const trialDays = profile ? getTrialDaysRemaining(profile.trial_start_date) : 0;
  
  const initialStartingBalance = profile?.initial_balance_total || 0;
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netBalance = initialStartingBalance + (totalIncome - totalExpense);

  const statCards = [
    {
      label: 'Série en cours',
      value: `${currentStreak}j`,
      icon: Zap,
      accent: 'var(--color-warning)',
      accentBg: 'rgba(245,158,11,0.1)',
    },
    {
      label: 'Record historique',
      value: `${recordStreak}j`,
      icon: Trophy,
      accent: 'var(--accent-gold)',
      accentBg: 'rgba(214,179,106,0.1)',
    },
    {
      label: 'Moyenne hebdomadaire',
      value: `${weeklyAvg}/100`,
      icon: BarChart2,
      accent: 'var(--accent)',
      accentBg: 'var(--accent-subtle)',
    },
    {
      label: 'Solde Trésorerie',
      value: formatCFA(netBalance),
      icon: Wallet,
      accent: 'var(--accent)',
      accentBg: 'var(--accent-subtle)',
    },
  ];

  const tooltipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-md)',
  };

  const periodLabels: Record<number, string> = { 7: '7j', 30: '30j', 365: '1an' };

  return (
    <div className="space-y-8">

      {/* Payment success banner */}
      {showPaymentSuccess && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-xl animate-fade-in-up"
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)' }}
          >
            <Crown size={15} strokeWidth={1.5} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
              Abonnement activé
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Votre compte Premium est actif pour 30 jours.
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Bonjour, {(profile?.full_name || 'Utilisateur').split(' ')[0]}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Voici un aperçu de votre progression
          </p>
        </div>

        {!profile?.is_premium && trialDays > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.18)',
            }}
          >
            <Timer size={13} strokeWidth={1.5} style={{ color: '#F59E0B' }} />
            <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>
              {trialDays} jour{trialDays > 1 ? 's' : ''} d&apos;essai
            </span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, accent, accentBg }) => (
          <div
            key={label}
            className="glass-card p-5 flex flex-col gap-3"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: accentBg }}
            >
              <Icon size={16} strokeWidth={1.5} style={{ color: accent }} />
            </div>
            <div>
              <p
                className="text-xl font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
              >
                {value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Score chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Score de productivité
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Évolution sur la période sélectionnée
            </p>
          </div>
          <div
            className="flex gap-0.5 p-1 rounded-lg"
            style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
          >
            {([7, 30, 365] as const).map((period) => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
                style={{
                  background: chartPeriod === period ? 'var(--accent)' : 'transparent',
                  color: chartPeriod === period ? '#fff' : 'var(--text-tertiary)',
                }}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                interval={chartPeriod > 30 ? 30 : chartPeriod > 7 ? 4 : 0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
                cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="total_score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Finance charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h2 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Répartition des dépenses
          </h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>Par catégorie</p>
          {expenseCategories.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={76}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatCFA(Number(value) || 0)}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="h-52 flex flex-col items-center justify-center gap-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <BarChart2 size={24} strokeWidth={1.5} />
              <p className="text-xs">Aucune dépense enregistrée</p>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Revenus vs Dépenses
          </h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>Par mois</p>
          {monthlyData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                    tickLine={false} axisLine={false} width={30}
                  />
                  <Tooltip
                    formatter={(value: any) => formatCFA(Number(value) || 0)}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                  />
                  <Bar dataKey="revenus" name="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="depenses" name="Dépenses" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="h-52 flex flex-col items-center justify-center gap-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <TrendingUp size={24} strokeWidth={1.5} />
              <p className="text-xs">Aucune transaction enregistrée</p>
            </div>
          )}
        </div>
      </div>

      {/* Finance summary */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="glass-card p-5 flex items-center gap-4"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            <TrendingUp size={16} strokeWidth={1.5} style={{ color: '#10B981' }} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Revenus totaux</p>
            <p
              className="text-base font-semibold mt-0.5 tracking-tight"
              style={{ color: '#10B981', letterSpacing: '-0.01em' }}
            >
              {formatCFA(totalIncome)}
            </p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(244,63,94,0.1)' }}
          >
            <TrendingDown size={16} strokeWidth={1.5} style={{ color: '#F43F5E' }} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Dépenses totales</p>
            <p
              className="text-base font-semibold mt-0.5 tracking-tight"
              style={{ color: '#F43F5E', letterSpacing: '-0.01em' }}
            >
              {formatCFA(totalExpense)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
