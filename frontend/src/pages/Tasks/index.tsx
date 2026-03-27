import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';

import api from '../../lib/api';
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from '../../lib/constants';
import { formatDateBR, getDaysOverdue, isHtmlInputFocused, priorityBorderColor, taskPriorityLabels, taskStatusLabels, truncate } from '../../lib/utils';
import type { Client, Project, Task, TaskPriority, TaskStatus } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonKanban } from '../../components/ui/Skeleton';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { KanbanCard } from '../../components/kanban/KanbanCard';
import { KanbanColumn } from '../../components/kanban/KanbanColumn';
import { TaskForm } from '../../components/forms/TaskForm';
import { useConfirm } from '../../hooks/useConfirm';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSessionStorage } from '../../hooks/useSessionStorage';
import { useToast } from '../../hooks/useToast';

const DEFAULT_FILTERS = {
  priorities: [] as TaskPriority[],
  project_id: '',
  client_id: '',
  onlyMine: false,
  onlyToday: false,
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [filters, setFilters] = useSessionStorage('tasks-filters', DEFAULT_FILTERS);
  const [openColumn, setOpenColumn] = useState<TaskStatus | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['tasks', 'clients'],
    queryFn: async () => (await api.get<Client[]>('/clients')).data,
  });
  const projectsQuery = useQuery({
    queryKey: ['tasks', 'projects'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', 'board', filters],
    queryFn: async () => {
      const priorities = filters.priorities.length > 0 ? filters.priorities : [undefined];
      const results = await Promise.all(
        priorities.map(async (priority) => {
          const response = await api.get<Task[]>('/tasks', {
            params: {
              priority: priority || undefined,
              project_id: filters.project_id || undefined,
              client_id: filters.client_id || undefined,
              due_today: filters.onlyToday || undefined,
            },
          });

          return response.data;
        }),
      );

      return Array.from(new Map(results.flat().map((task) => [task.id, task])).values());
    },
  });

  useKeyboard('n', () => {
    if (!isHtmlInputFocused()) setOpenColumn('pendente');
  });

  const groupedTasks = useMemo(() => TASK_STATUS_VALUES.reduce<Record<TaskStatus, Task[]>>((accumulator, status) => ({ ...accumulator, [status]: (tasksQuery.data ?? []).filter((task) => task.status === status) }), { pendente: [], andamento: [], concluida: [] }), [tasksQuery.data]);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => (await api.put<Task>(`/tasks/${taskId}`, { status })).data,
    onMutate: async ({ status, taskId }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'board', filters] });
      const previous = queryClient.getQueryData<Task[]>(['tasks', 'board', filters]);
      queryClient.setQueryData<Task[]>(['tasks', 'board', filters], (current = []) => current.map((task) => task.id === taskId ? { ...task, status } : task));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['tasks', 'board', filters], context?.previous);
      toast.error('Não foi possível atualizar a tarefa.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => { await api.delete(`/tasks/${taskId}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa removida.');
    },
  });

  const handleDrop = (status: TaskStatus, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    const task = tasksQuery.data?.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    updateTaskMutation.mutate({ taskId, status });
  };

  const togglePriority = (priority: TaskPriority) => {
    setFilters({
      ...filters,
      priorities: filters.priorities.includes(priority) ? filters.priorities.filter((item) => item !== priority) : [...filters.priorities, priority],
    });
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tarefas</h1>
          <p className="page-subtitle">Kanban premium com filtros persistentes e atualização otimista.</p>
        </div>
      </div>

      <div className="card space-y-5 p-5">
        <div>
          <label className="field-label">Prioridade</label>
          <div className="flex flex-wrap gap-2">
            {TASK_PRIORITY_VALUES.map((priority) => <button key={priority} className={`pill-filter ${filters.priorities.includes(priority) ? 'pill-filter-active' : ''}`} onClick={() => togglePriority(priority)} type="button">{taskPriorityLabels[priority]}</button>)}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SearchableSelect onChange={(value) => setFilters({ ...filters, project_id: value })} options={[{ label: 'Todos os projetos', value: '' }, ...(projectsQuery.data ?? []).map((project) => ({ label: project.name, value: project.id }))]} value={filters.project_id} />
          <SearchableSelect onChange={(value) => setFilters({ ...filters, client_id: value })} options={[{ label: 'Todos os clientes', value: '' }, ...(clientsQuery.data ?? []).map((client) => ({ label: client.name, value: client.id }))]} value={filters.client_id} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="switch" data-checked={filters.onlyMine} disabled type="button"><span className="switch-thumb" /></button>
          <span className="text-sm text-text-secondary">Só minhas (indisponível na API atual)</span>
          <button className="switch ml-4" data-checked={filters.onlyToday} onClick={() => setFilters({ ...filters, onlyToday: !filters.onlyToday })} type="button"><span className="switch-thumb" /></button>
          <span className="text-sm text-text-secondary">Só hoje</span>
        </div>
      </div>

      {tasksQuery.isLoading ? <SkeletonKanban /> : null}

      {!tasksQuery.isLoading ? (
        <KanbanBoard>
          {TASK_STATUS_VALUES.map((status) => (
            <KanbanColumn key={status} count={groupedTasks[status].length} onAdd={() => setOpenColumn(status)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(status, event)} title={taskStatusLabels[status]}>
              {openColumn === status ? (
                <div className="rounded-card border border-border bg-surface p-4">
                  <TaskForm clients={clientsQuery.data ?? []} defaultStatus={status} onCancel={() => setOpenColumn(null)} onSuccess={() => setOpenColumn(null)} projects={projectsQuery.data ?? []} showStatus={false} />
                </div>
              ) : null}
              {groupedTasks[status].length > 0 ? groupedTasks[status].map((task) => (
                <KanbanCard key={task.id} className={`border-t-4 ${priorityBorderColor(task.priority)}`} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{task.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{truncate(task.description || 'Sem descrição detalhada.', 110)}</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-text-tertiary" />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar name={task.project_name || task.client_name || task.title} size="sm" />
                    <div className="text-sm text-text-secondary">{task.project_name || task.client_name || 'Sem vínculo'}</div>
                  </div>
                  <div className={`mt-4 flex items-center gap-2 text-sm ${task.due_date && getDaysOverdue(task.due_date) > 0 ? 'text-danger-text' : task.due_date && getDaysOverdue(task.due_date) === 0 ? 'text-warning-text' : 'text-text-secondary'}`}>
                    <Clock3 className="h-4 w-4" />
                    {formatDateBR(task.due_date)}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge statusValue={task.priority}>{taskPriorityLabels[task.priority]}</Badge>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: task.status === 'pendente' ? 'andamento' : task.status === 'andamento' ? 'concluida' : 'pendente' })} variant="secondary">Avançar</Button>
                      <Button onClick={async () => { if (await confirm('Deseja excluir esta tarefa?')) deleteTaskMutation.mutate(task.id); }} variant="danger"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </KanbanCard>
              )) : <EmptyState action={{ label: 'Criar tarefa nesta coluna', onClick: () => setOpenColumn(status) }} description="Use o botão acima para adicionar uma tarefa já neste estágio." icon={<Plus className="h-5 w-5" />} title="Nenhuma tarefa nesta coluna" />}
            </KanbanColumn>
          ))}
        </KanbanBoard>
      ) : null}
    </div>
  );
}
