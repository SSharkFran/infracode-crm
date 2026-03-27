import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FolderKanban, Paperclip, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import AttachmentUpload from '../../components/AttachmentUpload';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import api from '../../lib/api';
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR, getErrorMessage, projectStatusLabels, taskPriorityLabels, taskStatusLabels, transactionStatusLabels } from '../../lib/utils';
import type { ProjectDetail, Task, TaskStatus } from '../../types';

const tabs = ['tasks', 'finance', 'attachments'] as const;
type TabKey = (typeof tabs)[number];

function nextTaskStatus(status: TaskStatus): TaskStatus {
  if (status === 'pendente') return 'andamento';
  if (status === 'andamento') return 'concluida';
  return 'pendente';
}

export default function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('tasks');

  const projectQuery = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get<ProjectDetail>(`/projects/${projectId}`)).data,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (task: Task) => (await api.put<Task>(`/tasks/${task.id}`, { status: nextTaskStatus(task.status) })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Status da tarefa atualizado.');
    },
  });

  const financeSummary = useMemo(() => {
    const transactions = projectQuery.data?.transactions ?? [];
    const revenue = transactions.filter((item) => item.type === 'receita').reduce((total, item) => total + Number(item.amount), 0);
    const expense = transactions.filter((item) => item.type === 'despesa').reduce((total, item) => total + Number(item.amount), 0);
    return { revenue, expense, profit: revenue - expense };
  }, [projectQuery.data?.transactions]);

  const handleAdvanceTask = async (task: Task) => {
    if (task.status === 'concluida') {
      const accepted = await confirm('Esta tarefa será regressada para pendente. Deseja continuar?');
      if (!accepted) return;
    }
    updateTaskMutation.mutate(task);
  };

  if (projectQuery.isLoading) {
    return <div className="space-y-6"><SkeletonCard /><SkeletonTable /></div>;
  }

  if (projectQuery.error || !projectQuery.data) {
    return <EmptyState description={getErrorMessage(projectQuery.error)} icon={<FolderKanban className="h-5 w-5" />} title="Não foi possível carregar o projeto" />;
  }

  const project = projectQuery.data;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge statusValue={project.status}>{projectStatusLabels[project.status]}</Badge>
              <Badge tone="neutral">{project.client_name || 'Sem cliente'}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-text-primary">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">{project.description || 'Sem descrição detalhada.'}</p>
          </div>
          <div className="card-elevated px-5 py-4 text-right">
            <p className="text-sm text-text-secondary">Valor do projeto</p>
            <p className="mt-3 text-3xl font-semibold text-text-primary">{formatCurrencyBRL(project.value)}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 text-sm text-text-secondary md:grid-cols-3">
          <p>Início <span className="text-text-primary">{formatDateBR(project.started_at)}</span></p>
          <p>Prazo <span className="text-text-primary">{formatDateBR(project.deadline)}</span></p>
          <p>Entrega <span className="text-text-primary">{formatDateBR(project.delivered_at)}</span></p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => <button key={item} className={`pill-filter ${tab === item ? 'pill-filter-active' : ''}`} onClick={() => setTab(item)} type="button">{item === 'tasks' ? 'Tarefas' : item === 'finance' ? 'Financeiro' : 'Anexos'}</button>)}
      </div>

      {tab === 'tasks' ? (
        <section className="card p-6">
          {project.tasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {project.tasks.map((task) => (
                <div key={task.id} className="rounded-card border border-border bg-elevated/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{task.title}</p>
                      <p className="mt-1 text-sm text-text-secondary">{task.description || 'Sem descrição'}</p>
                    </div>
                    <Badge statusValue={task.priority}>{taskPriorityLabels[task.priority]}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge statusValue={task.status}>{taskStatusLabels[task.status]}</Badge>
                    <Button disabled={updateTaskMutation.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => handleAdvanceTask(task)} variant="secondary">
                      {task.status === 'concluida' ? 'Reabrir' : 'Avançar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState description="As tarefas deste projeto aparecerão aqui assim que forem criadas." icon={<CheckCircle2 className="h-5 w-5" />} title="Sem tarefas vinculadas" />}
        </section>
      ) : null}

      {tab === 'finance' ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card p-5"><p className="text-sm text-text-secondary">Receita</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(financeSummary.revenue)}</p></div>
            <div className="card p-5"><p className="text-sm text-text-secondary">Despesa</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(financeSummary.expense)}</p></div>
            <div className="card p-5"><div className="flex items-center gap-3"><Wallet className="h-5 w-5 text-accent-text" /><div><p className="text-sm text-text-secondary">Lucro</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(financeSummary.profit)}</p></div></div></div>
          </div>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
              <tbody>
                {project.transactions.length ? project.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="text-text-primary">{transaction.description}</td>
                    <td>{transaction.type}</td>
                    <td className="text-text-primary">{formatCurrencyBRL(transaction.amount)}</td>
                    <td>{formatDateBR(transaction.due_date)}</td>
                    <td><Badge statusValue={transaction.status}>{transactionStatusLabels[transaction.status]}</Badge></td>
                  </tr>
                )) : <tr><td colSpan={5}><EmptyState description="Vincule receitas e despesas para acompanhar a margem do projeto." icon={<Wallet className="h-5 w-5" />} title="Sem movimentações" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'attachments' ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="card p-6"><AttachmentUpload onUploaded={() => queryClient.invalidateQueries({ queryKey: ['project', projectId] })} uploadUrl={`/projects/${project.id}/attachments`} /></section>
          <section className="card p-6">
            {project.attachments.length > 0 ? (
              <div className="space-y-3">
                {project.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between rounded-button border border-border px-4 py-4">
                    <div>
                      <p className="font-medium text-text-primary">{attachment.filename}</p>
                      <p className="text-sm text-text-secondary">Enviado em {formatDateTimeBR(attachment.uploaded_at)}</p>
                    </div>
                    {attachment.download_url ? <a className="btn-secondary" href={attachment.download_url} rel="noreferrer" target="_blank">Baixar</a> : <span className="text-sm text-text-secondary">Armazenamento não configurado</span>}
                  </div>
                ))}
              </div>
            ) : <EmptyState description="Escopo, contrato e entregáveis podem ficar centralizados nesta área." icon={<Paperclip className="h-5 w-5" />} title="Sem anexos" />}
          </section>
        </div>
      ) : null}
    </div>
  );
}
