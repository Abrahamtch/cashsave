// ============================================
// Coach Abraham — Outils (function calling, lecture seule)
// Principes : peu d'outils, larges, pré-agrégés.
// L'user_id vient TOUJOURS de la session, jamais d'un paramètre.
// ============================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CoachContext } from './prompt';
import { Type } from '@google/genai';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subMonths, subWeeks, format
} from 'date-fns';

// ── Helpers ──────────────────────────────────────────────

function truncate(str: string | null | undefined, max = 80): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function periodToDates(period: string, tz: string): { from: string; to: string } {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = format(now, 'yyyy-MM-dd');
      return { from: d, to: d };
    }
    case 'week': {
      return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
    }
    case 'month': {
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    }
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd') };
    }
    case 'year': {
      return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') };
    }
    default: {
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    }
  }
}

const VALID_PERIODS = ['today', 'week', 'month', 'last_month', 'year'];
const VALID_TYPES = ['INCOME', 'EXPENSE'];
const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'];

// ── Tool declarations (envoyées à Gemini) ───────────────

export const toolDeclarations = [
  {
    name: 'get_cash_summary',
    description: "Récupère un résumé financier de l'utilisateur : total des entrées, sorties, solde net, top catégories de dépenses et variation par rapport à la période précédente. Utilise cet outil quand l'utilisateur demande où va son argent, combien il a dépensé, ou veut un aperçu de ses finances.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, enum: VALID_PERIODS, description: 'Période à analyser' },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_transactions',
    description: "Liste les dernières transactions de l'utilisateur, triées par date. Utilise cet outil quand l'utilisateur veut voir le détail de ses dépenses ou revenus récents.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, enum: VALID_PERIODS },
        category: { type: Type.STRING, description: 'Filtrer par catégorie (optionnel)' },
        type: { type: Type.STRING, enum: VALID_TYPES, description: 'INCOME ou EXPENSE (optionnel)' },
        limit: { type: Type.INTEGER, description: 'Nombre max de transactions à retourner (max 20)' },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_budget_status',
    description: "Vérifie si l'utilisateur est dans son budget : objectifs avec montant visé, montant alloué, progression et alertes de dépassement. Utilise cet outil quand l'utilisateur demande s'il est dans son budget ou comment avancent ses objectifs financiers.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_objectives',
    description: "Récupère les objectifs de l'utilisateur avec titre, montant visé, montant alloué, progression et échéance. Utilise cet outil quand l'utilisateur parle de ses objectifs ou projets.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'], description: 'Filtrer par statut (optionnel)' },
      },
    },
  },
  {
    name: 'get_habits_stats',
    description: "Récupère les statistiques de suivi des habitudes : habitudes suivies, taux de réussite, séries en cours. Utilise cet outil quand l'utilisateur demande comment avancent ses habitudes ou sa discipline.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, enum: VALID_PERIODS },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_tasks_summary',
    description: "Récupère un résumé des tâches Kanban : nombre par colonne (À faire, En cours, Terminé), tâches en retard, prioritaires. Utilise cet outil quand l'utilisateur parle de ses tâches, sa productivité ou son Kanban.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Filtrer par statut (optionnel)' },
      },
    },
  },
  {
    name: 'get_discipline_score',
    description: "Récupère le score de discipline actuel de l'utilisateur et ses composantes (habitudes, finances, productivité). Utilise cet outil quand l'utilisateur parle de son score, sa discipline ou veut comprendre sa performance globale.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, enum: VALID_PERIODS },
      },
    },
  },
  {
    name: 'get_user_setup',
    description: "Récupère les moyens de paiement déclarés par l'utilisateur et leurs soldes initiaux, ainsi que les habitudes choisies. Utilise cet outil quand l'utilisateur demande la configuration de son compte ou ses soldes de départ.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

// ── Tool executors ──────────────────────────────────────

type ToolResult = Record<string, unknown>;

async function getCashSummary(
  args: { period: string },
  supabase: SupabaseClient,
  ctx: CoachContext
): Promise<ToolResult> {
  const period = VALID_PERIODS.includes(args.period) ? args.period : 'month';
  const { from, to } = periodToDates(period, ctx.timezone);

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('type, amount, category')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false });

  if (error || !transactions) return { empty: true, hint: "Impossible de lire tes transactions." };
  if (transactions.length === 0) return { empty: true, hint: "Aucune transaction sur cette période. Va dans My Cash pour en ajouter." };

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);

  // Top catégories de dépenses
  const catMap: Record<string, number> = {};
  transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }));

  // Période précédente pour variation
  let prevIncome = 0, prevExpense = 0;
  if (period === 'month' || period === 'last_month') {
    const prevMonth = period === 'month' ? subMonths(new Date(), 1) : subMonths(new Date(), 2);
    const prevFrom = format(startOfMonth(prevMonth), 'yyyy-MM-dd');
    const prevTo = format(endOfMonth(prevMonth), 'yyyy-MM-dd');
    const { data: prevTx } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', prevFrom)
      .lte('date', prevTo);
    if (prevTx) {
      prevIncome = prevTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
      prevExpense = prevTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    }
  }

  return {
    period: { from, to },
    income: Math.round(income),
    expense: Math.round(expense),
    net: Math.round(income - expense),
    top_expense_categories: topCategories,
    previous_period: {
      income: Math.round(prevIncome),
      expense: Math.round(prevExpense),
      net: Math.round(prevIncome - prevExpense),
    },
    currency: 'FCFA',
    count: transactions.length,
  };
}

