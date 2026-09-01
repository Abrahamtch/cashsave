// ============================================
// Cash Save — Types TypeScript
// ============================================

export type OnboardingStatus = 'not_started' | 'skipped' | 'partial' | 'completed';
export type RoutineStatus = 'regular' | 'irregular' | 'none';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  trial_start_date: string;
  is_premium: boolean;
  premium_expires_at: string | null;
  scoring_settings: ScoringSettings;
  onboarding_status?: OnboardingStatus;
  routine_status?: RoutineStatus;
  initial_balance_total?: number;
  created_at: string;
  updated_at: string;
}

export type InitialBalanceSource = 'tmoney' | 'flooz' | 'banque' | 'especes' | 'portefeuille_en_ligne' | 'autre';

export interface InitialBalance {
  id: string;
  user_id: string;
  source_type: InitialBalanceSource;
  source_label?: string;
  amount: number;
  created_at: string;
}

export interface UserHabitPreference {
  id: string;
  user_id: string;
  habit_key: string;
  is_active: boolean;
  created_at: string;
}

export interface ScoringSettings {
  bible: number;
  prayer: number;
  meditation: number;
  reading: number;
  documentary: number;
  sport: number;
  light_work: number;
  deep_work: number;
  after_work: number;
  prospects_contacted: number;
  calls_made: number;
  content_published: number;
  client_projects: number;
  learning_minutes: number;
}

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  bible: 3,
  prayer: 3,
  meditation: 3,
  reading: 4,
  documentary: 2,
  sport: 5,
  light_work: 2,
  deep_work: 5,
  after_work: 3,
  prospects_contacted: 2,
  calls_made: 3,
  content_published: 4,
  client_projects: 5,
  learning_minutes: 0.1,
};

export interface HabitTargets {
  prospects_contacted?: number;
  calls_made?: number;
  content_published?: number;
  client_projects?: number;
  learning_minutes?: number;
  [key: string]: number | undefined;
}

export const DEFAULT_HABIT_TARGETS: HabitTargets = {
  prospects_contacted: 10,
  calls_made: 5,
  content_published: 2,
  client_projects: 3,
  learning_minutes: 30,
};

export type HabitType = 'boolean' | 'numeric';
export type HabitAxis = 'esprit' | 'sante' | 'focus' | 'business';

export interface CustomHabit {
  id: string;
  user_id: string;
  title: string;
  axis: HabitAxis;
  type: HabitType;
  icon?: string;
  target_quantity?: number;
  is_active: boolean;
  created_at: string;
}

export interface DailyHabit {
  id: string;
  user_id: string;
  date: string;
  // Booléens
  bible: boolean;
  prayer: boolean;
  meditation: boolean;
  reading: boolean;
  documentary: boolean;
  sport: boolean;
  light_work: boolean;
  deep_work: boolean;
  after_work: boolean;
  // Numériques
  prospects_contacted: number;
  calls_made: number;
  content_published: number;
  client_projects: number;
  learning_minutes: number;
  // Logs personnalisés
  custom_logs?: Record<string, boolean | number>;
  // Texte
  comments: string;
  progression: string;
  // Scores
  habit_score: number;
  work_score: number;
  business_score: number;
  learning_score: number;
  total_score: number;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note: string;
  is_satisfied: boolean | null;
  image_url?: string | null;
  created_at: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export type ObjectiveStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export interface Objective {
  id: string;
  user_id: string;
  title: string;
  deadline: string | null;
  target_amount?: number;
  allocated_budget?: number;
  progress: number;
  status: ObjectiveStatus;
  created_at: string;
  updated_at: string;
}

// Catégories prédéfinies
export const INCOME_CATEGORIES = [
  'Salaire',
  'Freelance',
  'Investissement',
  'Cadeau',
  'Vente',
  'Autre',
] as const;

export const EXPENSE_CATEGORIES = [
  'Alimentation',
  'Transport',
  'Logement',
  'Santé',
  'Éducation',
  'Loisirs',
  'Vêtements',
  'Factures',
  'Communication',
  'Autre',
] as const;

// Labels pour l'interface
export const HABIT_LABELS: Record<string, string> = {
  bible: 'Bible',
  prayer: 'Prière',
  meditation: 'Méditation',
  reading: 'Lecture',
  documentary: 'Documentaire',
  sport: 'Sport',
  light_work: 'Light Work',
  deep_work: 'Deep Work',
  after_work: 'After Work',
};

export const NUMERIC_HABIT_LABELS: Record<string, string> = {
  prospects_contacted: 'Prospects contactés',
  calls_made: 'Appels réalisés',
  content_published: 'Contenu publié',
  client_projects: 'Projets client',
  learning_minutes: 'Minutes d\'apprentissage',
};

export const PRIORITY_CONFIG = {
  LOW: { label: 'Basse', color: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-400' },
  MEDIUM: { label: 'Moyenne', color: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-400' },
  HIGH: { label: 'Haute', color: 'bg-rose-500/20 text-rose-400', dot: 'bg-rose-400' },
} as const;

export const STATUS_CONFIG = {
  TODO: { label: 'À faire', color: 'bg-gray-500/20 text-gray-400' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-indigo-500/20 text-indigo-400' },
  DONE: { label: 'Terminé', color: 'bg-emerald-500/20 text-emerald-400' },
} as const;
