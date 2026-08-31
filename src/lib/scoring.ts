import { DailyHabit, ScoringSettings } from '@/types';

/**
 * Calcul du taux de complétion quotidien des habitudes en pourcentage (0% à 100%).
 * Les 100% sont divisés équitablement entre les habitudes sélectionnées et actives.
 */
export function calculateRoutineCompletionPercentage(
  habitData: Partial<DailyHabit>,
  activeHabitKeys: string[] = []
): {
  percentage: number;
  completedCount: number;
  totalTracked: number;
} {
  const ALL_BOOLEAN = ['bible', 'prayer', 'meditation', 'reading', 'documentary', 'sport', 'light_work', 'deep_work', 'after_work'] as const;
  const ALL_NUMERIC = ['prospects_contacted', 'calls_made', 'content_published', 'client_projects', 'learning_minutes'] as const;

  const activeBooleans = activeHabitKeys.length > 0
    ? ALL_BOOLEAN.filter(k => activeHabitKeys.includes(k))
    : ALL_BOOLEAN;

  const activeNumerics = activeHabitKeys.length > 0
    ? ALL_NUMERIC.filter(k => activeHabitKeys.includes(k))
    : ALL_NUMERIC;

  let completedCount = 0;

  activeBooleans.forEach(k => {
    if (habitData[k]) completedCount += 1;
  });

  activeNumerics.forEach(k => {
    const val = typeof habitData[k] === 'number' ? habitData[k] : parseFloat(String(habitData[k] || 0));
    if (val && val > 0) completedCount += 1;
  });

  const totalTracked = activeBooleans.length + activeNumerics.length;
  if (totalTracked === 0) return { percentage: 0, completedCount: 0, totalTracked: 0 };

  const percentage = Math.min(100, Math.round((completedCount / totalTracked) * 100));
  return { percentage, completedCount, totalTracked };
}

export function calculateHabitScore(habit: Partial<DailyHabit>, settings: ScoringSettings): number {
  let score = 0;
  const booleanHabits = ['bible', 'prayer', 'meditation', 'reading', 'documentary', 'sport'] as const;

  for (const key of booleanHabits) {
    if (habit[key]) {
      score += settings[key] || 0;
    }
  }
  return score;
}

export function calculateWorkScore(habit: Partial<DailyHabit>, settings: ScoringSettings): number {
  let score = 0;
  if (habit.light_work) score += settings.light_work || 0;
  if (habit.deep_work) score += settings.deep_work || 0;
  if (habit.after_work) score += settings.after_work || 0;
  return score;
}

export function calculateBusinessScore(habit: Partial<DailyHabit>, settings: ScoringSettings): number {
  let score = 0;
  score += (habit.prospects_contacted || 0) * (settings.prospects_contacted || 0);
  score += (habit.calls_made || 0) * (settings.calls_made || 0);
  score += (habit.content_published || 0) * (settings.content_published || 0);
  score += (habit.client_projects || 0) * (settings.client_projects || 0);
  return score;
}

export function calculateLearningScore(habit: Partial<DailyHabit>, settings: ScoringSettings): number {
  let score = 0;
  if (habit.reading) score += settings.reading || 0;
  if (habit.documentary) score += settings.documentary || 0;
  score += (habit.learning_minutes || 0) * (settings.learning_minutes || 0);
  return score;
}

export function calculateAllScores(
  habit: Partial<DailyHabit>,
  settings: ScoringSettings
): {
  habit_score: number;
  work_score: number;
  business_score: number;
  learning_score: number;
  total_score: number;
} {
  const habit_score = calculateHabitScore(habit, settings);
  const work_score = calculateWorkScore(habit, settings);
  const business_score = calculateBusinessScore(habit, settings);
  const learning_score = calculateLearningScore(habit, settings);
  const total_score = habit_score + work_score + business_score + learning_score;

  return {
    habit_score: Math.round(habit_score * 100) / 100,
    work_score: Math.round(work_score * 100) / 100,
    business_score: Math.round(business_score * 100) / 100,
    learning_score: Math.round(learning_score * 100) / 100,
    total_score: Math.round(total_score * 100) / 100,
  };
}

export function getScoreLevel(totalScore: number): 'low' | 'medium' | 'high' | 'excellent' {
  if (totalScore >= 80) return 'excellent';
  if (totalScore >= 50) return 'high';
  if (totalScore >= 25) return 'medium';
  return 'low';
}

export function getScoreColor(level: string): string {
  switch (level) {
    case 'excellent': return 'text-emerald-400';
    case 'high': return 'text-indigo-400';
    case 'medium': return 'text-amber-400';
    default: return 'text-gray-400';
  }
}