async function getTransactions(
  args: { period: string; category?: string; type?: string; limit?: number },
  supabase: SupabaseClient,
  ctx: CoachContext
): Promise<ToolResult> {
  const period = VALID_PERIODS.includes(args.period) ? args.period : 'month';
  const { from, to } = periodToDates(period, ctx.timezone);
  const limit = Math.min(Math.max(1, args.limit || 10), 20);

  let query = supabase
    .from('transactions')
    .select('type, amount, category, date, note')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
    .limit(limit);

  if (args.category) query = query.eq('category', args.category);
  if (args.type && VALID_TYPES.includes(args.type)) query = query.eq('type', args.type);

  const { data, error } = await query;
  if (error || !data) return { empty: true, hint: "Impossible de lire tes transactions." };
  if (data.length === 0) return { empty: true, hint: "Aucune transaction trouvée sur cette période." };

  return {
    period: { from, to },
    transactions: data.map(t => ({
      type: t.type,
      amount: Math.round(Number(t.amount)),
      category: t.category,
      date: t.date,
      note: truncate(t.note),
    })),
    currency: 'FCFA',
    count: data.length,
  };
}

async function getBudgetStatus(
  _args: Record<string, unknown>,
  supabase: SupabaseClient,
  ctx: CoachContext
): Promise<ToolResult> {
  const { data: objectives } = await supabase
    .from('objectives')
    .select('title, target_amount, allocated_budget, progress, status, deadline')
    .eq('status', 'IN_PROGRESS');

  if (!objectives || objectives.length === 0) {
    return { empty: true, hint: "Aucun objectif financier actif. Va dans My Objectives pour en créer un." };
  }

  const totalTarget = objectives.reduce((s, o) => s + Number(o.target_amount || 0), 0);
  const totalAllocated = objectives.reduce((s, o) => s + Number(o.allocated_budget || 0), 0);

  return {
    objectives: objectives.map(o => ({
      title: truncate(o.title),
      target: Math.round(Number(o.target_amount || 0)),
      allocated: Math.round(Number(o.allocated_budget || 0)),
      progress: o.progress,
      deadline: o.deadline,
    })),
    total_target: Math.round(totalTarget),
    total_allocated: Math.round(totalAllocated),
    remaining: Math.round(totalTarget - totalAllocated),
    alerts: objectives
      .filter(o => Number(o.allocated_budget || 0) > Number(o.target_amount || 0))
      .map(o => truncate(o.title)),
    currency: 'FCFA',
  };
}

async function getObjectives(
  args: { status?: string },
  supabase: SupabaseClient
): Promise<ToolResult> {
  let query = supabase
    .from('objectives')
    .select('title, target_amount, allocated_budget, progress, status, deadline')
    .order('created_at', { ascending: false });

  if (args.status && ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'].includes(args.status)) {
    query = query.eq('status', args.status);
  }

  const { data, error } = await query;
  if (error || !data) return { empty: true, hint: "Impossible de lire tes objectifs." };
  if (data.length === 0) return { empty: true, hint: "Aucun objectif trouvé. Va dans My Objectives pour en créer un." };

  return {
    objectives: data.map(o => ({
      title: truncate(o.title),
      target: Math.round(Number(o.target_amount || 0)),
      allocated: Math.round(Number(o.allocated_budget || 0)),
      progress: o.progress,
      status: o.status,
      deadline: o.deadline,
    })),
    currency: 'FCFA',
    count: data.length,
  };
}

async function getHabitsStats(
  args: { period: string },
  supabase: SupabaseClient,
  ctx: CoachContext
): Promise<ToolResult> {
  const period = VALID_PERIODS.includes(args.period) ? args.period : 'week';
  const { from, to } = periodToDates(period, ctx.timezone);

  const { data, error } = await supabase
    .from('daily_habits')
    .select('date, bible, prayer, meditation, reading, documentary, sport, light_work, deep_work, after_work, prospects_contacted, calls_made, content_published, client_projects, learning_minutes, habit_score, work_score, business_score, learning_score, total_score')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false });

  if (error || !data) return { empty: true, hint: "Impossible de lire tes habitudes." };
  if (data.length === 0) return { empty: true, hint: "Aucune habitude enregistrée sur cette période. Va dans My Habits pour commencer à suivre tes habitudes." };

  const booleanHabits = ['bible', 'prayer', 'meditation', 'reading', 'documentary', 'sport', 'light_work', 'deep_work', 'after_work'] as const;

  const habitCompletion: Record<string, { done: number; total: number }> = {};
  for (const key of booleanHabits) {
    const done = data.filter(d => (d as Record<string, unknown>)[key] === true).length;
    habitCompletion[key] = { done, total: data.length };
  }

  const avgScore = data.reduce((s, d) => s + (d.total_score || 0), 0) / data.length;

  // Streak actuel (jours consécutifs avec au moins 1 habitude complétée)
  let streak = 0;
  const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const day of sorted) {
    const anyDone = booleanHabits.some(k => (day as Record<string, unknown>)[k] === true);
    if (anyDone) streak++;
    else break;
  }

  return {
    period: { from, to },
    days_tracked: data.length,
    habits_completion: habitCompletion,
    average_total_score: Math.round(avgScore * 10) / 10,
    current_streak: streak,
  };
}

