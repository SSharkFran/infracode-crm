import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';

import api from '../../lib/api';
import { PROJECT_STATUS_VALUES } from '../../lib/constants';
import { extractValidationIssues, getErrorMessage, projectStatusLabels } from '../../lib/utils';
import type { Client, Project, ProjectStatus } from '../../types';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';

interface ProjectFormProps {
  clients: Client[];
  project?: Project | null;
  defaultClientId?: string;
  onSuccess?: (project: Project) => void;
  onCancel?: () => void;
}

export function ProjectForm({ clients, defaultClientId = '', onCancel, onSuccess, project }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    client_id: defaultClientId,
    name: '',
    description: '',
    status: 'planejamento' as ProjectStatus,
    value: '',
    started_at: '',
    deadline: '',
    delivered_at: '',
  });

  useEffect(() => {
    if (!project) return;
    setForm({
      client_id: project.client_id,
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      value: project.value ?? '',
      started_at: project.started_at?.slice(0, 10) ?? '',
      deadline: project.deadline?.slice(0, 10) ?? '',
      delivered_at: project.delivered_at?.slice(0, 10) ?? '',
    });
  }, [project]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error('Selecione um cliente.');
      if (!form.name.trim()) throw new Error('Nome do projeto é obrigatório.');
      const payload = {
        ...form,
        description: form.description || null,
        value: form.value ? Number(form.value) : null,
        started_at: form.started_at || null,
        deadline: form.deadline || null,
        delivered_at: form.delivered_at || null,
      };
      const response = project
        ? await api.put<Project>(`/projects/${project.id}`, payload)
        : await api.post<Project>('/projects', payload);
      return response.data;
    },
    onSuccess: (savedProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success(project ? 'Projeto atualizado com sucesso.' : 'Projeto criado com sucesso.');
      setErrors([]);
      onSuccess?.(savedProject);
    },
    onError: (error) => {
      const validationErrors = extractValidationIssues(error);
      setErrors(validationErrors.length > 0 ? validationErrors : [getErrorMessage(error)]);
    },
  });

  return (
    <form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setErrors([]); mutation.mutate(); }}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Cliente</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value }))} value={form.client_id}>
            <option value="">Selecione</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProjectStatus }))} value={form.status}>
            {PROJECT_STATUS_VALUES.map((value) => <option key={value} value={value}>{projectStatusLabels[value]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label">Nome</label>
        <input className="input" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
      </div>
      <div>
        <label className="field-label">Descrição</label>
        <textarea className="textarea" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} value={form.description} />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="field-label">Valor</label>
          <input className="input" min="0" onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} step="0.01" type="number" value={form.value} />
        </div>
        <div>
          <label className="field-label">Início</label>
          <input className="input" onChange={(event) => setForm((current) => ({ ...current, started_at: event.target.value }))} type="date" value={form.started_at} />
        </div>
        <div>
          <label className="field-label">Prazo</label>
          <input className="input" onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} type="date" value={form.deadline} />
        </div>
        <div>
          <label className="field-label">Entrega</label>
          <input className="input" onChange={(event) => setForm((current) => ({ ...current, delivered_at: event.target.value }))} type="date" value={form.delivered_at} />
        </div>
      </div>
      {errors.length > 0 ? <div className="space-y-1 text-sm text-danger-text">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="flex justify-end gap-3">
        {onCancel ? <Button onClick={onCancel} variant="secondary">Cancelar</Button> : null}
        <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Salvando...' : project ? 'Salvar projeto' : 'Criar projeto'}</Button>
      </div>
    </form>
  );
}
