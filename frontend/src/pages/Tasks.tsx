import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';

import TaskCard from '../components/TaskCard';
import api from '../lib/api';
import { badgeTone, cn, getErrorMessage, taskPriorityLabels, taskStatusLabels } from '../lib/utils';
import type { Client, Project, Task, TaskPriority, TaskStatus } from '../types';

const columns: TaskStatus[] = ['pendente', 'andamento', 'concluida'];

const defaultForm = {
  title: '',
  description: '',
  priority: 'media' as TaskPriority,
  client_id: '',
  project_id: '',
  due_date: '',
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ priority: '', client_id: '', project_id: '' });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['clients', 'task-form'],
    queryFn: async () => (await api.get<Client[]>('/clients')).data,
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', 'task-form'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const response = await api.get<Task[]>('/tasks', {
        params: {
          priority: filters.priority || undefined,
          client_id: filters.client_id || undefined,
          project_id: filters.project_id || undefined,
        },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Título é obrigatório.');
      const response = await api.post<Task>('/tasks', {
        ...form,
        client_id: form.client_id || null,
        project_id: form.project_id || null,
        due_date: form.due_date || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setForm(defaultForm);
      setValidationError(null);
      setOpen(false);
    },
    onError: (error) => setValidationError(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; payload: Partial<Task> }) => {
      const response = await api.put<Task>(`/tasks/${taskId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });

  const groupedTasks = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    return columns.reduce<Record<TaskStatus, Task[]>>((accumulator, column) => {
      accumulator[column] = tasks.filter((task) => task.status === column);
      return accumulator;
    }, { pendente: [], andamento: [], concluida: [] });
  }, [tasksQuery.data]);

  const onDragStart = (task: Task, event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
  };

  const onDrop = (status: TaskStatus, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    const task = tasksQuery.data?.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    updateMutation.mutate({ taskId, payload: { status } });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-app-accent">Tarefas</p>
          <h1 className="mt-2 text-4xl font-extrabold text-white">Kanban operacional</h1>
          <p className="mt-2 text-zinc-400">Arraste cards entre colunas para atualizar o fluxo de execução.</p>
        </div>
        <button className="button-primary gap-2" onClick={() => setOpen(true)} type="button">
          <Plus className="h-4 w-4" />
          Nova tarefa
        </button>
      </div>

      <div className="panel p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <select className="select-base" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
            <option value="">Todas as prioridades</option>
            {Object.entries(taskPriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="select-base" value={filters.project_id} onChange={(event) => setFilters((current) => ({ ...current, project_id: event.target.value }))}>
            <option value="">Todos os projetos</option>
            {projectsQuery.data?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select className="select-base" value={filters.client_id} onChange={(event) => setFilters((current) => ({ ...current, client_id: event.target.value }))}>
            <option value="">Todos os clientes</option>
            {clientsQuery.data?.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
      </div>

      {tasksQuery.isLoading ? <div className="panel p-6 text-zinc-400">Carregando quadro...</div> : null}
      {tasksQuery.error ? <div className="panel p-6 text-rose-300">{getErrorMessage(tasksQuery.error)}</div> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        {columns.map((column) => (
          <section
            key={column}
            className="panel min-h-[28rem] p-5"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(column, event)}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{taskStatusLabels[column]}</h2>
                <p className="text-sm text-zinc-400">{groupedTasks[column].length} item(ns)</p>
              </div>
              <span className={cn('badge-base', badgeTone(column))}>{taskStatusLabels[column]}</span>
            </div>
            <div className="space-y-4">
              {groupedTasks[column].map((task) => (
                <TaskCard
                  key={task.id}
                  draggable
                  onDragStart={onDragStart}
                  task={task}
                  footer={(
                    <div className="flex items-center justify-between gap-3">
                      <button
                        className="button-secondary gap-2"
                        onClick={() => updateMutation.mutate({ taskId: task.id, payload: { status: task.status === 'concluida' ? 'pendente' : 'concluida' } })}
                        type="button"
                      >
                        {task.status === 'concluida' ? 'Reabrir' : 'Concluir'}
                      </button>
                      <button className="button-danger !px-3" onClick={() => deleteMutation.mutate(task.id)} type="button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                />
              ))}
              {groupedTasks[column].length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">Arraste uma tarefa para cá ou crie uma nova.</p> : null}
            </div>
          </section>
        ))}
      </div>

      {open ? (
        <div className="dialog-overlay no-print">
          <div className="dialog-panel">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Nova tarefa</h2>
                <p className="text-sm text-zinc-400">Cadastre entregas, follow-ups e ações internas.</p>
              </div>
              <button className="button-secondary !px-3" onClick={() => setOpen(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setValidationError(null);
                createMutation.mutate();
              }}
            >
              <div>
                <label className="field-label">Título</label>
                <input className="input-base" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div>
                <label className="field-label">Descrição</label>
                <textarea className="textarea-base" rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="field-label">Prioridade</label>
                  <select className="select-base" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                    {Object.entries(taskPriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Cliente</label>
                  <select className="select-base" value={form.client_id} onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value }))}>
                    <option value="">Opcional</option>
                    {clientsQuery.data?.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Projeto</label>
                  <select className="select-base" value={form.project_id} onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}>
                    <option value="">Opcional</option>
                    {projectsQuery.data?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Prazo</label>
                  <input className="input-base" type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} />
                </div>
              </div>
              {validationError ? <p className="text-sm text-rose-300">{validationError}</p> : null}
              <div className="flex justify-end gap-3">
                <button className="button-secondary" onClick={() => setOpen(false)} type="button">Cancelar</button>
                <button className="button-primary" disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? 'Salvando...' : 'Criar tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
