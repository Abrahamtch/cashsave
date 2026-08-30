'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Task, TaskPriority, TaskStatus, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, CheckCircle2, Clock, AlertCircle, Trash2, Calendar, X, Edit3, GripVertical } from 'lucide-react';

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title,
          deadline: deadline || null,
          priority,
          status,
        })
        .eq('id', editingTask.id);

      if (!error) {
        setShowModal(false);
        loadTasks();
      }
    } else {
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title,
        deadline: deadline || null,
        priority,
        status,
      });

      if (!error) {
        setShowModal(false);
        loadTasks();
      }
    }
    setSaving(false);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  };

  const handleDelete = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  const tasksByStatus = {
    TODO: tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter(t => t.status === 'DONE'),
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">To-Do List</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Gestion de vos tâches et priorités</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          id="add-task-btn"
        >
          <Plus className="w-4 h-4" /> Nouvelle tâche
        </button>
      </div>

      {/* Kanban Board / Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((statusKey) => {
          const config = STATUS_CONFIG[statusKey];
          const columnTasks = tasksByStatus[statusKey];

          return (
            <div key={statusKey} className="glass-card p-4 flex flex-col h-full min-h-[320px]">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">({columnTasks.length})</span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs italic">
                    Aucune tâche
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const priorityCfg = PRIORITY_CONFIG[task.priority];
                    return (
                      <div
                        key={task.id}
                        className="bg-white/5 dark:bg-white/[0.03] border border-white/10 dark:border-white/5 rounded-xl p-3 hover:border-indigo-500/30 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className={`text-sm font-medium leading-snug ${task.status === 'DONE' ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </h4>
                          <button
                            onClick={() => openEditModal(task)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-opacity"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/5">
                          {/* Priority badge */}
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium ${priorityCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                            {priorityCfg.label}
                          </span>

                          {/* Deadline */}
                          {task.deadline && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.deadline), 'dd MMM', { locale: fr })}
                            </span>
                          )}
                        </div>

                        {/* Status Switcher Action */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5 text-xs">
                          <div className="flex items-center gap-1">
                            {statusKey !== 'TODO' && (
                              <button
                                onClick={() => handleStatusChange(task.id, statusKey === 'DONE' ? 'IN_PROGRESS' : 'TODO')}
                                className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400"
                              >
                                ← Reculer
                              </button>
                            )}
                            {statusKey !== 'DONE' && (
                              <button
                                onClick={() => handleStatusChange(task.id, statusKey === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                                className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-medium"
                              >
                                Avancer →
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                {editingTask ? 'Éditer la tâche' : 'Nouvelle tâche'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Titre de la tâche</label>
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
                  <label className="block text-xs font-medium text-gray-400 mb-1">Priorité</label>
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
                  <label className="block text-xs font-medium text-gray-400 mb-1">Statut</label>
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

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Date limite</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full py-2.5 mt-2"
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
