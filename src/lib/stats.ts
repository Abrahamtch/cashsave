import { DailyHabit, Transaction } from '@/types';
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

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

  const sorted = [...habits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate: Date | null = null;

  for (const habit of sorted) {
    const currentDate = new Date(habit.date);
    currentDate.setHours(0, 0, 0, 0);

    if (habit.total_score >= threshold) {
      if (lastDate) {
        const diffDays = Math.floor(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    lastDate = currentDate;
  }

  return maxStreak;
}

/**
 * Moyenne du score total sur les N derniers jours
 */
export function calculateWeeklyAverage(habits: DailyHabit[], days: number = 7): number {
  const cutoffDate = subDays(new Date(), days);
  const recent = habits.filter(h => new Date(h.date) >= cutoffDate);
  
  if (recent.length === 0) return 0;
  
  const sum = recent.reduce((acc, h) => acc + h.total_score, 0);
  return Math.round((sum / recent.length) * 100) / 100;
}

/**
 * Données pour le graphique d'évolution du score
 */
export function getScoreChartData(habits: DailyHabit[], days: number = 30) {
  const result: { date: string; label: string; total_score: number; habit_score: number; work_score: number; business_score: number; learning_score: number }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const habit = habits.find(h => h.date === dateStr);
    
    result.push({
      date: dateStr,
      label: format(date, 'dd/MM', { locale: fr }),
      total_score: habit?.total_score || 0,
      habit_score: habit?.habit_score || 0,
      work_score: habit?.work_score || 0,
      business_score: habit?.business_score || 0,
      learning_score: habit?.learning_score || 0,
    });
  }
  
  return result;
}

/**
 * Répartition des dépenses par catégorie (pour Pie Chart)
 */
export function getExpensesByCategory(transactions: Transaction[]) {
  const expenses = transactions.filter(t => t.type === 'EXPENSE');
  const categoryMap: Record<string, number> = {};
  
  for (const expense of expenses) {
    categoryMap[expense.category] = (categoryMap[expense.category] || 0) + expense.amount;
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
 */
export function getMonthlyRevenueVsExpenses(transactions: Transaction[], months: number = 6) {
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
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = monthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      month: format(month, 'MMM yyyy', { locale: fr }),
      revenus: Math.round(income),
      depenses: Math.round(expense),
    };
  });
}

/**
 * Calcul des totaux financiers
 */
export function calculateFinancialSummary(transactions: Transaction[], initialBalanceTotal: number = 0) {
  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netProfit = Math.round(totalIncome - totalExpense);
  const balance = Math.round((initialBalanceTotal || 0) + netProfit);

  return {
    totalIncome: Math.round(totalIncome),
    totalExpense: Math.round(totalExpense),
    netProfit,
    balance,
    initialBalance: Math.round(initialBalanceTotal || 0),
  };
}

/**
 * Formater un montant en FCFA
 */
export function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
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
