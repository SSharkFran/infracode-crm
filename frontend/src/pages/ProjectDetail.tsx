import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Paperclip, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import AttachmentUpload from '../components/AttachmentUpload';
import TaskCard from '../components/TaskCard';
import api from '../lib/api';
import {
  badgeTone,
  cn,
  formatCurrencyBRL,
  formatDateBR,
  formatDateTimeBR,
  getErrorMessage,
  taskStatusLabels,
  transactionStatusLabels,
} from '../lib/utils';
import type { ProjectDetail as ProjectDetailType, Task, TaskStatus } from '../types';

const tabs = ['tasks', 'finance', 'attachments'] as const;
type TabKey = (typeof tabs)[number];

function nextTaskStatus(status: TaskStatus): TaskStatus {
  if (status === 'pendente') return 'andamento';
  if (status === 'andamento') return 'concluida';
  return 'pendente';
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');

  const projectQuery = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get<ProjectDetailType>(`/projects/${projectId}`)).data,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const response = await api.put(`/tasks/${task.id}`, { status: nextTaskStatus(task.status) });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const financeSummary = useMemo(() => {
    const transactions = projectQuery.data?.transactions ?? [];
    const receita = transactions.filter((transaction) => transaction.type === 'receita').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const despesa = transactions.filter((transaction) => transaction.type === 'despesa').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    return { receita, despesa, lucro: receita - despesa };
  }, [projectQuery.data?.transactions]);

  if (!projectId) {
    return <div className="panel p-6 text-rose-300">Projeto não informado.</div>;
  }
  if (projectQuery.isLoading) {
    return <div className="panel p-6 text-zinc-400">Carregando projeto...</div>;
  }
  if (projectQuery.error || !projectQuery.data) {
    return <div className="panel p-6 text-rose-300">{getErrorMessage(projectQuery.error)}</div>;
  }

  const project = projectQuery.data;

  return (
    <div className="space-y-8">
      <div className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('badge-base', badgeTone(project.status))}>{project.status}</span>
              <span className="badge-base border-indigo-500/20 bg-indigo-500/10 text-indigo-300">{project.client_name || 'Sem cliente'}</span>
            </div>
            <h1 className="mt-4 text-4xl font-extrabold text-white">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{project.description || 'Sem descrição detalhada.'}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-right">
            <p className="text-sm text-zinc-400">Valor do projeto</p>
            <p className="mt-2 text-3xl font-extrabold text-white">{formatCurrencyBRL(project.value)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-sm text-zinc-400 md:grid-cols-3">
          <p>Início: <span className="font-semibold text-zinc-200">{formatDateBR(project.started_at)}</span></p>
          <p>Prazo: <span className="font-semibold text-zinc-200">{formatDateBR(project.deadline)}</span></p>
          <p>Entrega: <span className="font-semibold text-zinc-200">{formatDateBR(project.delivered_at)}</span></p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab} className={`button-secondary ${activeTab === tab ? '!border-app-accent !bg-app-accent !text-white' : ''}`} onClick={() => setActiveTab(tab)} type="button">
            {tab === 'tasks' && 'Tarefas'}
            {tab === 'finance' && 'Financeiro'}
            {tab === 'attachments' && 'Anexos'}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' ? (
        <section className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Tarefas do projeto</h2>
              <p className="text-sm text-zinc-400">Acompanhe o fluxo e avance o status diretamente.</p>
            </div>
          </div>
          {project.tasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {project.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  footer={(
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn('badge-base', badgeTone(task.status))}>{taskStatusLabels[task.status]}</span>
                      <button className="button-secondary gap-2" disabled={updateTaskMutation.isPending} onClick={() => updateTaskMutation.mutate(task)} type="button">
                        <CheckCircle2 className="h-4 w-4" />
                        Avançar
                      </button>
                    </div>
                  )}
                />
              ))}
            </div>
          ) : <p className="text-zinc-400">Nenhuma tarefa cadastrada para este projeto.</p>}
        </section>
      ) : null}

      {activeTab === 'finance' ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="panel p-5">
              <p className="text-sm text-zinc-400">Receita vinculada</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(financeSummary.receita)}</p>
            </div>
            <div className="panel p-5">
              <p className="text-sm text-zinc-400">Despesa vinculada</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(financeSummary.despesa)}</p>
            </div>
            <div className="panel p-5">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-app-accent" />
                <div>
                  <p className="text-sm text-zinc-400">Lucro</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(financeSummary.lucro)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-xl font-bold text-white">Movimentações do projeto</h2>
            <div className="mt-5 table-shell overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Vencimento</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {project.transactions.length > 0 ? project.transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-white/10">
                      <td className="px-4 py-3 text-white">{transaction.description}</td>
                      <td className="px-4 py-3 text-zinc-400">{transaction.type}</td>
                      <td className="px-4 py-3 text-white">{formatCurrencyBRL(transaction.amount)}</td>
                      <td className="px-4 py-3 text-zinc-400">{formatDateBR(transaction.due_date)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('badge-base', badgeTone(transaction.status))}>{transactionStatusLabels[transaction.status]}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="px-4 py-5 text-zinc-400" colSpan={5}>Nenhuma movimentação vinculada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'attachments' ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <Paperclip className="h-5 w-5 text-app-accent" />
              <div>
                <h2 className="text-xl font-bold text-white">Enviar anexo</h2>
                <p className="text-sm text-zinc-400">Escopo, contrato, briefing e entregáveis.</p>
              </div>
            </div>
            <AttachmentUpload uploadUrl={`/projects/${project.id}/attachments`} onUploaded={() => queryClient.invalidateQueries({ queryKey: ['project', projectId] })} />
          </div>

          <div className="panel p-6">
            <h2 className="text-xl font-bold text-white">Arquivos do projeto</h2>
            <div className="mt-5 space-y-3">
              {project.attachments.length > 0 ? project.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 transition hover:border-white/20"
                  href={attachment.download_url || '#'}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div>
                    <p className="font-medium text-white">{attachment.filename}</p>
                    <p className="text-xs text-zinc-500">Enviado em {formatDateTimeBR(attachment.uploaded_at)}</p>
                  </div>
                  <span className="text-sm text-app-accent">Baixar</span>
                </a>
              )) : <p className="text-zinc-400">Nenhum arquivo enviado para este projeto.</p>}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
