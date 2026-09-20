'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, Wallet, Target, CheckSquare, ListTodo,
  ArrowRight, ChevronRight, Crown, Check, Lock,
  Sun, Moon, Globe, TrendingUp, Shield, Zap,
  BarChart3, Clock, Award, Users, Star
} from 'lucide-react';

/* ─────────────────────────────────────────────
   BILINGUAL CONTENT
   ───────────────────────────────────────────── */
const content = {
  fr: {
    nav: { login: 'Se connecter', cta: 'Commencer gratuitement' },
    hero: {
      tagline: 'Gestion financière & Discipline personnelle',
      headline: 'Tout ce qui ne se mesure pas\nne s\'améliore pas.',
      sub: 'Commencez par mesurer vos finances et vos habitudes pour améliorer votre vie. Cash Save réunit trésorerie, objectifs, habitudes et productivité dans un seul outil premium.',
      cta: 'Commencer gratuitement',
      ctaSub: 'Essai 7 jours · Sans engagement',
    },
    problem: {
      title: 'Le problème que vous connaissez',
      items: [
        { pain: 'Vous ne savez pas exactement où part votre argent.', fix: 'Trésorerie catégorisée en temps réel' },
        { pain: 'Vos bonnes habitudes ne tiennent jamais.', fix: 'Suivi quotidien avec scoring de discipline' },
        { pain: 'Vos objectifs financiers restent des vœux pieux.', fix: 'Allocation budgétaire avec garde-fous stricts' },
        { pain: 'Votre productivité est imprévisible.', fix: 'Kanban + métriques de travail intégrés' },
      ],
      before: 'Avant',
      after: 'Avec Cash Save',
    },
    pillars: {
      title: 'Cinq piliers. Un seul outil.',
      sub: 'Chaque module est conçu pour fonctionner ensemble, créant un écosystème cohérent de progression personnelle.',
      modules: [
        { icon: 'Wallet', name: 'My Cash', desc: 'Registre financier complet avec solde net en temps réel, catégorisation des revenus et dépenses, et analyse de tendances.' },
        { icon: 'Target', name: 'My Objectives', desc: 'Définissez des objectifs financiers avec allocation budgétaire. Le système interdit structurellement toute fausse illusion de trésorerie.' },
        { icon: 'CheckSquare', name: 'My Habits', desc: '14 indicateurs de discipline personnelle — esprit, santé, focus, business — suivis quotidiennement avec séries et streaks.' },
        { icon: 'ListTodo', name: 'My Tasks', desc: 'Kanban visuel avec drag & drop, priorités colorées et boutons de statut directs pour une gestion de tâches fluide.' },
        { icon: 'LayoutDashboard', name: 'Dashboard', desc: 'Score de discipline global, graphiques de tendances, répartition des dépenses et vue d\'ensemble en un coup d\'œil.' },
      ],
    },
    score: {
      title: 'Votre succès se mesure au quotidien.',
      sub: 'Le Score de Discipline Cash Save est la fusion unique de vos habitudes, de votre rigueur financière et de votre productivité en un seul chiffre.',
      formula: [
        { pct: '40%', label: 'Habitudes', desc: 'Exécution des 14 indicateurs quotidiens' },
        { pct: '40%', label: 'Trésorerie', desc: 'Solde net, rentabilité et maîtrise' },
        { pct: '20%', label: 'Tâches', desc: 'Complétion des objectifs Kanban' },
      ],
    },
    experience: {
      title: 'Conçu avec exigence.',
      sub: 'Chaque détail de Cash Save a été pensé pour offrir une expérience premium et fonctionnelle.',
      features: [
        { icon: 'Moon', title: 'Mode Obsidian', desc: 'Un mode sombre immersif et luxueux qui réduit la fatigue visuelle.' },
        { icon: 'Sun', title: 'Mode Warm Stone', desc: 'Un mode clair chaleureux et sophistiqué pour une utilisation en journée.' },
        { icon: 'Zap', title: 'Latence 0ms', desc: 'Mise à jour synchrone instantanée via stockage local, synchronisation en arrière-plan.' },
        { icon: 'Shield', title: 'Garde-fous financiers', desc: 'Impossibilité structurelle d\'allouer plus que votre solde net disponible.' },
      ],
    },
    social: {
      title: 'Conçu pour les personnes exigeantes',
      stats: [
        { value: '14', label: 'indicateurs de discipline suivis quotidiennement' },
        { value: '5', label: 'modules intégrés dans un seul écosystème' },
        { value: '0ms', label: 'de latence ressentie sur chaque action' },
        { value: '100', label: 'points de score de discipline à atteindre' },
      ],
      testimonials: [
        { name: 'Koffi A.', role: 'Entrepreneur, Lomé', text: 'Cash Save a transformé ma relation avec l\'argent. Le score de discipline me pousse à être meilleur chaque jour.' },
        { name: 'Aïcha M.', role: 'Cadre, Cotonou', text: 'Enfin un outil qui comprend que la finance et les habitudes sont liées. Interface magnifique, fonctionnalités précises.' },
        { name: 'Samuel D.', role: 'Freelance, Douala', text: 'Le garde-fou budgétaire m\'a empêché de faire des erreurs. Simple, élégant, efficace.' },
      ],
    },
    pricing: {
      title: 'Investissez dans votre discipline',
      sub: 'Choisissez la formule adaptée à vos ambitions.',
      toggle: { monthly: 'Mensuel', annual: 'Annuel' },
      free: {
        name: 'Découverte',
        price: '0 FCFA',
        period: '/ mois',
        desc: 'Sans limite de durée',
        features: [
          '3 transactions par jour',
          '10 tâches actives',
          '5 objectifs actifs',
          '5 habitudes suivies',
          'Historique sur 7 jours',
        ],
        cta: 'Commencer gratuitement',
      },
      premium: {
        name: 'Premium',
        badge: 'Recommandé',
        monthly: { price: '1 000 FCFA', crossed: '3 000 FCFA', period: '/ mois', note: 'Tarif spécial les 3 premiers mois' },
        annual: { price: '28 800 FCFA', crossed: '36 000 FCFA', period: '/ an', note: 'soit 2 400 FCFA / mois' },
        discount: '-20%',
        features: [
          'Transactions illimitées',
          'Kanban illimité avec drag & drop',
          'Objectifs financiers avec allocation',
          'Habitudes numériques avancées',
          'Graphiques d\'analyse sans restriction',
          'Scans de reçu photo',
        ],
        cta: 'Passer au Premium',
      },
      security: 'Paiement sécurisé via Maketou (Flooz, TMoney, MoMo, Carte)',
      cancel: 'Sans engagement · Annulation à tout moment',
    },
    final: {
      title: 'Reprenez le contrôle.\nAujourd\'hui.',
      sub: 'Commencez à mesurer pour commencer à progresser.',
      cta: 'Créer mon compte gratuitement',
    },
    footer: {
      copy: '© 2026 Digital Influence Marketing SARL U. Tous droits réservés.',
      links: { login: 'Connexion', register: 'Inscription', legal: 'Mentions légales' },
    },
  },
  en: {
    nav: { login: 'Sign in', cta: 'Get started free' },
    hero: {
      tagline: 'Financial Management & Personal Discipline',
      headline: 'What gets measured\ngets improved.',
      sub: 'Start measuring your finances and habits to improve your life. Cash Save combines cash tracking, goals, habits and productivity in one premium tool.',
      cta: 'Get started free',
      ctaSub: '7-day trial · No commitment',
    },
    problem: {
      title: 'The problem you know',
      items: [
        { pain: 'You don\'t know exactly where your money goes.', fix: 'Real-time categorized cash tracking' },
        { pain: 'Your good habits never stick.', fix: 'Daily tracking with discipline scoring' },
        { pain: 'Your financial goals remain wishful thinking.', fix: 'Budget allocation with strict safeguards' },
        { pain: 'Your productivity is unpredictable.', fix: 'Integrated Kanban + work metrics' },
      ],
      before: 'Before',
      after: 'With Cash Save',
    },
    pillars: {
      title: 'Five pillars. One tool.',
      sub: 'Each module is designed to work together, creating a cohesive ecosystem for personal progress.',
      modules: [
        { icon: 'Wallet', name: 'My Cash', desc: 'Complete financial register with real-time net balance, income & expense categorization, and trend analysis.' },
        { icon: 'Target', name: 'My Objectives', desc: 'Set financial goals with budget allocation. The system structurally prevents any false illusion of available cash.' },
        { icon: 'CheckSquare', name: 'My Habits', desc: '14 personal discipline indicators — mind, health, focus, business — tracked daily with streaks.' },
        { icon: 'ListTodo', name: 'My Tasks', desc: 'Visual Kanban with drag & drop, color-coded priorities and direct status buttons for fluid task management.' },
        { icon: 'LayoutDashboard', name: 'Dashboard', desc: 'Global discipline score, trend charts, expense breakdown and a complete overview at a glance.' },
      ],
    },
    score: {
      title: 'Your success is measured daily.',
      sub: 'The Cash Save Discipline Score uniquely fuses your habits, financial rigor and productivity into a single number.',
      formula: [
        { pct: '40%', label: 'Habits', desc: 'Execution of 14 daily indicators' },
        { pct: '40%', label: 'Cash', desc: 'Net balance, profitability & control' },
        { pct: '20%', label: 'Tasks', desc: 'Kanban objectives completion' },
      ],
    },
    experience: {
      title: 'Crafted with precision.',
      sub: 'Every detail of Cash Save is designed to deliver a premium, functional experience.',
      features: [
        { icon: 'Moon', title: 'Obsidian Mode', desc: 'An immersive, luxurious dark mode that reduces eye strain.' },
        { icon: 'Sun', title: 'Warm Stone Mode', desc: 'A warm, sophisticated light mode for daytime use.' },
        { icon: 'Zap', title: '0ms Latency', desc: 'Instant synchronous updates via local storage, background sync.' },
        { icon: 'Shield', title: 'Financial Safeguards', desc: 'Structurally impossible to allocate more than your available net balance.' },
      ],
    },
    social: {
      title: 'Built for ambitious people',
      stats: [
        { value: '14', label: 'discipline indicators tracked daily' },
        { value: '5', label: 'modules integrated in one ecosystem' },
        { value: '0ms', label: 'perceived latency on every action' },
        { value: '100', label: 'discipline score points to achieve' },
      ],
      testimonials: [
        { name: 'Koffi A.', role: 'Entrepreneur, Lomé', text: 'Cash Save transformed my relationship with money. The discipline score pushes me to be better every day.' },
        { name: 'Aïcha M.', role: 'Executive, Cotonou', text: 'Finally a tool that understands finance and habits are linked. Beautiful interface, precise features.' },
        { name: 'Samuel D.', role: 'Freelancer, Douala', text: 'The budget safeguard saved me from making mistakes. Simple, elegant, effective.' },
      ],
    },
    pricing: {
      title: 'Invest in your discipline',
      sub: 'Choose the plan that fits your ambitions.',
      toggle: { monthly: 'Monthly', annual: 'Annual' },
      free: {
        name: 'Starter',
        price: '0 FCFA',
        period: '/ month',
        desc: 'No time limit',
        features: [
          '3 transactions per day',
          '10 active tasks',
          '5 active objectives',
          '5 habits tracked',
          '7-day history',
        ],
        cta: 'Get started free',
      },
      premium: {
        name: 'Premium',
        badge: 'Recommended',
        monthly: { price: '1,000 FCFA', crossed: '3,000 FCFA', period: '/ month', note: 'Special rate for the first 3 months' },
        annual: { price: '28,800 FCFA', crossed: '36,000 FCFA', period: '/ year', note: 'i.e. 2,400 FCFA / month' },
        discount: '-20%',
        features: [
          'Unlimited transactions',
          'Unlimited Kanban with drag & drop',
          'Financial goals with allocation',
          'Advanced numeric habits',
          'Unrestricted analytics charts',
          'Receipt photo scans',
        ],
        cta: 'Go Premium',
      },
      security: 'Secure payment via Maketou (Flooz, TMoney, MoMo, Card)',
      cancel: 'No commitment · Cancel anytime',
    },
    final: {
      title: 'Take back control.\nToday.',
      sub: 'Start measuring to start progressing.',
      cta: 'Create my free account',
    },
    footer: {
      copy: '© 2026 Digital Influence Marketing SARL U. All rights reserved.',
      links: { login: 'Sign in', register: 'Sign up', legal: 'Legal' },
    },
  },
};

