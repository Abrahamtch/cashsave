'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Objective, ObjectiveStatus } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Target, Plus, Calendar, CheckCircle, Clock, Trash2, Edit3, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('objectives')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setObjectives(data);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const isCompleted = progress === 100 ? 'COMPLETED' : status;

    if (editingObjective) {
      const { error } = await supabase
        .from('objectives')
        .update({
          title,
          deadline: deadline || null,
          progress,
          status: isCompleted,
        })
        .eq('id', editingObjective.id);

      if (!error) {
        if (progress === 100 && editingObjective.progress !== 100) {
          triggerConfetti();
        }
        setShowModal(false);
        loadObjectives();
      }
    } else {
      const { error } = await supabase.from('objectives').insert({
        user_id: user.id,
        title,
        deadline: deadline || null,
        progress,
        status: isCompleted,
      });

      if (!error) {
        if (progress === 100) {
          triggerConfetti();
        }
        setShowModal(false);
        loadObjectives();
      }
    }
    setSaving(false);
  };

  const handleQuickProgressUpdate = async (id: string, newProgress: number) => {
    const isCompleted = newProgress === 100;
    setObjectives(prev => prev.map(o => o.id === id ? {
      ...o,
      progress: newProgress,
      status: isCompleted ? 'COMPLETED' : o.status
    } : o));

    if (isCompleted) {
      triggerConfetti();
    }

    await supabase
      .from('objectives')
      .update({
        progress: newProgress,
        status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS'
      })
      .eq('id', id);
  };

  const handleDelete = async (id: string) => {
    setObjectives(prev => prev.filter(o => o.id !== id));
    await supabase.from('objectives').delete().eq('id', id);
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
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Objectifs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Suivi de vos grands objectifs stratégiques</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          id="add-objective-btn"
        >
          <Plus className="w-4 h-4" /> Nouvel objectif
        </button>
      </div>

      {/* Objectives List */}
      <div className="space-y-4">
        {objectives.length === 0 ? (
          <div className="glass-card p-10 text-center text-gray-500">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-400" />
            <p className="text-sm">Aucun objectif défini pour le moment.</p>
            <button onClick={openCreateModal} className="btn-secondary text-xs mt-3">
              Définir mon premier objectif
            </button>
          </div>
        ) : (
          objectives.map((obj) => (
            <div key={obj.id} className="glass-card p-5 space-y-4 hover:border-indigo-500/30 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{obj.title}</h3>
                    {obj.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10">
                        <CheckCircle className="w-3 h-3" /> Atteint
                      </span>
                    )}
                  </div>
                  {obj.deadline && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      Échéance : {format(new Date(obj.deadline), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(obj)}
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(obj.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar & Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Progression</span>
                  <span className="font-bold text-indigo-400">{obj.progress}%</span>
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
                  className="w-full accent-indigo-500 cursor-pointer"
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                {editingObjective ? "Éditer l'objectif" : 'Nouvel objectif'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Intitulé de l&apos;objectif</label>
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
                <label className="block text-xs font-medium text-gray-400 mb-1">Échéance</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Progression initiale ({progress}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full py-2.5 mt-2"
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
