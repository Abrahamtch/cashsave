'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyHabit, Profile, HABIT_LABELS, NUMERIC_HABIT_LABELS } from '@/types';
import { calculateAllScores, getScoreLevel } from '@/lib/scoring';
import { format, subDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Calendar, Save,
  Check, Minus, Plus, Sparkles, CheckCircle2
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

export default function HabitsPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [habitData, setHabitData] = useState<Partial<DailyHabit>>({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const isLive = isLiveSupabaseConfigured();

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [profileRes, habitRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('daily_habits').select('*').eq('user_id', user.id).eq('date', selectedDate).single(),
          ]);
          if (profileRes.data) setProfile(profileRes.data);
          if (habitRes.data) { setHabitData(habitRes.data); setLoading(false); return; }
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
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const scores = profile
    ? calculateAllScores(habitData, profile.scoring_settings)
    : { habit_score: 0, work_score: 0, business_score: 0, learning_score: 0, total_score: 0 };

  const scoreLevel = getScoreLevel(scores.total_score);

  const handleToggle = (field: typeof BOOLEAN_FIELDS[number]) => {
    setHabitData(prev => ({ ...prev, [field]: !prev[field] }));
    setSaved(false);
  };

  const handleNumericChange = (field: typeof NUMERIC_FIELDS[number], value: number) => {
    const num = Math.max(0, Math.round(Number(value) || 0));
    setHabitData(prev => ({ ...prev, [field]: num }));
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

  const completedCount = BOOLEAN_FIELDS.filter(f => habitData[f]).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
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

        {/* Date Navigator */}
        <div className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => navigateDate('prev')}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--bg-card-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Jour précédent"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          
          <div className="w-[160px]">
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

      {/* Score Summary */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Score du jour</p>
            <p
              className="text-3xl font-bold mt-0.5 tracking-tight"
              style={{ color: 'var(--accent)', letterSpacing: '-0.03em' }}
            >
              {scores.total_score} <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>pts</span>
            </p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
            }}
          >
            {scoreLevel}
          </div>
        </div>

        {/* Score segments */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {SCORE_SEGMENTS.map(({ key, label }) => (
            <div
              key={key}
              className="flex flex-col items-center py-2.5 px-2 rounded-xl"
              style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
            >
              <p
                className="text-base font-semibold tracking-tight"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
              >
                {(scores as any)[key]}
              </p>
              <p className="text-[10px] mt-0.5 text-center font-medium" style={{ color: 'var(--text-tertiary)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Boolean Habits Section */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
            Habitudes du jour
          </p>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
          >
            {completedCount} / {BOOLEAN_FIELDS.length} faites
          </span>
        </div>

        {/* Spaced Row Items — No harsh divider lines */}
        <div className="space-y-1.5">
          {BOOLEAN_FIELDS.map((field) => {
            const active = !!habitData[field];
            return (
              <button
                key={field}
                onClick={() => handleToggle(field)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 group text-left"
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
        </div>
      </div>

      {/* Numeric Inputs Section */}
      <div className="glass-card p-4 space-y-3">
        <div className="px-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
            Activités &amp; Business
          </p>
        </div>

        {/* Spaced Row Items — No harsh divider lines */}
        <div className="space-y-1.5">
          {NUMERIC_FIELDS.map(field => {
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
        </div>
      </div>

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
        className="btn-primary w-full py-3.5 shadow-lg"
        style={saved ? { background: '#0E9F6E', boxShadow: '0 4px 16px rgba(14,159,110,0.35)' } : undefined}
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    </div>
  );
}
