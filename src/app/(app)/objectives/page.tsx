'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Objective, ObjectiveStatus } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Target, Plus, Calendar, CheckCircle, Clock, Trash2, Edit3, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<ObjectiveStatus>('IN_PROGRESS');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadObjectives();
  }, []);

  async function loadObjectives() {
    const isLive = isLiveSupabaseConfigured();

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('objectives')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (data) {
            setObjectives(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    const localObj = JSON.parse(localStorage.getItem('cashsave_objectives') || '[]');
    setObjectives(localObj);
    setLoading(false);
  }

  const openCreateModal = () => {
    setEditingObjective(null);
    setTitle('');
    setDeadline(format(new Date(), 'yyyy-MM-dd'));
    setProgress(0);
    setStatus('IN_PROGRESS');
    setShowModal(true);
  };

  const openEditModal = (obj: Objective) => {
    setEditingObjective(obj);
    setTitle(obj.title);
    setDeadline(obj.deadline || '');
    setProgress(obj.progress);
    setStatus(obj.status);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const isCompleted = progress === 100 ? 'COMPLETED' : status;
    const newObj: Objective = {
      id: editingObjective ? editingObjective.id : `obj-${Date.now()}`,
      user_id: 'demo-user',
      title,
      deadline: deadline || null,
      progress,
      status: isCompleted,
      created_at: editingObjective ? editingObjective.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (editingObjective) {
          await supabase.from('objectives').update(newObj).eq('id', editingObjective.id);
        } else {
          await supabase.from('objectives').insert({ ...newObj, user_id: user.id });
        }
      }
    } catch (e) {}

    const localObj = JSON.parse(localStorage.getItem('cashsave_objectives') || '[]');
    if (editingObjective) {
      const idx = localObj.findIndex((o: any) => o.id === editingObjective.id);
      if (idx >= 0) localObj[idx] = newObj;
    } else {
      localObj.unshift(newObj);
    }
    localStorage.setItem('cashsave_objectives', JSON.stringify(localObj));

    if (progress === 100) triggerConfetti();
    setSaving(false);
    setShowModal(false);
    loadObjectives();
  };

  const handleQuickProgressUpdate = async (id: string, newProgress: number) => {
    const isCompleted = newProgress === 100;
    setObjectives(prev => prev.map(o => o.id === id ? {
      ...o,
      progress: newProgress,
      status: isCompleted ? 'COMPLETED' : o.status
    } : o));

    const localObj = JSON.parse(localStorage.getItem('cashsave_objectives') || '[]');
    localStorage.setItem('cashsave_objectives', JSON.stringify(
      localObj.map((o: any) => o.id === id ? { ...o, progress: newProgress, status: isCompleted ? 'COMPLETED' : o.status } : o)
    ));

    if (isCompleted) triggerConfetti();

    try {
      await supabase.from('objectives').update({ progress: newProgress, status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS' }).eq('id', id);
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    setObjectives(prev => prev.filter(o => o.id !== id));
    const localObj = JSON.parse(localStorage.getItem('cashsave_objectives') || '[]');
    localStorage.setItem('cashsave_objectives', JSON.stringify(localObj.filter((o: any) => o.id !== id)));
    try {
      await supabase.from('objectives').delete().eq('id', id);
    } catch (e) {}
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#6366F1', '#10B981', '#F59E0B'],
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="h-6 w-40 skeleton rounded-md" />
        <div className="grid grid-cols-1 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Objectifs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Suivi de vos grands objectifs stratégiques
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          id="add-objective-btn"
        >
          <Plus size={15} strokeWidth={2} /> Nouvel objectif
        </button>
      </div>

      {/* Objectives List */}
      <div className="space-y-3">
        {objectives.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
            <Target size={36} strokeWidth={1} style={{ color: 'var(--accent)', opacity: 0.5, marginBottom: '12px' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Aucun objectif défini pour le moment.
            </p>
            <button onClick={openCreateModal} className="btn-secondary text-xs mt-4">
              Définir mon premier objectif
            </button>
          </div>
        ) : (
          objectives.map((obj) => (
            <div key={obj.id} className="glass-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                      {obj.title}
                    </h3>
                    {obj.status === 'COMPLETED' && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{
                          background: 'var(--color-success-bg)',
                          color: 'var(--color-success)',
                          border: '1px solid var(--color-success-border)',
                        }}
                      >
                        <CheckCircle size={12} strokeWidth={2} /> Atteint
                      </span>
                    )}
                  </div>
                  {obj.deadline && (
                    <p className="text-xs flex items-center gap-1 mt-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      <Calendar size={13} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
                      Échéance : {format(new Date(obj.deadline), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(obj)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label="Éditer l'objectif"
                  >
                    <Edit3 size={15} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(obj.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label="Supprimer l'objectif"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Progress Bar & Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>Progression</span>
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>{obj.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${obj.progress}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={obj.progress}
                  onChange={(e) => handleQuickProgressUpdate(obj.id, parseInt(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                {editingObjective ? "Éditer l'objectif" : 'Nouvel objectif'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                aria-label="Fermer"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Intitulé de l&apos;objectif
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Atteindre 10 000 FCFA de CA mensuel"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Échéance
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Progression initiale ({progress}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full py-3 mt-2"
              >
                {saving ? 'Enregistrement...' : editingObjective ? 'Mettre à jour' : 'Créer l\'objectif'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
