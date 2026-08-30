'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyHabit, Transaction, Profile } from '@/types';
import { calculateCurrentStreak, calculateRecordStreak, calculateWeeklyAverage, getScoreChartData, getExpensesByCategory, getMonthlyRevenueVsExpenses, formatCFA, getTrialDaysRemaining } from '@/lib/stats';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Flame, Trophy, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Crown } from 'lucide-react';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 365>(30);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const isLive = isLiveSupabaseConfigured();

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [profileRes, habitsRes, transactionsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('daily_habits').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(365),
            supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
          ]);

          if (profileRes.data) setProfile(profileRes.data);
          if (habitsRes.data) setHabits(habitsRes.data);
          if (transactionsRes.data) setTransactions(transactionsRes.data);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Fallback below
      }
    }

    // Instant local loading (0ms delay)
    const localUser = JSON.parse(localStorage.getItem('cashsave_user') || '{}');
    setProfile({
      id: 'demo-user',
      email: localUser.email || 'demo@cashsave.app',
      full_name: localUser.full_name || 'Utilisateur Cash Save',
      avatar_url: '',
      trial_start_date: localUser.trial_start_date || new Date().toISOString(),
      is_premium: localUser.is_premium || false,
      premium_expires_at: null,
      scoring_settings: localUser.scoring_settings || {
        bible: 3, prayer: 3, meditation: 3, reading: 4, documentary: 2, sport: 5,
        light_work: 2, deep_work: 5, after_work: 3, prospects_contacted: 2, calls_made: 3,
        content_published: 4, client_projects: 5, learning_minutes: 0.1
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const localHabits = JSON.parse(localStorage.getItem('cashsave_habits') || '[]');
    setHabits(localHabits);

    const localTx = JSON.parse(localStorage.getItem('cashsave_transactions') || '[]');
    setTransactions(localTx);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}
        </div>
        <div className="h-72 skeleton" />
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

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Bienvenue, {profile?.full_name || 'Utilisateur'} 👋
          </p>
        </div>
        {!profile?.is_premium && trialDays > 0 && (
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-xs">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 font-medium">{trialDays}j restants</span>
          </div>
        )}
      </div>

      {/* Gamification Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold animate-count-up">{currentStreak}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">🔥 Streak actuel</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold animate-count-up">{recordStreak}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">🏆 Record streak</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <p className="text-2xl font-bold animate-count-up">{weeklyAvg}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">📊 Moyenne 7j</p>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold animate-count-up">{formatCFA(totalIncome - totalExpense)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">💰 Solde</p>
        </div>
      </div>

      {/* Score Evolution Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Évolution du Score Total</h2>
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {([7, 30, 365] as const).map((period) => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  chartPeriod === period
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {period === 365 ? '1A' : `${period}J`}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} interval={chartPeriod > 30 ? 30 : chartPeriod > 7 ? 4 : 0} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#16161E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Line type="monotone" dataKey="total_score" stroke="#6366F1" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#6366F1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Finance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Pie Chart */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-sm mb-4">Répartition des dépenses</h2>
          {expenseCategories.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCFA(Number(value) || 0)} contentStyle={{ background: '#16161E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
              Aucune dépense enregistrée
            </div>
          )}
        </div>

        {/* Revenue vs Expenses Bar Chart */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-sm mb-4">Revenus vs Dépenses</h2>
          {monthlyData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: any) => formatCFA(Number(value) || 0)} contentStyle={{ background: '#16161E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="revenus" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="depenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
              Aucune transaction enregistrée
            </div>
          )}
        </div>
      </div>

      {/* Quick Finance Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Revenus</p>
            <p className="font-bold text-emerald-400">{formatCFA(totalIncome)}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dépenses</p>
            <p className="font-bold text-rose-400">{formatCFA(totalExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