/* ─────────────────────────────────────────────
   ICON MAP
   ───────────────────────────────────────────── */
const iconMap: Record<string, React.ElementType> = {
  Wallet, Target, CheckSquare, ListTodo, LayoutDashboard,
  Moon, Sun, Zap, Shield,
};

/* ─────────────────────────────────────────────
   SCROLL REVEAL HOOK
   ───────────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ─────────────────────────────────────────────
   REVEAL WRAPPER
   ───────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ANIMATED COUNTER
   ───────────────────────────────────────────── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const { ref, visible } = useScrollReveal();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();
    function animate(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [visible, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ═════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═════════════════════════════════════════════ */
export default function LandingPage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const t = content[lang];

  /* ─── Theme toggle (independent from app) ─── */
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('cashsave-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved === 'light' ? 'light' : saved === 'dark' ? 'dark' : prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem('cashsave-theme', theme);
  }, [theme]);

  return (
    <div className="landing-page" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ══════════════════════════════════════
         NAVIGATION
         ══════════════════════════════════════ */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-mark gradient-primary">
              <TrendingUp size={18} color="#fff" strokeWidth={2.2} />
            </div>
            <span className="landing-logo-text">Cash Save</span>
          </div>

          <div className="landing-nav-actions">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
              className="landing-icon-btn"
              aria-label="Toggle language"
              title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
            >
              <Globe size={16} />
              <span className="landing-lang-label">{lang === 'fr' ? 'EN' : 'FR'}</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="landing-icon-btn"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link href="/auth/login" className="landing-nav-link" id="nav-login">
              {t.nav.login}
            </Link>
            <Link href="/auth/register" className="landing-nav-cta" id="nav-register">
              {t.nav.cta} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════
         SECTION 1 — HERO
         ══════════════════════════════════════ */}
      <section className="landing-hero" id="hero">
        <div className="landing-container">
          <div className="landing-hero-grid">
            <div className="landing-hero-content">
              <Reveal>
                <span className="landing-badge">
                  <TrendingUp size={13} />
                  {t.hero.tagline}
                </span>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="landing-hero-title">
                  {t.hero.headline.split('\n').map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="landing-hero-sub">{t.hero.sub}</p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="landing-hero-actions">
                  <Link href="/auth/register" className="btn-primary landing-hero-cta" id="hero-cta">
                    {t.hero.cta} <ArrowRight size={15} />
                  </Link>
                  <span className="landing-hero-ctasub">{t.hero.ctaSub}</span>
                </div>
              </Reveal>
            </div>
            <Reveal delay={0.2} className="landing-hero-visual">
              <div className="landing-mockup-frame">
                <img
                  src="/mockups/dashboard-dark.png"
                  alt="Cash Save Dashboard"
                  className="landing-mockup-img"
                  loading="eager"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         SECTION 2 — PROBLEM / SOLUTION
         ══════════════════════════════════════ */}
      <section className="landing-section" id="problem">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">{t.problem.title}</h2>
          </Reveal>
          <div className="landing-problem-grid">
            {t.problem.items.map((item, i) => (
              <Reveal key={i} delay={0.08 * (i + 1)}>
                <div className="landing-problem-card">
                  <div className="landing-problem-before">
                    <span className="landing-problem-label landing-problem-label--before">{t.problem.before}</span>
                    <p>{item.pain}</p>
                  </div>
                  <div className="landing-problem-divider">
                    <ChevronRight size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="landing-problem-after">
                    <span className="landing-problem-label landing-problem-label--after">{t.problem.after}</span>
                    <p>{item.fix}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         SECTION 3 — 5 PILLARS
         ══════════════════════════════════════ */}
      <section className="landing-section landing-section--alt" id="pillars">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">{t.pillars.title}</h2>
            <p className="landing-section-sub">{t.pillars.sub}</p>
          </Reveal>
          <div className="landing-pillars-grid">
            {t.pillars.modules.map((mod, i) => {
              const Icon = iconMap[mod.icon] || Wallet;
              return (
                <Reveal key={i} delay={0.06 * (i + 1)}>
                  <div className="landing-pillar-card">
                    <div className="landing-pillar-icon">
                      <Icon size={20} style={{ color: 'var(--accent)' }} />
                    </div>
                    <h3 className="landing-pillar-name">{mod.name}</h3>
                    <p className="landing-pillar-desc">{mod.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         SECTION 4 — DISCIPLINE SCORE (USP)
         ══════════════════════════════════════ */}
      <section className="landing-section" id="score">
        <div className="landing-container landing-score-section">
          <Reveal>
            <h2 className="landing-section-title">{t.score.title}</h2>
            <p className="landing-section-sub">{t.score.sub}</p>
          </Reveal>

          <div className="landing-score-grid">
            {/* Score visual */}
            <Reveal delay={0.1} className="landing-score-visual">
              <div className="landing-score-ring">
                <svg viewBox="0 0 120 120" className="landing-score-svg">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="var(--accent)" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52 * 0.78} ${2 * Math.PI * 52}`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </svg>
                <div className="landing-score-value">
                  <span className="landing-score-number"><Counter target={78} /></span>
                  <span className="landing-score-label">/100</span>
                </div>
              </div>
            </Reveal>

            {/* Formula breakdown */}
            <div className="landing-formula-list">
              {t.score.formula.map((f, i) => (
                <Reveal key={i} delay={0.1 * (i + 1)}>
                  <div className="landing-formula-item">
                    <span className="landing-formula-pct">{f.pct}</span>
                    <div>
                      <span className="landing-formula-name">{f.label}</span>
                      <span className="landing-formula-desc">{f.desc}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         SECTION 5 — PREMIUM EXPERIENCE
         ══════════════════════════════════════ */}
      <section className="landing-section landing-section--alt" id="experience">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">{t.experience.title}</h2>
            <p className="landing-section-sub">{t.experience.sub}</p>
          </Reveal>

          <div className="landing-experience-grid">
            <div className="landing-experience-features">
              {t.experience.features.map((feat, i) => {
                const Icon = iconMap[feat.icon] || Zap;
                return (
                  <Reveal key={i} delay={0.08 * (i + 1)}>
                    <div className="landing-exp-feature">
                      <div className="landing-exp-icon">
                        <Icon size={18} style={{ color: 'var(--accent)' }} />
                      </div>
                      <div>
                        <h4 className="landing-exp-title">{feat.title}</h4>
                        <p className="landing-exp-desc">{feat.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <Reveal delay={0.2} className="landing-experience-visual">
              <div className="landing-mockup-frame">
                <img
                  src="/mockups/habits-light.png"
                  alt="Cash Save Habits"
                  className="landing-mockup-img"
                  loading="lazy"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         SECTION 6 — SOCIAL PROOF
         ══════════════════════════════════════ */}
      <section className="landing-section" id="social">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">{t.social.title}</h2>
          </Reveal>

          {/* Stats */}
          <div className="landing-stats-grid">
            {t.social.stats.map((stat, i) => (
              <Reveal key={i} delay={0.08 * (i + 1)}>
                <div className="landing-stat">
                  <span className="landing-stat-value">{stat.value}</span>
                  <span className="landing-stat-label">{stat.label}</span>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Testimonials */}
          <div className="landing-testimonials-grid">
            {t.social.testimonials.map((test, i) => (
              <Reveal key={i} delay={0.1 * (i + 1)}>
                <div className="landing-testimonial">
                  <p className="landing-testimonial-text">&ldquo;{test.text}&rdquo;</p>
                  <div className="landing-testimonial-author">
                    <div className="landing-testimonial-avatar">
                      {test.name.charAt(0)}
                    </div>
                    <div>
                      <span className="landing-testimonial-name">{test.name}</span>
                      <span className="landing-testimonial-role">{test.role}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         SECTION 7 — PRICING
         ══════════════════════════════════════ */}
      <section className="landing-section landing-section--alt" id="pricing">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">{t.pricing.title}</h2>
            <p className="landing-section-sub">{t.pricing.sub}</p>
          </Reveal>

          {/* Toggle */}
          <Reveal delay={0.1}>
            <div className="landing-billing-toggle">
              <button
                onClick={() => setBilling('monthly')}
                className={`landing-billing-btn ${billing === 'monthly' ? 'landing-billing-btn--active' : ''}`}
              >
                {t.pricing.toggle.monthly}
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`landing-billing-btn ${billing === 'annual' ? 'landing-billing-btn--accent' : ''}`}
              >
                {t.pricing.toggle.annual}
                <span className="landing-discount-badge">{t.pricing.premium.discount}</span>
              </button>
            </div>
          </Reveal>

          {/* Plans */}
          <div className="landing-plans-grid">
            {/* Free */}
            <Reveal delay={0.12}>
              <div className="landing-plan-card">
                <div className="landing-plan-header">
                  <h3 className="landing-plan-name">{t.pricing.free.name}</h3>
                  <div className="landing-plan-price-row">
                    <span className="landing-plan-price">{t.pricing.free.price}</span>
                    <span className="landing-plan-period">{t.pricing.free.period}</span>
                  </div>
                  <p className="landing-plan-note">{t.pricing.free.desc}</p>
                </div>
                <ul className="landing-plan-features">
                  {t.pricing.free.features.map((f, i) => (
                    <li key={i}><Check size={14} style={{ color: 'var(--accent)' }} />{f}</li>
                  ))}
                </ul>
                <Link href="/auth/register" className="btn-secondary landing-plan-cta" id="pricing-free-cta">
                  {t.pricing.free.cta}
                </Link>
              </div>
            </Reveal>

            {/* Premium */}
            <Reveal delay={0.18}>
              <div className="landing-plan-card landing-plan-card--premium">
                <div className="landing-plan-header">
                  <div className="landing-plan-name-row">
                    <h3 className="landing-plan-name">{t.pricing.premium.name}</h3>
                    <Crown size={16} style={{ color: 'var(--gold)' }} />
                    <span className="landing-premium-badge">{t.pricing.premium.badge}</span>
                  </div>
                  {billing === 'annual' ? (
                    <div className="landing-plan-price-row">
                      <span className="landing-plan-crossed">{t.pricing.premium.annual.crossed}</span>
                      <span className="landing-plan-price landing-plan-price--gold">{t.pricing.premium.annual.price}</span>
                      <span className="landing-plan-period">{t.pricing.premium.annual.period}</span>
                    </div>
                  ) : (
                    <div className="landing-plan-price-row">
                      <span className="landing-plan-crossed">{t.pricing.premium.monthly.crossed}</span>
                      <span className="landing-plan-price landing-plan-price--gold">{t.pricing.premium.monthly.price}</span>
                      <span className="landing-plan-period">{t.pricing.premium.monthly.period}</span>
                    </div>
                  )}
                  <p className="landing-plan-note" style={{ color: 'var(--accent)' }}>
                    {billing === 'annual' ? t.pricing.premium.annual.note : t.pricing.premium.monthly.note}
                  </p>
                </div>
                <ul className="landing-plan-features">
                  {t.pricing.premium.features.map((f, i) => (
                    <li key={i}><Check size={14} style={{ color: 'var(--accent)' }} />{f}</li>
                  ))}
                </ul>
                <Link href="/auth/register" className="btn-primary landing-plan-cta" id="pricing-premium-cta">
                  {t.pricing.premium.cta} <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.22}>
            <div className="landing-pricing-footer">
              <p><Lock size={12} style={{ color: 'var(--accent)' }} /> {t.pricing.security}</p>
              <p>{t.pricing.cancel}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════
         SECTION 8 — FINAL CTA
         ══════════════════════════════════════ */}
      <section className="landing-section landing-final" id="cta">
        <div className="landing-container landing-final-inner">
          <Reveal>
            <h2 className="landing-final-title">
              {t.final.title.split('\n').map((line, i) => (
                <span key={i}>{line}<br /></span>
              ))}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="landing-final-sub">{t.final.sub}</p>
          </Reveal>
          <Reveal delay={0.18}>
            <Link href="/auth/register" className="btn-primary landing-final-cta" id="final-cta">
              {t.final.cta} <ArrowRight size={15} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════
         FOOTER
         ══════════════════════════════════════ */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-logo-mark gradient-primary" style={{ width: 28, height: 28 }}>
              <TrendingUp size={14} color="#fff" strokeWidth={2.2} />
            </div>
            <span className="landing-footer-name">Cash Save</span>
          </div>
          <div className="landing-footer-links">
            <Link href="/auth/login">{t.footer.links.login}</Link>
            <Link href="/auth/register">{t.footer.links.register}</Link>
          </div>
          <p className="landing-footer-copy">{t.footer.copy}</p>
        </div>
      </footer>
    </div>
  );
}
