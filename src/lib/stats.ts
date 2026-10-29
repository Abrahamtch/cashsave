import { DailyHabit, Transaction, SupportedCurrency } from '@/types';
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatMoney } from '@/lib/currency';

/**
 * Calcul du streak actuel (jours consécutifs avec score > seuil)
 */
export function calculateCurrentStreak(habits: DailyHabit[], threshold: number = 50): number {
  if (!habits.length) return 0;

  // Trier par date décroissante
  const sorted = [...habits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const habitDate = new Date(sorted[i].date);
    habitDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    expectedDate.setHours(0, 0, 0, 0);

    // Vérifier que c'est un jour consécutif
    if (habitDate.getTime() !== expectedDate.getTime()) break;
    
    if (sorted[i].total_score >= threshold) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calcul du record streak historique
 */
export function calculateRecordStreak(habits: DailyHabit[], threshold: number = 50): number {
  if (!habits.length) return 0;

  // Trier par date croissante
  const sorted = [...habits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const habit of sorted) {
    const habitDate = new Date(habit.date);
    habitDate.setHours(0, 0, 0, 0);

    if (lastDate) {
      const diffDays = Math.round((habitDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1 && habit.total_score >= threshold) {
        currentStreak++;
      } else if (diffDays > 1 || habit.total_score < threshold) {
        currentStreak = habit.total_score >= threshold ? 1 : 0;
      }
    } else {
      currentStreak = habit.total_score >= threshold ? 1 : 0;
    }

    lastDate = habitDate;
    maxStreak = Math.max(maxStreak, currentStreak);
  }

  return maxStreak;
}

/**
 * Moyenne hebdomadaire des scores
 */
export function calculateWeeklyAverage(habits: DailyHabit[]): number {
  if (!habits.length) return 0;

  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);
  
  const recentHabits = habits.filter(h => {
    const date = new Date(h.date);
    return date >= sevenDaysAgo && date <= today;
  });

  if (!recentHabits.length) return 0;

  const sum = recentHabits.reduce((acc, h) => acc + h.total_score, 0);
  return Math.round(sum / recentHabits.length);
}

/**
 * Données pour le graphique de score (7, 30, ou 365 jours)
 */
export function getScoreChartData(habits: DailyHabit[], days: number = 30) {
  const today = new Date();
  const habitMap = new Map(habits.map(h => [h.date, h]));
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const habit = habitMap.get(dateStr);

    data.push({
      date: dateStr,
      label: format(date, days <= 7 ? 'EEE' : 'dd/MM', { locale: fr }),
      total_score: habit ? Math.round(habit.total_score) : 0,
      habit_score: habit ? Math.round(habit.habit_score) : 0,
      work_score: habit ? Math.round(habit.work_score) : 0,
      business_score: habit ? Math.round(habit.business_score) : 0,
      learning_score: habit ? Math.round(habit.learning_score) : 0,
    });
  }

  return data;
}

/**
 * Répartition des dépenses par catégorie (pour Pie Chart)
 * Supporte une fonction de conversion optionnelle pour affichage multi-devises
 */
export function getExpensesByCategory(
  transactions: Transaction[],
  convertFn?: (amount: number, currency?: SupportedCurrency) => number
) {
  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const categoryMap: Record<string, number> = {};
  
  for (const expense of expenses) {
    const val = convertFn ? convertFn(expense.amount, expense.original_currency || 'XOF') : expense.amount;
    categoryMap[expense.category] = (categoryMap[expense.category] || 0) + val;
  }
  
  const colors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316',
    '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
  ];
  
  return Object.entries(categoryMap)
    .map(([name, value], index) => ({
      name,
      value: Math.round(value),
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Revenus vs Dépenses par mois (pour Bar Chart)
 * Supporte une fonction de conversion et une locale optionnelles
 */
export function getMonthlyRevenueVsExpenses(
  transactions: Transaction[],
  months: number = 6,
  convertFn?: (amount: number, currency?: SupportedCurrency) => number,
  locale = fr
) {
  const now = new Date();
  const startDate = subMonths(startOfMonth(now), months - 1);
  const monthIntervals = eachMonthOfInterval({ start: startDate, end: now });
  
  return monthIntervals.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= monthStart && date <= monthEnd;
    });
    
    const income = monthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => {
        const val = convertFn ? convertFn(t.amount, t.original_currency || 'XOF') : t.amount;
        return sum + val;
      }, 0);
    
    const expense = monthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => {
        const val = convertFn ? convertFn(t.amount, t.original_currency || 'XOF') : t.amount;
        return sum + val;
      }, 0);
    
    return {
      month: format(month, 'MMM yyyy', { locale }),
      revenus: Math.round(income),
      depenses: Math.round(expense),
    };
  });
}

/**
 * Calcul des totaux financiers (avec support de conversion)
 */
export function calculateFinancialSummary(
  transactions: Transaction[],
  initialBalanceTotal: number = 0,
  convertFn?: (amount: number, currency?: SupportedCurrency) => number
) {
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => {
      const val = convertFn ? convertFn(t.amount, t.original_currency || 'XOF') : t.amount;
      return sum + val;
    }, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => {
      const val = convertFn ? convertFn(t.amount, t.original_currency || 'XOF') : t.amount;
      return sum + val;
    }, 0);
  
  const convertedInitial = convertFn ? convertFn(initialBalanceTotal || 0, 'XOF') : (initialBalanceTotal || 0);
  const netProfit = Math.round(totalIncome - totalExpense);
  const balance = Math.round(convertedInitial + netProfit);

  return {
    totalIncome: Math.round(totalIncome),
    totalExpense: Math.round(totalExpense),
    netProfit,
    balance,
    initialBalance: Math.round(convertedInitial),
  };
}

/**
 * Formater un montant en FCFA (rétrocompatibilité)
 */
export function formatCFA(amount: number): string {
  return formatMoney(amount, 'XOF', 'fr');
}

/**
 * Calculer les jours restants d'essai
 */
export function getTrialDaysRemaining(trialStartDate: string): number {
  const start = new Date(trialStartDate);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 42 - daysPassed);
}

export function isTrialActive(trialStartDate: string): boolean {
  return getTrialDaysRemaining(trialStartDate) > 0;
}
