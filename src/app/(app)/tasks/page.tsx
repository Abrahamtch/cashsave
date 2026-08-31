'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Task, TaskPriority, TaskStatus, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, CheckCircle2, Clock, AlertCircle, Trash2, Calendar, X, Edit3, ArrowRight, ArrowLeft
} from 'lucide-react';
import { isLiveSupabaseConfigured } from '@/lib/isLiveSupabase';
import FuturisticDatePicker from '@/components/FuturisticDatePicker';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const isLive = isLiveSupabaseConfigured();

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (data) {
            setTasks(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    const localTasks = JSON.parse(localStorage.getItem('cashsave_tasks') || '[]');
    setTasks(localTasks);
    setLoading(false);
  }

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDeadline(format(new Date(), 'yyyy-MM-dd'));
    setPriority('MEDIUM');
    setStatus('TODO');
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDeadline(task.deadline || '');
    setPriority(task.priority);
    setStatus(task.status);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const newTask: Task = {
      id: editingTask ? editingTask.id : `task-${Date.now()}`,
      user_id: 'demo-user',
      title,
      deadline: deadline || null,
      priority,
      status,
      position: editingTask ? editingTask.position : tasks.length,
      created_at: editingTask ? editingTask.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Mise à jour locale immédiate (0ms de latence)
    setTasks(prev => {
      if (editingTask) {
        return prev.map(t => t.id === editingTask.id ? newTask : t);
      }
      return [newTask, ...prev];
    });

    const localTasks = JSON.parse(localStorage.getItem('cashsave_tasks') || '[]');
    if (editingTask) {
      const idx = localTasks.findIndex((t: any) => t.id === editingTask.id);
      if (idx >= 0) localTasks[idx] = newTask;
    } else {
      localTasks.unshift(newTask);
    }
    localStorage.setItem('cashsave_tasks', JSON.stringify(localTasks));

    setSaving(false);
    setShowModal(false);

    // 2. Synchro Supabase en tâche de fond
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (editingTask) {
            await supabase.from('tasks').update(newTask).eq('id', editingTask.id);
          } else {
            await supabase.from('tasks').insert({ ...newTask, user_id: user.id });
          }
        }
      } catch (e) {}
    })();
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const localTasks = JSON.parse(localStorage.getItem('cashsave_tasks') || '[]');
    localStorage.setItem('cashsave_tasks', JSON.stringify(localTasks.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    } catch (e) {}
  };

  const handleDelete = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const localTasks = JSON.parse(localStorage.getItem('cashsave_tasks') || '[]');
    localStorage.setItem('cashsave_tasks', JSON.stringify(localTasks.filter((t: any) => t.id !== taskId)));
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
    } catch (e) {}
  };

  const tasksByStatus = {
    TODO: tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter(t => t.status === 'DONE'),
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="h-6 w-40 skeleton rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  const getPriorityStyle = (p: TaskPriority) => {
    switch (p) {
      case 'HIGH':
        return { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)' };
      case 'MEDIUM':
        return { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' };
      default:
        return { color: 'var(--text-tertiary)', bg: 'var(--bg-card-hover)' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Tâches
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Gestion de vos priorités quotidiennes
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          id="add-task-btn"
        >
          <Plus size={15} strokeWidth={2} /> Nouvelle tâche
        </button>
      </div>

      {/* Kanban Board / Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((statusKey) => {
          const config = STATUS_CONFIG[statusKey];
          const columnTasks = tasksByStatus[statusKey];

          return (
            <div
              key={statusKey}
              className="glass-card p-4 flex flex-col h-full min-h-[320px]"
            >
              {/* Column Header */}
              <div
                className="flex items-center justify-between pb-3 mb-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent)',
                    }}
                  >
                    {config.label}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    ({columnTasks.length})
                  </span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {columnTasks.length === 0 ? (
                  <div
                    className="text-center py-10 text-xs italic"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Aucune tâche
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const priorityStyle = getPriorityStyle(task.priority);
                    const priorityCfg = PRIORITY_CONFIG[task.priority];

                    return (
                      <div
                        key={task.id}
                        className="p-3.5 rounded-xl transition-all duration-150 group"
                        style={{
                          background: 'var(--bg-card-hover)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className="text-sm font-medium leading-snug"
                            style={{
                              color: task.status === 'DONE' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                              textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </h4>
                          <button
                            onClick={() => openEditModal(task)}
                            className="opacity-0 group-hover:opacity-100 p-1 transition-opacity rounded-md"
                            style={{ color: 'var(--text-tertiary)' }}
                            aria-label="Éditer la tâche"
                          >
                            <Edit3 size={13} strokeWidth={1.5} />
                          </button>
                        </div>

                        <div
                          className="flex items-center justify-between gap-2 mt-3 pt-2.5"
                          style={{ borderTop: '1px solid var(--border)' }}
                        >
                          {/* Priority badge */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                            style={{
                              background: priorityStyle.bg,
                              color: priorityStyle.color,
                            }}
                          >
                            {priorityCfg.label}
                          </span>

                          {/* Deadline */}
                          {task.deadline && (
                            <span
                              className="text-[10px] flex items-center gap-1 font-medium"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              <Calendar size={11} strokeWidth={1.5} />
                              {format(new Date(task.deadline), 'dd MMM', { locale: fr })}
                            </span>
                          )}
                        </div>

                        {/* Status Switcher Action */}
                        <div
                          className="flex items-center justify-between mt-2 pt-2 text-xs"
                          style={{ borderTop: '1px solid var(--border)' }}
                        >
                          <div className="flex items-center gap-1.5">
                            {statusKey !== 'TODO' && (
                              <button
                                onClick={() => handleStatusChange(task.id, statusKey === 'DONE' ? 'IN_PROGRESS' : 'TODO')}
                                className="text-[10px] px-2 py-1 rounded-md flex items-center gap-1 transition-all"
                                style={{
                                  background: 'var(--bg-base)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <ArrowLeft size={10} strokeWidth={2} /> Reculer
                              </button>
                            )}
                            {statusKey !== 'DONE' && (
                              <button
                                onClick={() => handleStatusChange(task.id, statusKey === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                                className="text-[10px] px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all"
                                style={{
                                  background: 'var(--accent-subtle)',
                                  color: 'var(--accent)',
                                }}
                              >
                                Avancer <ArrowRight size={10} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-1 transition-colors rounded-md"
                            style={{ color: 'var(--text-tertiary)' }}
                            aria-label="Supprimer la tâche"
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                {editingTask ? 'Éditer la tâche' : 'Nouvelle tâche'}
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
                  Titre de la tâche
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Réviser le contrat client"
                  required
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Priorité
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="input-field"
                  >
                    <option value="LOW">Basse</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="HIGH">Haute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Statut
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="input-field"
                  >
                    <option value="TODO">À faire</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="DONE">Terminé</option>
                  </select>
                </div>
              </div>

              <FuturisticDatePicker
                label="Date limite"
                value={deadline}
                onChange={setDeadline}
              />

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full py-3 mt-2"
              >
                {saving ? 'Enregistrement...' : editingTask ? 'Mettre à jour' : 'Créer la tâche'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
