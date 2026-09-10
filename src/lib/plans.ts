// ============================================
// Cash Save — Plans & Limits Module
// ============================================
import { Profile, Transaction } from '@/types';
import { format } from 'date-fns';

// ─── Free Tier Limits ───────────────────────────
export const FREE_LIMITS = {
  MAX_TRANSACTIONS_PER_DAY: 3,
  MAX_EXPENSES_PER_DAY: 2,
  MAX_INCOMES_PER_DAY: 1,
  MAX_ACTIVE_TASKS: 10,
  MAX_ACTIVE_OBJECTIVES: 5,
  MAX_ACTIVE_HABITS: 5,           // standard + custom combined (Track My Cash excluded)
  MAX_CUSTOM_HABITS: 3,
  CHART_MAX_PERIOD: 7,            // days
  FINANCIAL_OBJECTIVES: true,
  NUMERIC_HABITS: false,
  DRAG_AND_DROP_TASKS: false,
  RECEIPT_PHOTOS: false,
  SATISFACTION_FEEDBACK: false,
  ADVANCED_CHARTS: false,
  OBJECTIVE_PROGRESS_BAR_LIMIT: 1, // only 1st objective shows progress bar
} as const;

// ─── Pricing ────────────────────────────────────
export const PRICING = {
  STANDARD_MONTHLY: 3000,
  BONUS_MONTHLY: 1000,
  BONUS_MONTHS: 3,
  TRIAL_DAYS: 7,
  TRIAL_PROMPT_INTERVAL: 5,       // every 5 active days
} as const;

// ─── Premium Status Check ───────────────────────
export function isPremiumActive(profile: Profile | null): boolean {
  if (!profile) return false;
  if (!profile.is_premium) return false;
  if (profile.premium_expires_at) {
    return new Date(profile.premium_expires_at) > new Date();
  }
  return true;
}

// ─── Trial 7-day Check ──────────────────────────
export function isTrialActive(profile: Profile | null): boolean {
  if (!profile) return false;
  if (!profile.trial_7d_start) return false;
  const trialEnd = new Date(profile.trial_7d_start);
  trialEnd.setDate(trialEnd.getDate() + PRICING.TRIAL_DAYS);
  return new Date() < trialEnd;
}

export function hasUsedTrial(profile: Profile | null): boolean {
  if (!profile) return false;
  return !!profile.trial_7d_used;
}

export function shouldShowTrialPrompt(profile: Profile | null): boolean {
  if (!profile) return false;
  if (isPremiumActive(profile)) return false;
  if (hasUsedTrial(profile)) return false;
  if (isTrialActive(profile)) return false;
  
  const activeDays = profile.active_days_count || 0;
  const lastPromptDay = profile.last_trial_prompt_day || 0;
  
  // Show every 5 active days
  if (activeDays >= PRICING.TRIAL_PROMPT_INTERVAL && 
      activeDays - lastPromptDay >= PRICING.TRIAL_PROMPT_INTERVAL) {
    return true;
  }
  return false;
}

export const shouldTrigger7DayTrialPrompt = shouldShowTrialPrompt;

// ─── Feature Access Check ───────────────────────
export function hasFeature(profile: Profile | null, feature: keyof typeof FREE_LIMITS): boolean {
  if (isPremiumActive(profile) || isTrialActive(profile)) return true;
  const value = FREE_LIMITS[feature];
  return typeof value === 'boolean' ? value : true;
}

// ─── Transaction Limit Check ────────────────────
export function getTransactionQuota(
  profile: Profile | null, 
  transactions: Transaction[], 
  type: 'INCOME' | 'EXPENSE'
): { remaining: number; limit: number; reached: boolean } {
  if (isPremiumActive(profile) || isTrialActive(profile)) {
    return { remaining: Infinity, limit: Infinity, reached: false };
  }
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayTx = transactions.filter(t => t.date === today);
  const todayByType = todayTx.filter(t => t.type === type);
  const totalToday = todayTx.length;
  
  const typeLimit = type === 'EXPENSE' 
    ? FREE_LIMITS.MAX_EXPENSES_PER_DAY 
    : FREE_LIMITS.MAX_INCOMES_PER_DAY;
  
  const totalLimitReached = totalToday >= FREE_LIMITS.MAX_TRANSACTIONS_PER_DAY;
  const typeLimitReached = todayByType.length >= typeLimit;
  const reached = totalLimitReached || typeLimitReached;
  
  const remainingTotal = Math.max(0, FREE_LIMITS.MAX_TRANSACTIONS_PER_DAY - totalToday);
  const remainingType = Math.max(0, typeLimit - todayByType.length);
  const remaining = Math.min(remainingTotal, remainingType);
  
  return { remaining, limit: typeLimit, reached };
}

// ─── Generic Count Limit Check ──────────────────
export function getCountQuota(
  profile: Profile | null,
  currentCount: number,
  limitKey: 'MAX_ACTIVE_TASKS' | 'MAX_ACTIVE_OBJECTIVES' | 'MAX_ACTIVE_HABITS' | 'MAX_CUSTOM_HABITS'
): { remaining: number; limit: number; reached: boolean } {
  if (isPremiumActive(profile) || isTrialActive(profile)) {
    return { remaining: Infinity, limit: Infinity, reached: false };
  }
  const limit = FREE_LIMITS[limitKey];
  const remaining = Math.max(0, limit - currentCount);
  return { remaining, limit, reached: remaining <= 0 };
}

// ─── Objective Progress Bar Access ──────────────
export function canShowProgressBar(
  profile: Profile | null, 
  objectiveIndex: number
): boolean {
  if (isPremiumActive(profile) || isTrialActive(profile)) return true;
  return objectiveIndex < FREE_LIMITS.OBJECTIVE_PROGRESS_BAR_LIMIT;
}

// ─── Current Price Calculation ──────────────────
export function getCurrentPrice(profile: Profile | null): number {
  if (!profile?.first_premium_date) return PRICING.BONUS_MONTHLY; // First time = bonus price
  const monthsPaid = profile.subscription_months_count || 0;
  if (monthsPaid < PRICING.BONUS_MONTHS) return PRICING.BONUS_MONTHLY;
  return PRICING.STANDARD_MONTHLY;
}

// ─── Chart Period Limit ─────────────────────────
export function getMaxChartPeriod(profile: Profile | null): number {
  if (isPremiumActive(profile) || isTrialActive(profile)) return 365;
  return FREE_LIMITS.CHART_MAX_PERIOD;
}
