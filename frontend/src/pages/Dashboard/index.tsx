import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, CircleDollarSign, FolderKanban, Plus, Receipt, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../lib/api';
import { formatCurrencyBRL, formatRelativeTime, getDaysOverdue, groupBy, projectStatusLabels, taskPriorityLabels } from '../../lib/utils';
import type { Client, ClientDetail, Project, ReceivablesReport, RevenueByMonthItem, Task, Transaction } from '../../types';
import { KPISparkline } from '../../components/charts/KPISparkline';
import ProjectStatusChart from '../../components/charts/ProjectStatusChart';
import RevenueChart from '../../components/charts/RevenueChart';
import { ClientForm } from '../../components/forms/ClientForm';
import { TaskForm } from '../../components/forms/TaskForm';
import { TransactionForm } from '../../components/forms/TransactionForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCard, SkeletonText } from '../../components/ui/Skeleton';
import { useKeyboard } from '../../hooks/useKeyboard';
import { isHtmlInputFocused } from '../../lib/utils';

type QuickAction = 'client' | 'task' | 'transaction' | null;

const projectStatusColors: Record<string, string> = {
  planejamento: '#818cf8',
  andamento: '#6366f1',
  entregue: '#22c55e',
  cancelado: '#ef4444',
};

export default function DashboardPage() {
  const [quickAction, setQuickAction] = useState<QuickAction>(null);

  const clientsQuery = useQuery({
    queryKey: ['dashboard', 'clients'],
    queryFn: async () => (await api.get<Client[]>('/clients')).data,
  });
  const projectsQuery = useQuery({
    queryKey: ['dashboard', 'projects'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
  const tasksQuery = useQuery({
    queryKey: ['dashboard', 'tasks'],
    queryFn: async () => (await api.get<Task[]>('/tasks')).data,
  });
  const dueTodayTasksQuery = useQuery({
    queryKey: ['dashboard', 'tasks', 'today'],
    queryFn: async () => (await api.get<Task[]>('/tasks', { params: { due_today: true } })).data,
  });
  const revenueQuery = useQuery({
    queryKey: ['dashboard', 'revenue'],
    queryFn: async () => (await api.get<RevenueByMonthItem[]>('/reports/revenue-by-month')).data,
  });
  const receivablesQuery = useQuery({
    queryKey: ['dashboard', 'receivables'],
    queryFn: async () => (await api.get<ReceivablesReport>('/reports/receivables')).data,
  });
  const clientDetailsQuery = useQuery({
    enabled: Boolean(clientsQuery.data?.length),
    queryKey: ['dashboard', 'client-details', clientsQuery.data?.map((client) => client.id).join(',')],
    queryFn: async () => Promise.all((clientsQuery.data ?? []).map(async (client) => (await api.get<ClientDetail>(`/clients/${client.id}`)).data)),
  });

  useKeyboard('n', () => {
    if (!isHtmlInputFocused()) {
      setQuickAction('client');
    }
  });

  const isLoading = [clientsQuery, projectsQuery, tasksQuery, dueTodayTasksQuery, revenueQuery, receivablesQuery].some((query) => query.isLoading);
  const activeClients = useMemo(() => (clientsQuery.data ?? []).filter((client) => client.status === 'ativo'), [clientsQuery.data]);
  const currentMonthRevenue = Number(revenueQuery.data?.slice(-1)[0]?.total_received ?? 0);
  const revenueSparkline = (revenueQuery.data ?? []).slice(-6).map((item) => ({ value: Number(item.total_received) }));
  const overdueGroup = receivablesQuery.data?.groups.find((group) => group.status === 'vencido');
  const urgentToday = (dueTodayTasksQuery.data ?? []).filter((task) => task.priority === 'urgente' && task.status !== 'concluida');
  const projectTasks = groupBy(tasksQuery.data ?? [], 'project_id');
  const inProgressProjects = (projectsQuery.data ?? []).filter((project) => project.status === 'andamento');
  const averageProgress = inProgressProjects.length > 0
    ? Math.round(
        inProgressProjects.reduce((total, project) => {
          const tasks = projectTasks[project.id] ?? [];
          const done = tasks.filter((task) => task.status === 'concluida').length;
          return total + (tasks.length > 0 ? (done / tasks.length) * 100 : 0);
        }, 0) / inProgressProjects.length,
      )
    : 0;
  const activeClientsDelta = useMemo(() => {
    const now = new Date();
    const currentMonth = activeClients.filter((client) => new Date(client.created_at).getMonth() === now.getMonth()).length;
    const previousMonth = activeClients.filter((client) => new Date(client.created_at).getMonth() === new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth()).length;
    return currentMonth - previousMonth;
  }, [activeClients]);
  const projectStatusData = useMemo(
    () => Object.entries(groupBy(projectsQuery.data ?? [], 'status')).map(([status, items]) => ({ name: projectStatusLabels[status as keyof typeof projectStatusLabels], value: items.length, color: projectStatusColors[status] })),
    [projectsQuery.data],
  );
  const latestInteractions = useMemo(
    () => (clientDetailsQuery.data ?? [])
      .flatMap((client) => client.interactions.map((interaction) => ({ ...interaction, clientName: client.name })))
      .sort((left, right) => new Date(right.happened_at).getTime() - new Date(left.happened_at).getTime())
      .slice(0, 5),
    [clientDetailsQuery.data],
  );
  const todayTasks = (dueTodayTasksQuery.data ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operação do dia</h1>
          <p className="page-subtitle">Receita, clientes, entrega e urgências em um único painel premium.</p>
        </div>
      </div>

      {overdueGroup?.count ? (
        <div className="card flex items-start gap-4 border-danger/20 bg-danger-subtle p-5 text-danger-text">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Recebíveis vencidos exigem ação imediata</p>
            <p className="mt-1 text-sm text-danger-text/80">{overdueGroup.count} lançamento(s) em atraso somando {formatCurrencyBRL(overdueGroup.total_amount)}.</p>
          </div>
          <Link className="btn-secondary" to="/finance">Ver recebíveis</Link>
        </div>
      ) : null}

      {urgentToday.length > 0 ? (
        <div className="card flex items-start gap-4 border-warning/20 bg-warning-subtle p-5 text-warning-text">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Tarefas urgentes vencendo hoje</p>
            <p className="mt-1 text-sm text-warning-text/80">{urgentToday.length} tarefa(s) críticas precisam de atenção nesta data.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />) : (
          <>
            <div className="card p-5">
              <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Receita do mês</span><CircleDollarSign className="h-5 w-5 text-accent-text" /></div>
              <p className="mt-4 text-3xl font-semibold text-text-primary">{formatCurrencyBRL(currentMonthRevenue)}</p>
              <div className="mt-4 flex items-center justify-between"><span className="text-xs text-text-tertiary">Últimos 6 meses</span><KPISparkline data={revenueSparkline} /></div>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Clientes ativos</span><Users className="h-5 w-5 text-info-text" /></div>
              <p className="mt-4 text-3xl font-semibold text-text-primary">{activeClients.length}</p>
              <p className="mt-4 text-sm text-text-secondary">Delta vs mês anterior: <span className={activeClientsDelta >= 0 ? 'text-success-text' : 'text-danger-text'}>{activeClientsDelta >= 0 ? '+' : ''}{activeClientsDelta}</span></p>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Projetos em andamento</span><FolderKanban className="h-5 w-5 text-accent-text" /></div>
              <p className="mt-4 text-3xl font-semibold text-text-primary">{inProgressProjects.length}</p>
              <p className="mt-4 text-sm text-text-secondary">Progresso médio de tarefas: {averageProgress}%</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Tarefas para hoje</span><CalendarClock className="h-5 w-5 text-danger-text" /></div>
              <div className="mt-4 flex items-center gap-3">
                <p className="text-3xl font-semibold text-text-primary">{todayTasks.length}</p>
                {todayTasks.length > 0 ? <Badge tone="danger">atenção</Badge> : null}
              </div>
              <p className="mt-4 text-sm text-text-secondary">Atrasadas: {(todayTasks.filter((task) => task.due_date && getDaysOverdue(task.due_date) > 0)).length}</p>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-6">{revenueQuery.isLoading ? <SkeletonText lines={8} /> : <RevenueChart data={revenueQuery.data ?? []} />}</section>
        <section className="card p-6">
          <div className="mb-4">
            <h2 className="section-title">Pipeline por status</h2>
            <p className="text-sm text-text-secondary">Distribuição atual da carteira de projetos.</p>
          </div>
          {projectStatusData.length > 0 ? (
            <>
              <ProjectStatusChart data={projectStatusData} />
              <div className="mt-4 space-y-2">
                {projectStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-button border border-border px-3 py-2">
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</div>
                    <span className="text-sm font-semibold text-text-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState description="Quando projetos entrarem no pipeline, o funil aparecerá aqui." icon={<FolderKanban className="h-5 w-5" />} title="Sem pipeline ainda" />}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4">
            <h2 className="section-title">Últimas interações com clientes</h2>
            <p className="text-sm text-text-secondary">Timeline compacta com os últimos toques do relacionamento.</p>
          </div>
          {latestInteractions.length > 0 ? (
            <div className="space-y-4">
              {latestInteractions.map((interaction) => (
                <div key={interaction.id} className="relative border-l border-border pl-4">
                  <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-accent" />
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-text-primary">{interaction.clientName}</p>
                    <span className="text-xs text-text-tertiary" title={interaction.happened_at}>{formatRelativeTime(interaction.happened_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{interaction.summary}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState description="As interações registradas pelos atendimentos aparecerão aqui." icon={<Users className="h-5 w-5" />} title="Sem interações recentes" />}
        </section>
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="section-title">Tarefas para hoje</h2><p className="text-sm text-text-secondary">Prioridades com vencimento imediato.</p></div>
            <Link className="btn-secondary" to="/tasks">Ver quadro</Link>
          </div>
          {todayTasks.length > 0 ? (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div key={task.id} className="rounded-card border border-border bg-elevated/60 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{task.title}</p>
                      <p className="mt-1 text-sm text-text-secondary">{task.project_name || task.client_name || 'Sem vínculo'}</p>
                    </div>
                    <Badge statusValue={task.priority}>{taskPriorityLabels[task.priority]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState description="Sem tarefas vencendo hoje. Aproveite a janela para planejamento." icon={<CalendarClock className="h-5 w-5" />} title="Agenda controlada" />}
        </section>
      </div>

      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3">
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setQuickAction('client')}>Novo cliente</Button>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setQuickAction('task')} variant="secondary">Nova tarefa</Button>
        <Button leftIcon={<Receipt className="h-4 w-4" />} onClick={() => setQuickAction('transaction')} variant="secondary">Novo lançamento</Button>
      </div>

      <Modal description="Ação rápida disponível diretamente pelo dashboard." onClose={() => setQuickAction(null)} open={quickAction === 'client'} placement="right" size="lg" title="Novo cliente">
        <ClientForm onCancel={() => setQuickAction(null)} onSuccess={() => setQuickAction(null)} />
      </Modal>
      <Modal description="Crie uma tarefa sem sair do painel." onClose={() => setQuickAction(null)} open={quickAction === 'task'} size="lg" title="Nova tarefa">
        <TaskForm clients={clientsQuery.data ?? []} onCancel={() => setQuickAction(null)} onSuccess={() => setQuickAction(null)} projects={projectsQuery.data ?? []} />
      </Modal>
      <Modal description="Cadastre uma receita ou despesa em poucos passos." onClose={() => setQuickAction(null)} open={quickAction === 'transaction'} size="lg" title="Novo lançamento">
        <TransactionForm clients={clientsQuery.data ?? []} onCancel={() => setQuickAction(null)} onSuccess={() => setQuickAction(null)} projects={projectsQuery.data ?? []} />
      </Modal>
    </div>
  );
}
