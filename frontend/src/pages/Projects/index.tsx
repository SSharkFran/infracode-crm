import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutList, Plus, Rows3 } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';

import api from '../../lib/api';
import { PROJECTS_VIEW_STORAGE_KEY, PROJECT_STATUS_VALUES } from '../../lib/constants';
import { formatCurrencyBRL, formatDateBR, groupBy, isHtmlInputFocused, projectStatusLabels } from '../../lib/utils';
import type { Client, Project, ProjectStatus, Task } from '../../types';
import { ProjectForm } from '../../components/forms/ProjectForm';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { KanbanCard } from '../../components/kanban/KanbanCard';
import { KanbanColumn } from '../../components/kanban/KanbanColumn';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { SkeletonKanban, SkeletonTable } from '../../components/ui/Skeleton';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSessionStorage } from '../../hooks/useSessionStorage';
import { useToast } from '../../hooks/useToast';

const DEFAULT_FILTERS = { search: '', client_id: '' };
const statusBorder: Record<ProjectStatus, string> = {
  planejamento: 'border-l-accent',
  andamento: 'border-l-info',
  entregue: 'border-l-success',
  cancelado: 'border-l-danger',
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useLocalStorage<'list' | 'kanban'>(PROJECTS_VIEW_STORAGE_KEY, 'kanban');
  const [filters, setFilters] = useSessionStorage('projects-filters', DEFAULT_FILTERS);
  const [createOpen, setCreateOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
  const tasksQuery = useQuery({
    queryKey: ['projects', 'tasks'],
    queryFn: async () => (await api.get<Task[]>('/tasks')).data,
  });
  const clientsQuery = useQuery({
    queryKey: ['projects', 'clients'],
    queryFn: async () => (await api.get<Client[]>('/clients')).data,
  });

  useKeyboard('n', () => {
    if (!isHtmlInputFocused()) setCreateOpen(true);
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string; status: ProjectStatus }) => (await api.put<Project>(`/projects/${projectId}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Status do projeto atualizado.');
    },
  });

  const taskMap = useMemo(() => groupBy(tasksQuery.data ?? [], 'project_id'), [tasksQuery.data]);
  const filteredProjects = useMemo(() => (projectsQuery.data ?? []).filter((project) => {
    if (filters.client_id && project.client_id !== filters.client_id) return false;
    if (filters.search && !`${project.name} ${project.client_name ?? ''}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }), [projectsQuery.data, filters]);
  const groupedProjects = useMemo(() => PROJECT_STATUS_VALUES.reduce<Record<ProjectStatus, Project[]>>((accumulator, status) => ({ ...accumulator, [status]: filteredProjects.filter((project) => project.status === status) }), { planejamento: [], andamento: [], entregue: [], cancelado: [] }), [filteredProjects]);

  const handleDrop = (status: ProjectStatus, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const projectId = event.dataTransfer.getData('text/plain');
    const project = filteredProjects.find((item) => item.id === projectId);
    if (!project || project.status === status) return;
    updateStatusMutation.mutate({ projectId, status });
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-subtitle">Alterne entre lista e kanban, com persistência de visualização.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-pill border border-border bg-surface p-1">
            <button className={`rounded-pill px-3 py-1.5 text-sm ${view === 'list' ? 'bg-accent-subtle text-text-primary' : 'text-text-secondary'}`} onClick={() => setView('list')} type="button"><LayoutList className="h-4 w-4" /></button>
            <button className={`rounded-pill px-3 py-1.5 text-sm ${view === 'kanban' ? 'bg-accent-subtle text-text-primary' : 'text-text-secondary'}`} onClick={() => setView('kanban')} type="button"><Rows3 className="h-4 w-4" /></button>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Novo projeto</Button>
        </div>
      </div>

      <div className="card grid gap-4 p-5 md:grid-cols-[1fr_20rem]">
        <input className="input" onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar por nome do projeto ou cliente" value={filters.search} />
        <SearchableSelect onChange={(value) => setFilters({ ...filters, client_id: value })} options={[{ label: 'Todos os clientes', value: '' }, ...(clientsQuery.data ?? []).map((client) => ({ label: client.name, value: client.id }))]} value={filters.client_id} />
      </div>

      {projectsQuery.isLoading || tasksQuery.isLoading ? (view === 'kanban' ? <SkeletonKanban /> : <SkeletonTable />) : null}

      {!projectsQuery.isLoading && filteredProjects.length === 0 ? <EmptyState description="Comece criando um projeto ou afine os filtros." icon={<Rows3 className="h-5 w-5" />} title="Nenhum projeto encontrado" /> : null}

      {filteredProjects.length > 0 && view === 'kanban' ? (
        <KanbanBoard>
          {PROJECT_STATUS_VALUES.map((status) => (
            <KanbanColumn key={status} count={groupedProjects[status].length} title={projectStatusLabels[status]} onDrop={(event) => handleDrop(status, event)} onDragOver={(event) => event.preventDefault()}>
              {groupedProjects[status].length > 0 ? groupedProjects[status].map((project) => {
                const tasks = taskMap[project.id] ?? [];
                const pendingCount = tasks.filter((task) => task.status !== 'concluida').length;
                return (
                  <KanbanCard key={project.id} className={`border-l-4 ${statusBorder[project.status]}`} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', project.id)}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3"><div><p className="font-medium text-text-primary">{project.name}</p><p className="text-sm text-text-secondary">{project.client_name || 'Sem cliente'}</p></div><Badge statusValue={project.status}>{projectStatusLabels[project.status]}</Badge></div>
                      <div className="text-sm text-text-secondary"><p>Valor {formatCurrencyBRL(project.value)}</p><p className={project.deadline && new Date(project.deadline) < new Date() ? 'text-danger-text' : ''}>Deadline {formatDateBR(project.deadline)}</p></div>
                      <p className="text-sm text-text-secondary">{pendingCount} tarefa(s) pendentes</p>
                    </div>
                  </KanbanCard>
                );
              }) : <EmptyState description="Arraste um projeto para esta coluna ou crie um novo fluxo." icon={<Plus className="h-5 w-5" />} title="Coluna vazia" />}
            </KanbanColumn>
          ))}
        </KanbanBoard>
      ) : null}

      {filteredProjects.length > 0 && view === 'list' ? (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Projeto</th><th>Cliente</th><th>Status</th><th>Valor</th><th>Deadline</th><th>Progresso</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredProjects.map((project) => {
                const tasks = taskMap[project.id] ?? [];
                const completed = tasks.filter((task) => task.status === 'concluida').length;
                const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
                return (
                  <tr key={project.id}>
                    <td className="text-text-primary">{project.name}</td>
                    <td>{project.client_name || '-'}</td>
                    <td><Badge statusValue={project.status}>{projectStatusLabels[project.status]}</Badge></td>
                    <td className="text-text-primary">{formatCurrencyBRL(project.value)}</td>
                    <td className={project.deadline && new Date(project.deadline) < new Date() ? 'text-danger-text' : ''}>{formatDateBR(project.deadline)}</td>
                    <td>
                      <div className="w-40">
                        <div className="h-2 rounded-full bg-elevated"><div className="h-2 rounded-full bg-accent" style={{ width: `${progress}%` }} /></div>
                        <p className="mt-1 text-xs text-text-tertiary">{progress}% concluído</p>
                      </div>
                    </td>
                    <td><LinkButton to={`/projects/${project.id}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal description="Crie um novo projeto e ele já aparece no quadro escolhido." onClose={() => setCreateOpen(false)} open={createOpen} size="lg" title="Novo projeto">
        <ProjectForm clients={clientsQuery.data ?? []} onCancel={() => setCreateOpen(false)} onSuccess={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}

function LinkButton({ to }: { to: string }) {
  return <Link className="btn-secondary" to={to}>Abrir</Link>;
}
