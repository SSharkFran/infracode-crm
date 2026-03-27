import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';

import api from '../../lib/api';
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from '../../lib/constants';
import { extractValidationIssues, getErrorMessage, taskPriorityLabels, taskStatusLabels } from '../../lib/utils';
import type { Client, Project, Task, TaskPriority, TaskStatus } from '../../types';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';

interface TaskFormProps {
  clients: Client[];
  projects: Project[];
  task?: Task | null;
  defaultStatus?: TaskStatus;
  defaultClientId?: string;
  defaultProjectId?: string;
  showStatus?: boolean;
  onSuccess?: (task: Task) => void;
  onCancel?: () => void;
}

export function TaskForm({
  clients,
  defaultClientId = '',
  defaultProjectId = '',
  defaultStatus = 'pendente',
  onCancel,
  onSuccess,
  projects,
  showStatus = true,
  task,
}: TaskFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'media' as TaskPriority,
    status: defaultStatus,
    client_id: defaultClientId,
    project_id: defaultProjectId,
    due_date: '',
  });

  useEffect(() => {
    if (!task) return;
    setForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      status: task.status,
      client_id: task.client_id ?? '',
      project_id: task.project_id ?? '',
      due_date: task.due_date?.slice(0, 10) ?? '',
    });
  }, [task]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Título é obrigatório.');
      const payload = {
        ...form,
        client_id: form.client_id || null,
        project_id: form.project_id || null,
        due_date: form.due_date || null,
      };
      const response = task ? await api.put<Task>(`/tasks/${task.id}`, payload) : await api.post<Task>('/tasks', payload);
      return response.data;
    },
    onSuccess: (savedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success(task ? 'Tarefa atualizada com sucesso.' : 'Tarefa criada com sucesso.');
      setErrors([]);
      onSuccess?.(savedTask);
    },
    onError: (error) => {
      const validationErrors = extractValidationIssues(error);
      setErrors(validationErrors.length > 0 ? validationErrors : [getErrorMessage(error)]);
    },
  });

  return (
    <form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setErrors([]); mutation.mutate(); }}>
      <div>
        <label className="field-label">Título</label>
        <input className="input" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} value={form.title} />
      </div>
      <div>
        <label className="field-label">Descrição</label>
        <textarea className="textarea" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} value={form.description} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="field-label">Prioridade</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))} value={form.priority}>
            {TASK_PRIORITY_VALUES.map((value) => <option key={value} value={value}>{taskPriorityLabels[value]}</option>)}
          </select>
        </div>
        {showStatus ? (
          <div>
            <label className="field-label">Status</label>
            <select className="select" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))} value={form.status}>
              {TASK_STATUS_VALUES.map((value) => <option key={value} value={value}>{taskStatusLabels[value]}</option>)}
            </select>
          </div>
        ) : null}
        <div>
          <label className="field-label">Cliente</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value }))} value={form.client_id}>
            <option value="">Opcional</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Projeto</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))} value={form.project_id}>
            <option value="">Opcional</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label">Prazo</label>
        <input className="input" onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} type="date" value={form.due_date} />
      </div>
      {errors.length > 0 ? <div className="space-y-1 text-sm text-danger-text">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="flex justify-end gap-3">
        {onCancel ? <Button onClick={onCancel} variant="secondary">Cancelar</Button> : null}
        <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Salvando...' : task ? 'Salvar tarefa' : 'Criar tarefa'}</Button>
      </div>
    </form>
  );
}
