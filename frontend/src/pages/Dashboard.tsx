import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BriefcaseBusiness, CircleDollarSign, ListTodo, Users } from 'lucide-react';

import RevenueChart from '../components/charts/RevenueChart';
import ProjectStatusChart from '../components/charts/ProjectStatusChart';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import api from '../lib/api';
import { formatCurrencyBRL, getErrorMessage, projectStatusLabels } from '../lib/utils';
import type { Client, Project, RevenueByMonthItem, Task, Transaction } from '../types';

const projectStatusColors: Record<string, string> = {
  planejamento: '#6366f1',
  andamento: '#22c55e',
  entregue: '#14b8a6',
  cancelado: '#ef4444',
};

export default function Dashboard() {
  const activeClientsQuery = useQuery({
    queryKey: ['dashboard', 'clients', 'active'],
    queryFn: async () => (await api.get<Client[]>('/clients', { params: { status: 'ativo' } })).data,
  });
  const projectsInProgressQuery = useQuery({
    queryKey: ['dashboard', 'projects', 'in-progress'],
    queryFn: async () => (await api.get<Project[]>('/projects', { params: { status: 'andamento' } })).data,
  });
  const allProjectsQuery = useQuery({
    queryKey: ['dashboard', 'projects', 'all'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
  const pendingTasksQuery = useQuery({
    queryKey: ['dashboard', 'tasks', 'pending'],
    queryFn: async () => (await api.get<Task[]>('/tasks', { params: { status: 'pendente' } })).data,
  });
  const todayTasksQuery = useQuery({
    queryKey: ['dashboard', 'tasks', 'today'],
    queryFn: async () => (await api.get<Task[]>('/tasks', { params: { due_today: true } })).data,
  });
  const overdueReceivablesQuery = useQuery({
    queryKey: ['dashboard', 'transactions', 'overdue'],
    queryFn: async () => (await api.get<Transaction[]>('/transactions', { params: { type: 'receita', status: 'vencido' } })).data,
  });
  const revenueByMonthQuery = useQuery({
    queryKey: ['dashboard', 'reports', 'revenue-by-month'],
    queryFn: async () => (await api.get<RevenueByMonthItem[]>('/reports/revenue-by-month')).data,
  });

  const isLoading = [
    activeClientsQuery,
    projectsInProgressQuery,
    allProjectsQuery,
    pendingTasksQuery,
    todayTasksQuery,
    overdueReceivablesQuery,
    revenueByMonthQuery,
  ].some((query) => query.isLoading);
  const failedQuery = [
    activeClientsQuery,
    projectsInProgressQuery,
    allProjectsQuery,
    pendingTasksQuery,
    todayTasksQuery,
    overdueReceivablesQuery,
    revenueByMonthQuery,
  ].find((query) => query.error);

  const currentMonthRevenue = useMemo(() => {
    const currentDate = new Date();
    const currentLabel = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
    return revenueByMonthQuery.data?.find((item) => item.month === currentLabel)?.total_received ?? '0';
  }, [revenueByMonthQuery.data]);

  const overdueSummary = useMemo(() => {
    const items = overdueReceivablesQuery.data ?? [];
    const total = items.reduce((accumulator, transaction) => accumulator + Number(transaction.amount), 0);
    return { count: items.length, total };
  }, [overdueReceivablesQuery.data]);

  const projectStatusData = useMemo(() => {
    const projects = allProjectsQuery.data ?? [];
    const counts = projects.reduce<Record<string, number>>((accumulator, project) => {
      accumulator[project.status] = (accumulator[project.status] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts).map(([status, value]) => ({
      name: projectStatusLabels[status] || status,
      value,
      color: projectStatusColors[status] || '#f59e0b',
    }));
  }, [allProjectsQuery.data]);

  if (failedQuery) {
    return <div className="panel p-6 text-rose-300">{getErrorMessage(failedQuery.error)}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-app-accent">Visão Geral</p>
        <h1 className="mt-2 text-4xl font-extrabold text-white">Operação do dia</h1>
        <p className="mt-2 text-zinc-400">Receita, produção, pipeline e pendências em um único painel.</p>
      </div>

      {overdueSummary.count > 0 ? (
        <div className="panel flex items-start gap-4 border border-rose-500/20 bg-rose-500/10 p-5 text-rose-100">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-rose-300" />
          <div>
            <h2 className="font-semibold">Recebíveis vencidos exigem ação</h2>
            <p className="mt-1 text-sm text-rose-200/90">
              {overdueSummary.count} lançamento(s) em atraso somando {formatCurrencyBRL(overdueSummary.total)}.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Clientes ativos"
          value={String(activeClientsQuery.data?.length ?? 0)}
          description={isLoading ? 'Carregando clientes...' : 'Carteira em status ativo.'}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Projetos em andamento"
          value={String(projectsInProgressQuery.data?.length ?? 0)}
          description={isLoading ? 'Sincronizando projetos...' : 'Frentes abertas neste momento.'}
          icon={<BriefcaseBusiness className="h-5 w-5" />}
        />
        <StatCard
          title="Receita do mês"
          value={formatCurrencyBRL(currentMonthRevenue)}
          description={isLoading ? 'Calculando recebimentos...' : 'Baseado em lançamentos pagos.'}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Tarefas pendentes"
          value={String(pendingTasksQuery.data?.length ?? 0)}
          description={isLoading ? 'Lendo backlog...' : 'Itens aguardando execução.'}
          icon={<ListTodo className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Receita por mês</h2>
              <p className="text-sm text-zinc-400">Últimos 12 meses de entradas pagas.</p>
            </div>
          </div>
          {revenueByMonthQuery.data ? <RevenueChart data={revenueByMonthQuery.data} /> : <p className="text-zinc-400">Carregando gráfico...</p>}
        </section>

        <section className="panel p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">Status dos projetos</h2>
            <p className="text-sm text-zinc-400">Distribuição da carteira atual.</p>
          </div>
          {projectStatusData.length > 0 ? (
            <>
              <ProjectStatusChart data={projectStatusData} />
              <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                {projectStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/10 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-zinc-400">Nenhum projeto cadastrado ainda.</p>
          )}
        </section>
      </div>

      <section className="panel p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Tarefas para hoje</h2>
            <p className="text-sm text-zinc-400">Prioridades com vencimento na data atual.</p>
          </div>
          <span className="badge-base border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
            {todayTasksQuery.data?.length ?? 0} item(ns)
          </span>
        </div>

        {todayTasksQuery.data && todayTasksQuery.data.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {todayTasksQuery.data.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <p className="text-zinc-400">Nenhuma tarefa vencendo hoje.</p>
        )}
      </section>
    </div>
  );
}
