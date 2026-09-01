import { DailyHabit, ScoringSettings, CustomHabit, HabitTargets, DEFAULT_HABIT_TARGETS } from '@/types';

/**
 * Calcul du taux de complétion quotidien des habitudes en pourcentage (0% à 100%).
 * 50% attribués aux habitudes de routine et 50% attribués aux habitudes business (basés sur leurs quotas).
 */
export function calculateRoutineCompletionPercentage(
  habitData: Partial<DailyHabit>,
  activeHabitKeys: string[] = [],
  customHabits: CustomHabit[] = [],
  habitTargets: HabitTargets = DEFAULT_HABIT_TARGETS
): {
  percentage: number;
  completedCount: number;
  totalTracked: number;
} {
  const ALL_BOOLEAN = ['bible', 'prayer', 'meditation', 'reading', 'documentary', 'sport', 'light_work', 'deep_work', 'after_work'] as const;
  const ALL_NUMERIC = ['prospects_contacted', 'calls_made', 'content_published', 'client_projects', 'learning_minutes'] as const;

  // Active routine / boolean habits (built-in + custom boolean)
  const activeBooleans = ALL_BOOLEAN.filter(k => activeHabitKeys.includes(k));
  const customBooleans = customHabits.filter(h => h.type === 'boolean');
  const totalRoutineHabitsCount = activeBooleans.length + customBooleans.length;

  // Active business / numeric habits (built-in + custom numeric)
  const activeNumerics = ALL_NUMERIC.filter(k => activeHabitKeys.includes(k));
  const customNumerics = customHabits.filter(h => h.type === 'numeric');
  const totalBusinessHabitsCount = activeNumerics.length + customNumerics.length;

  let completedCount = 0;
  let routineScoreContribution = 0; // Out of 50%
  let businessScoreContribution = 0; // Out of 50%

  // 1. Calculate Routine / Boolean Habits Contribution (50% max)
  if (totalRoutineHabitsCount > 0) {
    const weightPerRoutine = 50 / totalRoutineHabitsCount;

    activeBooleans.forEach(k => {
      if (habitData[k]) {
        completedCount += 1;
        routineScoreContribution += weightPerRoutine;
      }
    });

    const customLogs = habitData.custom_logs || {};
    customBooleans.forEach(h => {
      if (customLogs[h.id]) {
        completedCount += 1;
        routineScoreContribution += weightPerRoutine;
      }
    });
  }

  // 2. Calculate Business / Numeric Habits Contribution based on Quotas (50% max)
  if (totalBusinessHabitsCount > 0) {
    const weightPerBusiness = 50 / totalBusinessHabitsCount;

    activeNumerics.forEach(k => {
      const rawVal = habitData[k];
      const val = typeof rawVal === 'number' ? rawVal : (parseFloat(String(rawVal || 0)) || 0);
      const target = habitTargets[k] || DEFAULT_HABIT_TARGETS[k] || 1;
      
      const ratio = Math.min(1.0, val / target);
      businessScoreContribution += ratio * weightPerBusiness;

      if (val >= target) {
        completedCount += 1;
      }
    });

    const customLogs = habitData.custom_logs || {};
    customNumerics.forEach(h => {
      const rawVal = customLogs[h.id];
      const val = typeof rawVal === 'number' ? rawVal : (parseFloat(String(rawVal || 0)) || 0);
      const target = h.target_quantity || habitTargets[h.id] || 1;

      const ratio = Math.min(1.0, val / target);
      businessScoreContribution += ratio * weightPerBusiness;

      if (val >= target) {
        completedCount += 1;
      }
    });
  }

  // Final percentage scaling
  let finalPercentage = 0;
  if (totalRoutineHabitsCount > 0 && totalBusinessHabitsCount > 0) {
    finalPercentage = routineScoreContribution + businessScoreContribution;
  } else if (totalRoutineHabitsCount > 0) {
    finalPercentage = (routineScoreContribution / 50) * 100;
  } else if (totalBusinessHabitsCount > 0) {
    finalPercentage = (businessScoreContribution / 50) * 100;
  }

  const totalTracked = totalRoutineHabitsCount + totalBusinessHabitsCount;
  const percentage = Math.min(100, Math.round(finalPercentage));

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

/**
 * Messages motivants, chaleureux et amicals selon le pourcentage de complétion quotidien
 */
export function getMotivationalStatusBadge(percentage: number): {
  text: string;
  bg: string;
  color: string;
  border: string;
} {
  if (percentage >= 100) {
    return {
      text: 'You are the Master ! 👑',
      bg: 'rgba(14,159,110,0.15)',
      color: '#0E9F6E',
      border: '1px solid rgba(14,159,110,0.35)',
    };
  }
  if (percentage >= 80) {
    return {
      text: 'Termine la course... 🏁',
      bg: 'rgba(214,179,106,0.15)',
      color: '#D6B36A',
      border: '1px solid rgba(214,179,106,0.35)',
    };
  }
  if (percentage >= 50) {
    return {
      text: 'Tu peux le faire 💪',
      bg: 'var(--accent-subtle)',
      color: 'var(--accent)',
      border: '1px solid var(--accent-border)',
    };
  }
  if (percentage >= 25) {
    return {
      text: 'Ahaa, Te revoilà ! 👋',
      bg: 'var(--bg-card-hover)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    };
  }
  return {
    text: 'À vos marques 🚀',
    bg: 'var(--bg-card-hover)',
    color: 'var(--text-tertiary)',
    border: '1px solid var(--border)',
  };
}
