import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ProjectCard from '../components/ProjectCard';
import api from '../lib/api';
import { getErrorMessage, projectStatusLabels } from '../lib/utils';
import type { Client, Project, ProjectStatus } from '../types';

const filters: Array<{ key: 'all' | ProjectStatus; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'andamento', label: 'Em Andamento' },
  { key: 'entregue', label: 'Entregues' },
  { key: 'planejamento', label: 'Planejamento' },
  { key: 'cancelado', label: 'Cancelados' },
];

const defaultForm = {
  client_id: '',
  name: '',
  description: '',
  status: 'planejamento' as ProjectStatus,
  value: '',
  started_at: '',
  deadline: '',
  delivered_at: '',
};

export default function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<'all' | ProjectStatus>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['clients', 'project-form'],
    queryFn: async () => (await api.get<Client[]>('/clients')).data,
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', activeFilter],
    queryFn: async () => {
      const response = await api.get<Project[]>('/projects', {
        params: { status: activeFilter === 'all' ? undefined : activeFilter },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error('Selecione um cliente.');
      if (!form.name.trim()) throw new Error('Nome do projeto é obrigatório.');
      const response = await api.post<Project>('/projects', {
        ...form,
        description: form.description || null,
        value: form.value ? Number(form.value) : null,
        started_at: form.started_at || null,
        deadline: form.deadline || null,
        delivered_at: form.delivered_at || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      setForm(defaultForm);
      setValidationError(null);
    },
    onError: (error) => setValidationError(getErrorMessage(error)),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-app-accent">Projetos</p>
          <h1 className="mt-2 text-4xl font-extrabold text-white">Entrega e margem</h1>
          <p className="mt-2 text-zinc-400">Acompanhe frentes ativas, prazos e valores negociados.</p>
        </div>
        <button className="button-primary gap-2" onClick={() => setOpen(true)} type="button">
          <Plus className="h-4 w-4" />
          Novo projeto
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            className={`button-secondary ${activeFilter === filter.key ? '!border-app-accent !bg-app-accent !text-white' : ''}`}
            onClick={() => setActiveFilter(filter.key)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      {projectsQuery.isLoading ? <div className="panel p-6 text-zinc-400">Carregando projetos...</div> : null}
      {projectsQuery.error ? <div className="panel p-6 text-rose-300">{getErrorMessage(projectsQuery.error)}</div> : null}
      {projectsQuery.data && projectsQuery.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {projectsQuery.data.map((project) => (
            <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projects/${project.id}`)} />
          ))}
        </div>
      ) : null}
      {projectsQuery.data && projectsQuery.data.length === 0 ? <div className="panel p-8 text-center text-zinc-400">Nenhum projeto encontrado para este filtro.</div> : null}

      {open ? (
        <div className="dialog-overlay no-print">
          <div className="dialog-panel">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Novo projeto</h2>
                <p className="text-sm text-zinc-400">Crie uma nova entrega associada a um cliente.</p>
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
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Cliente</label>
                  <select className="select-base" value={form.client_id} onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value }))}>
                    <option value="">Selecione</option>
                    {clientsQuery.data?.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="select-base" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProjectStatus }))}>
                    {Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Nome</label>
                <input className="input-base" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </div>

              <div>
                <label className="field-label">Descrição</label>
                <textarea className="textarea-base" rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="field-label">Valor</label>
                  <input className="input-base" min="0" step="0.01" type="number" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Início</label>
                  <input className="input-base" type="date" value={form.started_at} onChange={(event) => setForm((current) => ({ ...current, started_at: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Prazo</label>
                  <input className="input-base" type="date" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Entrega</label>
                  <input className="input-base" type="date" value={form.delivered_at} onChange={(event) => setForm((current) => ({ ...current, delivered_at: event.target.value }))} />
                </div>
              </div>

              {validationError ? <p className="text-sm text-rose-300">{validationError}</p> : null}
              <div className="flex justify-end gap-3">
                <button className="button-secondary" onClick={() => setOpen(false)} type="button">Cancelar</button>
                <button className="button-primary" disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? 'Salvando...' : 'Criar projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
