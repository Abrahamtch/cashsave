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
import { broadcastDataUpdate } from '@/lib/syncUser';
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

  // Drag and drop states
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadTasks();
    const handleUpdate = () => { loadTasks(); };
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('cashsave_data_updated', handleUpdate);
    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('cashsave_data_updated', handleUpdate);
    };
  }, []);

  async function loadTasks() {
    const isLive = isLiveSupabaseConfigured();
    const localTasks = JSON.parse(localStorage.getItem('cashsave_tasks') || '[]');
    setTasks(localTasks);

    if (isLive) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (Array.isArray(data)) {
            setTasks(data);
            localStorage.setItem('cashsave_tasks', JSON.stringify(data));
          }
        }
      } catch (e) {
        // Fallback
      }
    }

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
    broadcastDataUpdate();

    // 2. Synchro Supabase en tâche de fond
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const payload = { ...newTask, user_id: user.id };
          if (editingTask) {
            await supabase.from('tasks').update(payload).eq('id', editingTask.id);
          } else {
            await supabase.from('tasks').insert(payload);
          }
        }
      } catch (e) {}
    })();
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const localTasks = JSON.parse(localStorage.getItem('cashsave_tasks') || '[]');
    localStorage.setItem('cashsave_tasks', JSON.stringify(localTasks.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t)));
    broadcastDataUpdate();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
        }
      } catch (e) {}
    })();
  };

  const handleDelete = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const localTasks = JSON.parse(localStorage.getItem('cashsave_tasks') || '[]');
    localStorage.setItem('cashsave_tasks', JSON.stringify(localTasks.filter((t: any) => t.id !== taskId)));
    broadcastDataUpdate();
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
          const isTargetOver = dragOverColumn === statusKey;

          return (
            <div
              key={statusKey}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverColumn !== statusKey) setDragOverColumn(statusKey);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
                if (taskId) {
                  handleStatusChange(taskId, statusKey);
                }
                setDragOverColumn(null);
                setDraggingTaskId(null);
              }}
              className="glass-card p-4 flex flex-col h-full min-h-[340px] transition-all duration-200"
              style={{
                border: isTargetOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: isTargetOver ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))' : 'var(--bg-card)',
                boxShadow: isTargetOver ? '0 0 20px rgba(14, 159, 110, 0.25)' : 'none',
              }}
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
              <div className="space-y-2.5 flex-1 overflow-y-auto min-h-[220px]">
                {columnTasks.length === 0 ? (
                  <div
                    className="h-full flex items-center justify-center border-2 border-dashed rounded-xl py-12 text-xs italic transition-colors"
                    style={{
                      borderColor: isTargetOver ? 'var(--accent)' : 'var(--border)',
                      color: isTargetOver ? 'var(--accent)' : 'var(--text-tertiary)',
                    }}
                  >
                    {isTargetOver ? 'Déposer la tâche ici' : 'Aucune tâche'}
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const priorityStyle = getPriorityStyle(task.priority);
                    const priorityCfg = PRIORITY_CONFIG[task.priority];
                    const isBeingDragged = draggingTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id);
                          setDraggingTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setDragOverColumn(null);
                        }}
                        className={`p-3.5 rounded-xl transition-all duration-150 group cursor-grab active:cursor-grabbing select-none ${
                          isBeingDragged ? 'opacity-30 scale-95' : 'hover:scale-[1.01]'
                        }`}
                        style={{
                          background: 'var(--bg-card-hover)',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-sm)',
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
                            type="button"
                            onClick={() => openEditModal(task)}
                            className="opacity-0 group-hover:opacity-100 p-1 transition-opacity rounded-md cursor-pointer"
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

                        {/* Status Switcher & Actions */}
                        <div
                          className="flex items-center justify-between mt-2.5 pt-2.5 text-xs"
                          style={{ borderTop: '1px solid var(--border)' }}
                        >
                          {/* Direct Status Buttons */}
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((s) => {
                              const isActive = task.status === s;
                              const statusLabels = {
                                TODO: 'À faire',
                                IN_PROGRESS: 'En cours',
                                DONE: 'Terminé',
                              };

                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleStatusChange(task.id, s)}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap"
                                  style={{
                                    background: isActive ? 'var(--accent)' : 'var(--bg-base)',
                                    color: isActive ? '#FFFFFF' : 'var(--text-tertiary)',
                                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                                  }}
                                >
                                  {statusLabels[s]}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDelete(task.id)}
                            className="p-1.5 transition-colors rounded-md hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] cursor-pointer"
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
