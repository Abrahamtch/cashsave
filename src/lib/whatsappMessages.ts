/**
 * Cash Save — Messages WhatsApp Personnalisés (Production)
 *
 * Génère des messages WhatsApp dynamiques basés sur les données
 * réelles de chaque utilisateur (streak, score, dépenses, etc.)
 */

export interface WhatsAppMessageContext {
  userName: string;
  currentStreak: number;
  yesterdayScore: number;
  weeklyAverage: number;
  weekExpenses: number;
  weekIncome: number;
  totalActiveHabits: number;
  completedHabitsYesterday: number;
}

// ─── Pool de Messages Motivants ─────────────────────────────────
const MOTIVATIONAL_CLOSINGS = [
  'Prends 2 min pour ton bilan du soir 💪',
  'Ta discipline fait la différence 🏆',
  'Les gagnants tracent chaque jour 📈',
  'Chaque jour compte. Celui-ci aussi 🔥',
  'Ta version future te remerciera ⭐',
  'La constance bat le talent. Toujours 💎',
  'Ton futur toi sera fier de ce moment 🚀',
];

const STREAK_DANGER_MESSAGES = [
  '⚠️ Ta streak de {streak} jours est en danger !',
  '🚨 {streak} jours de suite — ne casse pas la chaîne !',
  '💥 Attention ! Ta série de {streak}j va être perdue !',
];

const ZERO_STREAK_MESSAGES = [
  "C'est le moment de recommencer une nouvelle série ! 🌱",
  'Nouveau départ, nouvelle énergie ! 💫',
  'Chaque grande streak commence par le jour 1 🏁',
];

const HIGH_SCORE_CELEBRATIONS = [
  '🎉 Score d\'hier : {score}/100 — Impressionnant !',
  '🔥 {score}/100 hier — Tu es en feu !',
  '⚡ {score} points hier — Continue comme ça !',
];

const LOW_SCORE_ENCOURAGEMENTS = [
  '📊 Score d\'hier : {score}/100 — Tu peux faire mieux aujourd\'hui !',
  '💡 {score}/100 hier — Chaque jour est une nouvelle chance !',
  '🎯 Score hier : {score} — Vise plus haut ce soir !',
];

// ─── Formater un montant en FCFA ────────────────────────────────
function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

// ─── Sélectionner un message aléatoire ──────────────────────────
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Générer le Message WhatsApp Personnalisé ───────────────────
export function generateSmartWhatsAppMessage(context: WhatsAppMessageContext): string {
  const firstName = context.userName?.split(' ')[0] || 'Champion';
  const lines: string[] = [];

  // Greeting
  const hour = new Date().getHours();
  if (hour < 14) {
    lines.push(`Salut ${firstName} ! 👋`);
  } else if (hour < 19) {
    lines.push(`Hey ${firstName} ! 💪`);
  } else {
    lines.push(`Bonsoir ${firstName} ! 🌙`);
  }
  lines.push('');

  // Streak section
  if (context.currentStreak > 0) {
    const streakMsg = pickRandom(STREAK_DANGER_MESSAGES).replace('{streak}', String(context.currentStreak));
    lines.push(streakMsg);
  } else {
    lines.push(pickRandom(ZERO_STREAK_MESSAGES));
  }

  // Score section
  if (context.yesterdayScore > 0) {
    if (context.yesterdayScore >= 60) {
      const scoreMsg = pickRandom(HIGH_SCORE_CELEBRATIONS).replace('{score}', String(context.yesterdayScore));
      lines.push(scoreMsg);
    } else {
      const scoreMsg = pickRandom(LOW_SCORE_ENCOURAGEMENTS).replace('{score}', String(context.yesterdayScore));
      lines.push(scoreMsg);
    }
  }

  // Financial summary (if data exists)
  if (context.weekExpenses > 0 || context.weekIncome > 0) {
    lines.push('');
    if (context.weekExpenses > 0 && context.weekIncome > 0) {
      lines.push(`💰 Cette semaine : ${formatCFA(context.weekExpenses)} dépensés sur ${formatCFA(context.weekIncome)} de revenus.`);
    } else if (context.weekExpenses > 0) {
      lines.push(`💰 Cette semaine : ${formatCFA(context.weekExpenses)} dépensés.`);
    } else {
      lines.push(`💰 Cette semaine : ${formatCFA(context.weekIncome)} de revenus enregistrés.`);
    }
  }

  // Habits reminder
  if (context.totalActiveHabits > 0) {
    lines.push('');
    lines.push(`📋 Tu as ${context.totalActiveHabits} habitudes à valider aujourd'hui.`);
  }

  // Closing
  lines.push('');
  lines.push(pickRandom(MOTIVATIONAL_CLOSINGS));
  lines.push('👉 cashsave.app');

  return lines.join('\n');
}

// ─── Générer le message pour un profil Supabase ─────────────────
export function generateMessageFromProfileData(profile: {
  full_name?: string;
  currentStreak?: number;
  yesterdayScore?: number;
  weeklyAverage?: number;
  weekExpenses?: number;
  weekIncome?: number;
  totalActiveHabits?: number;
  completedHabitsYesterday?: number;
}): string {
  return generateSmartWhatsAppMessage({
    userName: profile.full_name || 'Champion',
    currentStreak: profile.currentStreak || 0,
    yesterdayScore: profile.yesterdayScore || 0,
    weeklyAverage: profile.weeklyAverage || 0,
    weekExpenses: profile.weekExpenses || 0,
    weekIncome: profile.weekIncome || 0,
    totalActiveHabits: profile.totalActiveHabits || 0,
    completedHabitsYesterday: profile.completedHabitsYesterday || 0,
  });
}

// ─── Messages de Notification Push (pour le cron) ───────────────
export function generatePushNotificationContent(context: WhatsAppMessageContext): {
  title: string;
  body: string;
} {
  const firstName = context.userName?.split(' ')[0] || 'Champion';

  if (context.currentStreak > 5) {
    return {
      title: `🔥 Streak de ${context.currentStreak}j en danger !`,
      body: `${firstName}, ne casse pas ta série ! Prends 2 min pour Cash Save.`,
    };
  }

  if (context.yesterdayScore >= 60) {
    return {
      title: `⚡ ${context.yesterdayScore}/100 hier — Continue !`,
      body: `${firstName}, tu étais en feu hier. Bats ton score ce soir !`,
    };
  }

  if (context.currentStreak > 0) {
    return {
      title: `📊 Rappel Cash Save`,
      body: `${firstName}, ta streak de ${context.currentStreak}j t'attend. Note tes habitudes !`,
    };
  }

  const bodies = [
    `${firstName}, as-tu noté tes dépenses et habitudes aujourd'hui ?`,
    `${firstName}, 2 minutes pour ton bilan du soir !`,
    `${firstName}, ta discipline commence ici. Ouvre Cash Save !`,
  ];

  return {
    title: '📋 Bilan du soir — Cash Save',
    body: pickRandom(bodies),
  };
}
