'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyHabit, Profile, HABIT_LABELS, NUMERIC_HABIT_LABELS, CustomHabit, HabitAxis, HabitType } from '@/types';
import { calculateAllScores, getScoreLevel, calculateRoutineCompletionPercentage } from '@/lib/scoring';
import { format, subDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Calendar, Save,
  Check, Minus, Plus, Sparkles, CheckCircle2,
  Pencil, Trash2, Settings2, X, Sliders, Layers, ArrowRight, HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import FuturisticDatePicker from '@/components/FuturisticDatePicker';

const BOOLEAN_FIELDS = ['bible', 'prayer', 'meditation', 'reading', 'documentary', 'sport', 'light_work', 'deep_work', 'after_work'] as const;
const NUMERIC_FIELDS = ['prospects_contacted', 'calls_made', 'content_published', 'client_projects', 'learning_minutes'] as const;

const SCORE_SEGMENTS = [
  { key: 'habit_score', label: 'Habitudes' },
  { key: 'work_score', label: 'Travail' },
  { key: 'business_score', label: 'Business' },
  { key: 'learning_score', label: 'Apprentissage' },
] as const;

const ICON_OPTIONS = ['✨', '📖', '🙏', '🧘', '📚', '🎬', '💪', '💡', '🔥', '🌙', '📞', '📱', '📝', '💼', '🎓', '💧', '🏃', '🥗', '💰', '🚀'];

const WIZARD_CATEGORIES = [
  {
    title: '📖 Esprit & Foi',
    axis: 'esprit',
    habits: [
      { key: 'prayer', label: 'Prière quotidienne', icon: '🙏' },
      { key: 'meditation', label: 'Méditation & Silence', icon: '🧘' },
      { key: 'bible', label: 'Lecture sainte / Bible', icon: '📖' },
      { key: 'reading', label: 'Lecture inspirante', icon: '📚' },
    ],
  },
  {
    title: '💪 Santé & Énergie',
    axis: 'sante',
    habits: [
      { key: 'sport', label: 'Sport / Exercice physique', icon: '💪' },
      { key: 'documentary', label: 'Documentaire enrichissant', icon: '🎬' },
      { key: 'after_work', label: 'Relaxation & Repos du soir', icon: '🌙' },
    ],
  },
  {
    title: '🔥 Focus & Discipline',
    axis: 'focus',
    habits: [
      { key: 'deep_work', label: 'Session Deep Work', icon: '🔥' },
      { key: 'light_work', label: 'Light Work & Organisation', icon: '💡' },
      { key: 'learning_minutes', label: 'Temps d\'apprentissage (min)', icon: '🎓' },
    ],
  },
  {
    title: '💼 Business & Performance',
    axis: 'business',
    habits: [
      { key: 'prospects_contacted', label: 'Prospects contactés', icon: '📞' },
      { key: 'calls_made', label: 'Appels de vente / Réseautage', icon: '📱' },
      { key: 'content_published', label: 'Contenu produit / publié', icon: '📝' },
      { key: 'client_projects', label: 'Projets clients délivrés', icon: '💼' },
    ],
  },
];

export default function HabitsPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [habitData, setHabitData] = useState<Partial<DailyHabit>>({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const [activeHabits, setActiveHabits] = useState<string[]>([]);
  
  // Custom Habits State
  const [customHabits, setCustomHabits] = useState<CustomHabit[]>([]);
  const [showCustomHabitModal, setShowCustomHabitModal] = useState(false);
  const [editingCustomHabit, setEditingCustomHabit] = useState<CustomHabit | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customAxis, setCustomAxis] = useState<HabitAxis>('esprit');
  const [customType, setCustomType] = useState<HabitType>('boolean');
  const [customIcon, setCustomIcon] = useState('✨');

  // Onboarding Wizard Pop-ups State
  const [showInitialPromptModal, setShowInitialPromptModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardSelectedKeys, setWizardSelectedKeys] = useState<string[]>([]);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const isLive = isLiveSupabaseConfigured();

    // Read local custom habits & preferences
    const localCustom: CustomHabit[] = JSON.parse(localStorage.getItem('cashsave_custom_habits') || '[]');
    setCustomHabits(localCustom);

    let loadedActiveKeys: string[] = [];
    const localPrefs = JSON.parse(localStorage.getItem('cashsave_habit_preferences') || '[]');
    if (Array.isArray(localPrefs) && localPrefs.length > 0) {
      loadedActiveKeys = localPrefs.filter((p: any) => p.is_active).map((p: any) => p.habit_key);
      setActiveHabits(loadedActiveKeys);
    }

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [profileRes, habitRes, prefRes, customRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('daily_habits').select('*').eq('user_id', user.id).eq('date', selectedDate).single(),
            supabase.from('user_habit_preferences').select('*').eq('user_id', user.id).eq('is_active', true),
            supabase.from('custom_habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          ]);
          if (profileRes.data) setProfile(profileRes.data);
          if (customRes.data && customRes.data.length > 0) {
            setCustomHabits(customRes.data);
            localStorage.setItem('cashsave_custom_habits', JSON.stringify(customRes.data));
          }
          if (prefRes.data && prefRes.data.length > 0) {
            loadedActiveKeys = prefRes.data.map(p => p.habit_key);
            setActiveHabits(loadedActiveKeys);
            localStorage.setItem('cashsave_habit_preferences', JSON.stringify(prefRes.data));
          }
          if (habitRes.data) {
            setHabitData(habitRes.data);
            setLoading(false);

            // Pop-up check for new / unconfigured users
            if (!hasCheckedOnboarding) {
              setHasCheckedOnboarding(true);
              if (loadedActiveKeys.length === 0 && (customRes.data?.length || localCustom.length) === 0) {
                setShowInitialPromptModal(true);
              }
            }
            return;
          }
        }
      } catch (e) { /* fallback */ }
    }

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
        content_published: 4, client_projects: 5, learning_minutes: 0.1,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const localHabits = JSON.parse(localStorage.getItem('cashsave_habits') || '[]');
    const found = localHabits.find((h: any) => h.date === selectedDate);
    if (found) {
      setHabitData(found);
    } else {
      const emptyData: Partial<DailyHabit> = {};
      BOOLEAN_FIELDS.forEach(f => { emptyData[f] = false; });
      NUMERIC_FIELDS.forEach(f => { emptyData[f] = 0; });
      emptyData.comments = '';
      emptyData.progression = '';
      setHabitData(emptyData);
    }

    // Pop-up check for new / unconfigured users in local mode
    if (!hasCheckedOnboarding) {
      setHasCheckedOnboarding(true);
      if (loadedActiveKeys.length === 0 && localCustom.length === 0) {
        setShowInitialPromptModal(true);
      }
    }

    setLoading(false);
  }, [selectedDate, hasCheckedOnboarding]);

  useEffect(() => { loadData(); }, [loadData]);

  const scores = profile
    ? calculateAllScores(habitData, profile.scoring_settings)
    : { habit_score: 0, work_score: 0, business_score: 0, learning_score: 0, total_score: 0 };

  const routineStats = calculateRoutineCompletionPercentage(habitData, activeHabits);

  const handleToggle = (field: typeof BOOLEAN_FIELDS[number]) => {
    setHabitData(prev => ({ ...prev, [field]: !prev[field] }));
    setSaved(false);
  };

  const handleNumericChange = (field: typeof NUMERIC_FIELDS[number], value: number) => {
    const num = Math.max(0, Math.round(Number(value) || 0));
    setHabitData(prev => ({ ...prev, [field]: num }));
    setSaved(false);
  };

  const openCreateCustomHabitModal = () => {
    setEditingCustomHabit(null);
    setCustomTitle('');
    setCustomAxis('esprit');
    setCustomType('boolean');
    setCustomIcon('✨');
    setShowCustomHabitModal(true);
  };

  const openEditCustomHabitModal = (habit: CustomHabit) => {
    setEditingCustomHabit(habit);
    setCustomTitle(habit.title);
    setCustomAxis(habit.axis);
    setCustomType(habit.type);
    setCustomIcon(habit.icon || '✨');
    setShowCustomHabitModal(true);
  };

  const openWizardModal = () => {
    setWizardSelectedKeys(activeHabits);
    setShowWizardModal(true);
  };

  const handleToggleWizardKey = (key: string) => {
    setWizardSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSaveWizardRoutine = async () => {
    setActiveHabits(wizardSelectedKeys);
    setShowWizardModal(false);

    const prefObjects = wizardSelectedKeys.map(key => ({
      habit_key: key,
      is_active: true,
    }));
    localStorage.setItem('cashsave_habit_preferences', JSON.stringify(prefObjects));

    if (isLiveSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_habit_preferences').delete().eq('user_id', user.id);
          if (wizardSelectedKeys.length > 0) {
            const toInsert = wizardSelectedKeys.map(key => ({
              user_id: user.id,
              habit_key: key,
              is_active: true,
            }));
            await supabase.from('user_habit_preferences').insert(toInsert);
          }
        }
      } catch (e) {}
    }

    confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 }, colors: ['#0E9F6E', '#087A56', '#D6B36A'] });
  };

  const handleSaveCustomHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    if (editingCustomHabit) {
      const updated: CustomHabit = {
        ...editingCustomHabit,
        title: customTitle.trim(),
        axis: customAxis,
        type: customType,
        icon: customIcon,
      };

      setCustomHabits(prev => prev.map(h => h.id === editingCustomHabit.id ? updated : h));
      const local = JSON.parse(localStorage.getItem('cashsave_custom_habits') || '[]');
      const updatedLocal = local.map((h: any) => h.id === editingCustomHabit.id ? updated : h);
      localStorage.setItem('cashsave_custom_habits', JSON.stringify(updatedLocal));

      setShowCustomHabitModal(false);

      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('custom_habits').update({
              title: updated.title,
              axis: updated.axis,
              type: updated.type,
              icon: updated.icon,
            }).eq('id', editingCustomHabit.id);
          }
        } catch (e) {}
      }
    } else {
      const newHabit: CustomHabit = {
        id: `custom-${Date.now()}`,
        user_id: 'demo-user',
        title: customTitle.trim(),
        axis: customAxis,
        type: customType,
        icon: customIcon,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      setCustomHabits(prev => [newHabit, ...prev]);
      const local = JSON.parse(localStorage.getItem('cashsave_custom_habits') || '[]');
      local.unshift(newHabit);
      localStorage.setItem('cashsave_custom_habits', JSON.stringify(local));

      setShowCustomHabitModal(false);

      if (isLiveSupabaseConfigured()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('custom_habits').insert({ ...newHabit, user_id: user.id });
          }
        } catch (e) {}
      }
    }
  };

  const handleDeleteCustomHabit = async (id: string) => {
    setCustomHabits(prev => prev.filter(h => h.id !== id));
    const local = JSON.parse(localStorage.getItem('cashsave_custom_habits') || '[]');
    localStorage.setItem('cashsave_custom_habits', JSON.stringify(local.filter((h: any) => h.id !== id)));

    if (isLiveSupabaseConfigured()) {
      try {
        await supabase.from('custom_habits').delete().eq('id', id);
      } catch (e) {}
    }
  };

  const handleToggleCustomHabit = (id: string, isBoolean: boolean, value?: number) => {
    setHabitData(prev => {
      const logs = { ...(prev.custom_logs || {}) };
      if (isBoolean) {
        logs[id] = !logs[id];
      } else {
        logs[id] = Math.max(0, Math.round(Number(value) || 0));
      }
      return { ...prev, custom_logs: logs };
    });
    setSaved(false);
  };

  const handleTextChange = (field: 'comments' | 'progression', value: string) => {
    setHabitData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const dataToSave = {
      id: habitData.id || `habit-${Date.now()}`,
      user_id: 'demo-user',
      date: selectedDate,
      ...Object.fromEntries(BOOLEAN_FIELDS.map(f => [f, habitData[f] || false])),
      ...Object.fromEntries(NUMERIC_FIELDS.map(f => [f, habitData[f] || 0])),
      custom_logs: habitData.custom_logs || {},
      comments: habitData.comments || '',
      progression: habitData.progression || '',
      ...scores,
    };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('daily_habits').upsert({ ...dataToSave, user_id: user.id }, { onConflict: 'user_id,date' });
      }
    } catch (e) { /* silent */ }
    const localHabits = JSON.parse(localStorage.getItem('cashsave_habits') || '[]');
    const idx = localHabits.findIndex((h: any) => h.date === selectedDate);
    if (idx >= 0) localHabits[idx] = dataToSave;
    else localHabits.push(dataToSave);
    localStorage.setItem('cashsave_habits', JSON.stringify(localHabits));
    setSaving(false);
    setSaved(true);
    if (scores.total_score >= 50) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#0E9F6E', '#087A56', '#D6B36A'] });
    }
    setTimeout(() => setSaved(false), 2500);
  };

  const navigateDate = (dir: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    const next = dir === 'prev' ? subDays(current, 1) : addDays(current, 1);
    if (next <= new Date()) setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="h-6 w-40 skeleton rounded-md" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
      </div>
    );
  }

  // Active standard boolean & numeric habits
  const activeBooleanFields = BOOLEAN_FIELDS.filter(f => activeHabits.includes(f));
  const activeNumericFields = NUMERIC_FIELDS.filter(f => activeHabits.includes(f));
  const customBooleans = customHabits.filter(h => h.type === 'boolean');
  const customNumerics = customHabits.filter(h => h.type === 'numeric');

  const totalActiveHabitsCount = activeBooleanFields.length + activeNumericFields.length + customHabits.length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Habitudes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Suivi quotidien de votre discipline
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openWizardModal}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            <Sliders size={14} /> Configurer mes habitudes
          </button>

          <button
            type="button"
            onClick={openCreateCustomHabitModal}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Nouvelle habitude
          </button>

          {/* Date Navigator */}
          <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={() => navigateDate('prev')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Jour précédent"
            >
              <ChevronLeft size={16} strokeWidth={1.5} />
            </button>
            
            <div className="w-[150px]">
              <FuturisticDatePicker
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate)}
              />
            </div>

            <button
              type="button"
              onClick={() => navigateDate('next')}
              disabled={selectedDate === format(new Date(), 'yyyy-MM-dd')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-card-hover)] disabled:opacity-25 cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Jour suivant"
            >
              <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Routine Percentage & Progress Bar */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Complétion de la routine</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p
                className="text-3xl font-bold tracking-tight"
                style={{ color: 'var(--accent)', letterSpacing: '-0.03em' }}
              >
                {routineStats.percentage}%
              </p>
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                ({routineStats.completedCount}/{routineStats.totalTracked} faites aujourd&apos;hui)
              </span>
            </div>
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: routineStats.percentage >= 80 ? 'rgba(14,159,110,0.12)' : 'var(--accent-subtle)',
              color: routineStats.percentage >= 80 ? '#0E9F6E' : 'var(--accent)',
              border: routineStats.percentage >= 80 ? '1px solid rgba(14,159,110,0.25)' : '1px solid var(--accent-border)',
            }}
          >
            {routineStats.percentage >= 100 ? '100% Atteint 🎉' : routineStats.percentage >= 50 ? 'En bonne voie' : 'À compléter'}
          </div>
        </div>

        {/* Dynamic Percentage Progress Bar */}
        <div className="w-full bg-[var(--bg-base)] h-3 rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out gradient-primary"
            style={{ width: `${routineStats.percentage}%` }}
          />
        </div>
      </div>

      {/* If No Habits Configured Empty State Banner */}
      {totalActiveHabitsCount === 0 && (
        <div className="glass-card p-8 text-center space-y-4 border-dashed" style={{ borderColor: 'var(--accent-border)' }}>
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center mx-auto text-2xl" style={{ color: 'var(--accent)' }}>
            ✨
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Aucune habitude configurée pour l&apos;instant
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Sélectionnez les habitudes que vous souhaitez suivre ou créez-en de nouvelles sur-mesure.
            </p>
          </div>
          <button
            type="button"
            onClick={openWizardModal}
            className="btn-primary text-xs py-3 px-6 inline-flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <Sparkles size={15} /> Configurer mes habitudes maintenant
          </button>
        </div>
      )}

      {/* Boolean Habits Section */}
      {(activeBooleanFields.length > 0 || customBooleans.length > 0) && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
              Habitudes à cocher (✓)
            </p>
          </div>

          <div className="space-y-1.5">
            {/* Standard Boolean Habits */}
            {activeBooleanFields.map((field) => {
              const active = !!habitData[field];
              return (
                <button
                  key={field}
                  onClick={() => handleToggle(field)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 group text-left cursor-pointer"
                  style={{
                    background: active ? 'var(--accent-subtle)' : 'var(--bg-card-hover)',
                    border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
                  }}
                >
                  <span
                    className="text-sm font-medium transition-colors"
                    style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {HABIT_LABELS[field]}
                  </span>

                  <div
                    className="w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0"
                    style={{
                      background: active ? 'var(--accent)' : 'var(--bg-base)',
                      border: active ? 'none' : '1px solid var(--border-strong)',
                    }}
                  >
                    {active && <Check size={13} strokeWidth={2.5} color="white" />}
                  </div>
                </button>
              );
            })}

            {/* Custom Boolean Habits */}
            {customBooleans.map(cHabit => {
              const logs = habitData.custom_logs || {};
              const active = !!logs[cHabit.id];
              return (
                <div
                  key={cHabit.id}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-150 border"
                  style={{
                    background: active ? 'var(--accent-subtle)' : 'var(--bg-card-hover)',
                    borderColor: active ? 'var(--accent-border)' : 'transparent',
                  }}
                >
                  <div
                    className="flex-1 flex items-center gap-2.5 cursor-pointer"
                    onClick={() => handleToggleCustomHabit(cHabit.id, true)}
                  >
                    <span className="text-base">{cHabit.icon || '✨'}</span>
                    <span className="text-sm font-medium" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {cHabit.title}
                    </span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/20 text-gray-400">
                      {cHabit.axis}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditCustomHabitModal(cHabit)}
                      className="p-1 rounded hover:bg-black/10 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomHabit(cHabit.id)}
                      className="p-1 rounded hover:bg-rose-500/10 transition-colors"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>

                    <div
                      onClick={() => handleToggleCustomHabit(cHabit.id, true)}
                      className="w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer ml-1"
                      style={{
                        background: active ? 'var(--accent)' : 'var(--bg-base)',
                        border: active ? 'none' : '1px solid var(--border-strong)',
                      }}
                    >
                      {active && <Check size={13} strokeWidth={2.5} color="white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Numeric Inputs Section */}
      {(activeNumericFields.length > 0 || customNumerics.length > 0) && (
        <div className="glass-card p-4 space-y-3">
          <div className="px-1">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
              Compteurs d&apos;Activités &amp; Business (🔢)
            </p>
          </div>

          <div className="space-y-1.5">
            {/* Standard Numeric Habits */}
            {activeNumericFields.map(field => {
              const rawVal = habitData[field];
              const val = typeof rawVal === 'number' ? rawVal : (parseInt(String(rawVal ?? 0), 10) || 0);
              return (
                <div
                  key={field}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all"
                  style={{ background: 'var(--bg-card-hover)', border: '1px solid transparent' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {NUMERIC_HABIT_LABELS[field]}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNumericChange(field, val - 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all select-none hover:border-[var(--border-strong)] active:scale-95 cursor-pointer shrink-0"
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      aria-label="Diminuer"
                    >
                      <Minus size={14} strokeWidth={2} />
                    </button>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => handleNumericChange(field, parseInt(e.target.value, 10) || 0)}
                      className="input-field py-1 px-1 text-center font-semibold"
                      style={{ width: '48px', fontSize: '14px' }}
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={() => handleNumericChange(field, val + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all select-none hover:border-[var(--border-strong)] active:scale-95 cursor-pointer shrink-0"
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      aria-label="Augmenter"
                    >
                      <Plus size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Custom Numeric Habits */}
            {customNumerics.map(cHabit => {
              const logs = habitData.custom_logs || {};
              const rawVal = logs[cHabit.id];
              const val = typeof rawVal === 'number' ? rawVal : (parseInt(String(rawVal ?? 0), 10) || 0);
              return (
                <div
                  key={cHabit.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all border"
                  style={{ background: 'var(--bg-card-hover)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cHabit.icon || '✨'}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {cHabit.title}
                    </span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/20 text-gray-400">
                      {cHabit.axis}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditCustomHabitModal(cHabit)}
                      className="p-1 rounded hover:bg-black/10 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomHabit(cHabit.id)}
                      className="p-1 rounded hover:bg-rose-500/10 transition-colors"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>

                    <div className="flex items-center gap-1.5 ml-1">
                      <button
                        type="button"
                        onClick={() => handleToggleCustomHabit(cHabit.id, false, val - 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all select-none cursor-pointer shrink-0"
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handleToggleCustomHabit(cHabit.id, false, parseInt(e.target.value, 10) || 0)}
                        className="input-field py-1 px-1 text-center font-semibold"
                        style={{ width: '48px', fontSize: '14px' }}
                        min={0}
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleCustomHabit(cHabit.id, false, val + 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all select-none cursor-pointer shrink-0"
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="glass-card p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
          Journal &amp; Notes
        </p>
        <div>
          <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Commentaires du jour
          </label>
          <textarea
            value={habitData.comments || ''}
            onChange={(e) => handleTextChange('comments', e.target.value)}
            placeholder="Observations, réflexions..."
            className="input-field min-h-[72px] resize-none"
          />
        </div>
        <div>
          <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Progression
          </label>
          <textarea
            value={habitData.progression || ''}
            onChange={(e) => handleTextChange('progression', e.target.value)}
            placeholder="Ce que j'ai accompli aujourd'hui..."
            className="input-field min-h-[72px] resize-none"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        id="save-habits"
        className="btn-primary w-full py-3.5 shadow-lg cursor-pointer"
        style={saved ? { background: '#0E9F6E', boxShadow: '0 4px 16px rgba(14,159,110,0.35)' } : undefined}
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        ) : saved ? (
          <>
            <Check size={16} strokeWidth={2} />
            Enregistré
          </>
        ) : (
          <>
            <Save size={16} strokeWidth={1.5} />
            Enregistrer les habitudes
          </>
        )}
      </button>

      {/* POP-UP 1: Prompt initial d'onboarding pour nouvel utilisateur sans habitudes */}
      {showInitialPromptModal && (
        <div className="modal-overlay z-50 backdrop-blur-xl animate-fade-in">
          <div className="modal-content max-w-md p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center mx-auto text-3xl shadow-lg">
              ✨
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Vous n&apos;avez pas encore configuré d&apos;habitude
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Commençons par ici pour comprendre vos objectifs quotidiens et établir vos habitudes personnalisées à suivre.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowInitialPromptModal(false);
                  openWizardModal();
                }}
                className="btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Sparkles size={16} /> Configurer mes habitudes
              </button>

              <button
                type="button"
                onClick={() => setShowInitialPromptModal(false)}
                className="text-xs font-medium py-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                Ignorer pour l&apos;instant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP 2: Questionnaire Interactif de Configuration des Habitudes */}
      {showWizardModal && (
        <div
          className="modal-overlay z-50 backdrop-blur-xl"
          onClick={() => setShowWizardModal(false)}
        >
          <div
            className="modal-content max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  Configurer votre routine d&apos;habitudes
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Cochez les habitudes quotidiennes que vous désirez mesurer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWizardModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-card-hover)] cursor-pointer"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Category Wizard List */}
            <div className="space-y-5">
              {WIZARD_CATEGORIES.map(cat => (
                <div key={cat.axis} className="space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                    {cat.title}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.habits.map(h => {
                      const isSelected = wizardSelectedKeys.includes(h.key);
                      return (
                        <button
                          key={h.key}
                          type="button"
                          onClick={() => handleToggleWizardKey(h.key)}
                          className="flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer"
                          style={{
                            background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-card-hover)',
                            borderColor: isSelected ? 'var(--accent-border)' : 'var(--border)',
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{h.icon}</span>
                            <span className="text-xs font-semibold" style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {h.label}
                            </span>
                          </div>

                          <div
                            className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all"
                            style={{
                              background: isSelected ? 'var(--accent)' : 'var(--bg-base)',
                              border: isSelected ? 'none' : '1px solid var(--border-strong)',
                            }}
                          >
                            {isSelected && <Check size={13} strokeWidth={2.5} color="white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={openCreateCustomHabitModal}
                className="btn-secondary py-2.5 px-4 text-xs font-medium w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Créer une habitude sur-mesure
              </button>

              <button
                type="button"
                onClick={handleSaveWizardRoutine}
                className="btn-primary py-3 px-6 text-xs font-bold w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Check size={16} /> Valider et enregistrer ma routine ({wizardSelectedKeys.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création / Édition d'une Habitude Personnalisée */}
      {showCustomHabitModal && (
        <div
          className="modal-overlay z-50 backdrop-blur-xl"
          onClick={() => setShowCustomHabitModal(false)}
        >
          <div
            className="modal-content max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                  {editingCustomHabit ? 'Modifier l\'habitude' : 'Nouvelle habitude sur-mesure'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Définissez vos propres objectifs quotidiens
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomHabitModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-card-hover)] cursor-pointer"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomHabit} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Titre de l&apos;habitude
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Ex: Boire 2L d'eau, Méditer 10min..."
                  required
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Axe d&apos;épanouissement
                </label>
                <select
                  value={customAxis}
                  onChange={e => setCustomAxis(e.target.value as HabitAxis)}
                  className="input-field text-xs"
                >
                  <option value="esprit">📖 Esprit &amp; Foi</option>
                  <option value="sante">💪 Santé &amp; Énergie</option>
                  <option value="focus">🔥 Focus &amp; Travail</option>
                  <option value="business">💼 Business &amp; Growth</option>
                </select>
              </div>

              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Type de suivi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomType('boolean')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border"
                    style={{
                      background: customType === 'boolean' ? 'var(--accent-subtle)' : 'var(--bg-card-hover)',
                      borderColor: customType === 'boolean' ? 'var(--accent-border)' : 'var(--border)',
                      color: customType === 'boolean' ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <Check size={14} /> Case à cocher (✓)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('numeric')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer border"
                    style={{
                      background: customType === 'numeric' ? 'var(--accent-subtle)' : 'var(--bg-card-hover)',
                      borderColor: customType === 'numeric' ? 'var(--accent-border)' : 'var(--border)',
                      color: customType === 'numeric' ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <Plus size={14} /> Compteur numérique (🔢)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Choisir une icône
                </label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 rounded-xl border bg-black/20" style={{ borderColor: 'var(--border)' }}>
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCustomIcon(icon)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-110 cursor-pointer border"
                      style={{
                        background: customIcon === icon ? 'var(--accent-subtle)' : 'var(--bg-base)',
                        borderColor: customIcon === icon ? 'var(--accent-border)' : 'transparent',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-3 text-xs font-semibold cursor-pointer mt-2"
              >
                {editingCustomHabit ? 'Mettre à jour' : 'Créer cette habitude'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