async function getTasksSummary(
  args: { status?: string },
  supabase: SupabaseClient
): Promise<ToolResult> {
  let query = supabase
    .from('tasks')
    .select('title, status, priority, deadline')
    .order('position', { ascending: true });

  if (args.status && ['TODO', 'IN_PROGRESS', 'DONE'].includes(args.status)) {
    query = query.eq('status', args.status);
  }

  const { data, error } = await query;
  if (error || !data) return { empty: true, hint: "Impossible de lire tes tâches." };
  if (data.length === 0) return { empty: true, hint: "Aucune tâche trouvée. Va dans My Tasks pour en créer une." };

  const today = format(new Date(), 'yyyy-MM-dd');
  const overdue = data.filter(t => t.deadline && t.deadline < today && t.status !== 'DONE');
  const highPriority = data.filter(t => t.priority === 'HIGH' && t.status !== 'DONE');

  return {
    by_status: {
      TODO: data.filter(t => t.status === 'TODO').length,
      IN_PROGRESS: data.filter(t => t.status === 'IN_PROGRESS').length,
      DONE: data.filter(t => t.status === 'DONE').length,
    },
    total: data.length,
    overdue: overdue.map(t => ({ title: truncate(t.title), deadline: t.deadline })),
    high_priority: highPriority.map(t => ({ title: truncate(t.title), status: t.status })),
  };
}

async function getDisciplineScore(
  args: { period?: string },
  supabase: SupabaseClient,
  ctx: CoachContext
): Promise<ToolResult> {
  // Récupérer les habitudes du jour ou de la semaine pour le score
  const period = args.period && VALID_PERIODS.includes(args.period) ? args.period : 'today';
  const { from, to } = periodToDates(period, ctx.timezone);

  const { data: habits } = await supabase
    .from('daily_habits')
    .select('habit_score, work_score, business_score, learning_score, total_score, date')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false });

  if (!habits || habits.length === 0) {
    return { empty: true, hint: "Aucune donnée de discipline sur cette période. Va dans My Habits pour enregistrer ta journée." };
  }

  const latest = habits[0];
  const avg = habits.reduce((s, h) => s + (h.total_score || 0), 0) / habits.length;

  return {
    period: { from, to },
    latest_score: {
      total: Math.round((latest.total_score || 0) * 10) / 10,
      habit: Math.round((latest.habit_score || 0) * 10) / 10,
      work: Math.round((latest.work_score || 0) * 10) / 10,
      business: Math.round((latest.business_score || 0) * 10) / 10,
      learning: Math.round((latest.learning_score || 0) * 10) / 10,
      date: latest.date,
    },
    period_average: Math.round(avg * 10) / 10,
    days_tracked: habits.length,
  };
}

async function getUserSetup(
  _args: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<ToolResult> {
  const { data: balances } = await supabase
    .from('initial_balances')
    .select('source_type, source_label, amount');

  const { data: preferences } = await supabase
    .from('user_habit_preferences')
    .select('habit_key, is_active')
    .eq('is_active', true);

  return {
    payment_methods: (balances || []).map(b => ({
      type: b.source_type,
      label: truncate(b.source_label),
      balance: Math.round(Number(b.amount)),
    })),
    active_habits: (preferences || []).map(p => p.habit_key),
    currency: 'FCFA',
  };
}

// ── Router ──────────────────────────────────────────────

const toolMap: Record<
  string,
  (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>
> = {
  get_cash_summary: getCashSummary as unknown as (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>,
  get_transactions: getTransactions as unknown as (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>,
  get_budget_status: getBudgetStatus as unknown as (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>,
  get_objectives: getObjectives as unknown as (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>,
  get_habits_stats: getHabitsStats as unknown as (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>,
  get_tasks_summary: getTasksSummary as unknown as (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>,
  get_discipline_score: getDisciplineScore as unknown as (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>,
  get_user_setup: getUserSetup as unknown as (args: Record<string, unknown>, supabase: SupabaseClient, ctx: CoachContext) => Promise<ToolResult>,
};

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  ctx: CoachContext
): Promise<ToolResult> {
  const fn = toolMap[name];
  if (!fn) return { error: `Outil inconnu : ${name}` };

  try {
    return await fn(args, supabase, ctx);
  } catch (err) {
    console.error(`[Coach] Tool error: ${name}`, err);
    return { error: "Erreur interne lors de la lecture des données." };
  }
}
