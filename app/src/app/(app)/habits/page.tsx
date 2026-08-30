'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyHabit, Profile, HABIT_LABELS, NUMERIC_HABIT_LABELS } from '@/types';
import { calculateAllScores, getScoreLevel, getScoreColor } from '@/lib/scoring';
import { format, subDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Save, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const BOOLEAN_FIELDS = ['bible', 'prayer', 'meditation', 'reading', 'documentary', 'sport', 'light_work', 'deep_work', 'after_work'] as const;
const NUMERIC_FIELDS = ['prospects_contacted', 'calls_made', 'content_published', 'client_projects', 'learning_minutes'] as const;

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, habitRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('daily_habits').select('*').eq('user_id', user.id).eq('date', selectedDate).single(),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    else {
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
          content_published: 4, client_projects: 5, learning_minutes: 0.1
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    if (habitRes.data) {
      setHabitData(habitRes.data);
    } else {
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
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate scores in real time
  const scores = profile ? calculateAllScores(habitData, profile.scoring_settings) : { habit_score: 0, work_score: 0, business_score: 0, learning_score: 0, total_score: 0 };
  const scoreLevel = getScoreLevel(scores.total_score);
  const scoreColor = getScoreColor(scoreLevel);

  const handleToggle = (field: typeof BOOLEAN_FIELDS[number]) => {
    setHabitData(prev => ({ ...prev, [field]: !prev[field] }));
    setSaved(false);
  };

  const handleNumericChange = (field: typeof NUMERIC_FIELDS[number], value: number) => {
    setHabitData(prev => ({ ...prev, [field]: Math.max(0, value) }));
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
    } catch (e) {
      // Ignore
    }

    // Save to local storage
    const localHabits = JSON.parse(localStorage.getItem('cashsave_habits') || '[]');
    const existingIndex = localHabits.findIndex((h: any) => h.date === selectedDate);
    if (existingIndex >= 0) {
      localHabits[existingIndex] = dataToSave;
    } else {
      localHabits.push(dataToSave);
    }
    localStorage.setItem('cashsave_habits', JSON.stringify(localHabits));

    setSaving(false);
    setSaved(true);

    if (scores.total_score >= 50) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B'],
      });
    }
    setTimeout(() => setSaved(false), 2000);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    const newDate = direction === 'prev' ? subDays(current, 1) : addDays(current, 1);
    if (newDate <= new Date()) {
      setSelectedDate(format(newDate, 'yyyy-MM-dd'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Habits</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Suivi quotidien de vos habitudes</p>
      </div>

      {/* Date Selector */}
      <div className="glass-card p-3 flex items-center justify-between">
        <button onClick={() => navigateDate('prev')} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="font-medium text-sm">
            {format(new Date(selectedDate), 'EEEE d MMMM yyyy', { locale: fr })}
          </span>
        </div>
        <button
          onClick={() => navigateDate('next')}
          disabled={selectedDate === format(new Date(), 'yyyy-MM-dd')}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Score Display */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400">Score Total</h3>
          <div className={`text-3xl font-bold ${scoreColor} animate-count-up`}>
            {scores.total_score}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Habitudes', value: scores.habit_score, color: 'text-purple-400' },
            { label: 'Travail', value: scores.work_score, color: 'text-blue-400' },
            { label: 'Business', value: scores.business_score, color: 'text-emerald-400' },
            { label: 'Apprentissage', value: scores.learning_score, color: 'text-amber-400' },
          ].map(score => (
            <div key={score.label} className="text-center">
              <p className={`text-lg font-bold ${score.color}`}>{score.value}</p>
              <p className="text-[10px] text-gray-500">{score.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Boolean Habits (Switches) */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Habitudes du jour</h3>
        <div className="space-y-2">
          {BOOLEAN_FIELDS.map(field => (
            <button
              key={field}
              onClick={() => handleToggle(field)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                habitData[field]
                  ? 'bg-indigo-500/10 border border-indigo-500/20'
                  : 'bg-white/[0.02] border border-white/5 hover:bg-white/5'
              }`}
            >
              <span className="text-sm">{HABIT_LABELS[field]}</span>
              <div className={`toggle-switch ${habitData[field] ? 'active' : ''}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Numeric Inputs */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Activités & Business</h3>
        <div className="space-y-3">
          {NUMERIC_FIELDS.map(field => (
            <div key={field} className="flex items-center justify-between gap-4">
              <span className="text-sm flex-1">{NUMERIC_HABIT_LABELS[field]}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNumericChange(field, (habitData[field] as number || 0) - 1)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-lg"
                >
                  −
                </button>
                <input
                  type="number"
                  value={habitData[field] || 0}
                  onChange={(e) => handleNumericChange(field, parseInt(e.target.value) || 0)}
                  className="w-16 text-center input-field py-1.5"
                  min={0}
                />
                <button
                  onClick={() => handleNumericChange(field, (habitData[field] as number || 0) + 1)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-lg"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Text Fields */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Notes</h3>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Commentaires</label>
          <textarea
            value={habitData.comments || ''}
            onChange={(e) => handleTextChange('comments', e.target.value)}
            placeholder="Notes du jour..."
            className="input-field min-h-[60px] resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Progression</label>
          <textarea
            value={habitData.progression || ''}
            onChange={(e) => handleTextChange('progression', e.target.value)}
            placeholder="Ce que j'ai accompli..."
            className="input-field min-h-[60px] resize-none"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`btn-primary w-full py-3 text-base ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}
        id="save-habits"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : saved ? (
          <>
            <Sparkles className="w-5 h-5" />
            Sauvegardé !
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Sauvegarder
          </>
        )}
      </button>
    </div>
  );
}
