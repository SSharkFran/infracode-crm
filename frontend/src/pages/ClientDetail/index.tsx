import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Mail, MessageCircle, Paperclip, PhoneCall, Plus, Users, Wallet } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import AttachmentUpload from '../../components/AttachmentUpload';
import { ClientForm } from '../../components/forms/ClientForm';
import { ProjectForm } from '../../components/forms/ProjectForm';
import { TaskForm } from '../../components/forms/TaskForm';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCard, SkeletonTable, SkeletonText } from '../../components/ui/Skeleton';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useToast } from '../../hooks/useToast';
import api from '../../lib/api';
import { clientStatusLabels, clientTypeLabels, formatCurrencyBRL, formatDateBR, formatDateTimeBR, formatRelativeTime, getErrorMessage, isHtmlInputFocused, projectStatusLabels, taskPriorityLabels, transactionStatusLabels } from '../../lib/utils';
import type { ClientDetail, Project, Transaction, Task } from '../../types';

const tabs = ['overview', 'timeline', 'projects', 'finance', 'tasks', 'attachments'] as const;
type TabKey = (typeof tabs)[number];

const interactionIconMap = {
  reuniao: CalendarDays,
  ligacao: PhoneCall,
  email: Mail,
  whatsapp: MessageCircle,
} as const;

export default function ClientDetailPage() {
  const { clientId = '' } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [interactionExpanded, setInteractionExpanded] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ type: 'reuniao', summary: '', happened_at: new Date().toISOString().slice(0, 16) });
  const [interactionErrors, setInteractionErrors] = useState<string[]>([]);

  const clientQuery = useQuery({
    enabled: Boolean(clientId),
    queryKey: ['client', clientId],
    queryFn: async () => (await api.get<ClientDetail>(`/clients/${clientId}`)).data,
  });
  const projectsQuery = useQuery({
    enabled: Boolean(clientId),
    queryKey: ['projects', 'client', clientId],
    queryFn: async () => (await api.get<Project[]>('/projects', { params: { client_id: clientId } })).data,
  });
  const transactionsQuery = useQuery({
    enabled: Boolean(clientId),
    queryKey: ['transactions', 'client', clientId],
    queryFn: async () => (await api.get<Transaction[]>('/transactions', { params: { client_id: clientId } })).data,
  });
  const tasksQuery = useQuery({
    enabled: Boolean(clientId),
    queryKey: ['tasks', 'client', clientId],
    queryFn: async () => (await api.get<Task[]>('/tasks', { params: { client_id: clientId } })).data,
  });

  useKeyboard('n', () => {
    if (!isHtmlInputFocused()) {
      setTab('timeline');
      setInteractionExpanded(true);
    }
  });

  const interactionMutation = useMutation({
    mutationFn: async () => {
      if (!interactionForm.summary.trim()) {
        throw new Error('Resumo da interação é obrigatório.');
      }
      return (await api.post(`/clients/${clientId}/interactions`, { ...interactionForm, happened_at: new Date(interactionForm.happened_at).toISOString() })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      toast.success('Interação registrada com sucesso.');
      setInteractionErrors([]);
      setInteractionExpanded(false);
      setInteractionForm({ type: 'reuniao', summary: '', happened_at: new Date().toISOString().slice(0, 16) });
    },
    onError: (error) => setInteractionErrors([getErrorMessage(error)]),
  });

  const totals = useMemo(() => {
    const transactions = transactionsQuery.data ?? [];
    const revenue = transactions.filter((item) => item.type === 'receita').reduce((total, item) => total + Number(item.amount), 0);
    const expense = transactions.filter((item) => item.type === 'despesa').reduce((total, item) => total + Number(item.amount), 0);
    return { revenue, expense, balance: revenue - expense };
  }, [transactionsQuery.data]);

  if (clientQuery.isLoading) {
    return <div className="space-y-6"><SkeletonCard /><SkeletonTable /></div>;
  }

  if (clientQuery.error || !clientQuery.data) {
    return <EmptyState description={getErrorMessage(clientQuery.error)} icon={<Mail className="h-5 w-5" />} title="Não foi possível carregar este cliente" />;
  }

  const client = clientQuery.data;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={client.name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge statusValue={client.type}>{clientTypeLabels[client.type]}</Badge>
                <Badge dot statusValue={client.status}>{clientStatusLabels[client.status]}</Badge>
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-text-primary">{client.name}</h1>
              <div className="mt-3 grid gap-2 text-sm text-text-secondary md:grid-cols-2">
                <p>{client.email || 'Sem e-mail cadastrado'}</p>
                <p>{client.phone || 'Sem telefone cadastrado'}</p>
                <p>Cadastrado em {formatDateTimeBR(client.created_at)}</p>
                <p>Última interação {formatRelativeTime(client.interactions[0]?.happened_at)}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setEditOpen(true)} variant="secondary">Editar</Button>
            <Button onClick={() => { setTab('timeline'); setInteractionExpanded(true); }} variant="secondary">Novo follow-up</Button>
            <Button onClick={() => setProjectOpen(true)} variant="secondary">Criar projeto vinculado</Button>
            <Button onClick={() => setTaskOpen(true)}>Adicionar tarefa</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => <button key={item} className={`pill-filter ${tab === item ? 'pill-filter-active' : ''}`} onClick={() => setTab(item)} type="button">{item === 'overview' ? 'Visão Geral' : item === 'timeline' ? 'Timeline' : item === 'projects' ? 'Projetos' : item === 'finance' ? 'Financeiro' : item === 'tasks' ? 'Tarefas' : 'Anexos'}</button>)}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="card p-6">{client.notes ? <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">{client.notes}</p> : <EmptyState description="Registre contexto do relacionamento para manter o time alinhado." icon={<Users className="h-5 w-5" />} title="Sem notas de relacionamento" />}</section>
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <div className="card p-5"><p className="text-sm text-text-secondary">Receita total</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(totals.revenue)}</p></div>
            <div className="card p-5"><p className="text-sm text-text-secondary">Projetos</p><p className="mt-3 text-2xl font-semibold text-text-primary">{projectsQuery.data?.length ?? 0}</p></div>
            <div className="card p-5"><p className="text-sm text-text-secondary">Tarefas</p><p className="mt-3 text-2xl font-semibold text-text-primary">{tasksQuery.data?.length ?? 0}</p></div>
          </section>
        </div>
      ) : null}

      {tab === 'timeline' ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <section className="card p-6">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="section-title">Interações</h2><p className="text-sm text-text-secondary">Histórico cronológico do relacionamento.</p></div></div>
            {client.interactions.length > 0 ? (
              <div className="space-y-5">
                {client.interactions.map((interaction) => {
                  const Icon = interactionIconMap[interaction.type as keyof typeof interactionIconMap] ?? MessageCircle;
                  return (
                    <div key={interaction.id} className="relative border-l border-border pl-5">
                      <span className="absolute -left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent-subtle text-accent-text"><Icon className="h-3 w-3" /></span>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium capitalize text-text-primary">{interaction.type}</p>
                        <span className="text-xs text-text-tertiary" title={formatDateTimeBR(interaction.happened_at)}>{formatRelativeTime(interaction.happened_at)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">{interaction.summary}</p>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState description="Quando a equipe registrar contatos, eles aparecerão nesta linha do tempo." icon={<MessageCircle className="h-5 w-5" />} title="Nenhuma interação registrada" />}
          </section>
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <div><h2 className="section-title">Novo registro</h2><p className="text-sm text-text-secondary">Use um formulário inline, sem sair da visão.</p></div>
              <Button onClick={() => setInteractionExpanded((current) => !current)} variant="secondary">{interactionExpanded ? 'Ocultar' : 'Expandir'}</Button>
            </div>
            {interactionExpanded ? (
              <form className="mt-4 space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setInteractionErrors([]); interactionMutation.mutate(); }}>
                <select className="select" onChange={(event) => setInteractionForm((current) => ({ ...current, type: event.target.value }))} value={interactionForm.type}>
                  <option value="reuniao">Reunião</option><option value="ligacao">Ligação</option><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option>
                </select>
                <input className="input" onChange={(event) => setInteractionForm((current) => ({ ...current, happened_at: event.target.value }))} type="datetime-local" value={interactionForm.happened_at} />
                <textarea className="textarea" onChange={(event) => setInteractionForm((current) => ({ ...current, summary: event.target.value }))} rows={6} value={interactionForm.summary} />
                {interactionErrors.length > 0 ? <div className="space-y-1 text-sm text-danger-text">{interactionErrors.map((error) => <p key={error}>{error}</p>)}</div> : null}
                <Button disabled={interactionMutation.isPending} type="submit">{interactionMutation.isPending ? 'Salvando...' : 'Registrar interação'}</Button>
              </form>
            ) : <div className="mt-4"><SkeletonText lines={4} /></div>}
          </section>
        </div>
      ) : null}

      {tab === 'projects' ? (
        <section className="card p-6">
          {projectsQuery.data?.length ? (
            <div className="space-y-3">
              {projectsQuery.data.map((project) => (
                <Link key={project.id} className="flex items-center justify-between rounded-button border border-border px-4 py-4 transition hover:border-border-strong hover:bg-hover/40" to={`/projects/${project.id}`}>
                  <div>
                    <p className="font-medium text-text-primary">{project.name}</p>
                    <p className="text-sm text-text-secondary">Valor {formatCurrencyBRL(project.value)} • prazo {formatDateBR(project.deadline)}</p>
                  </div>
                  <Badge statusValue={project.status}>{projectStatusLabels[project.status]}</Badge>
                </Link>
              ))}
            </div>
          ) : <EmptyState description="Use o atalho de criação para vincular o primeiro projeto a este cliente." icon={<Plus className="h-5 w-5" />} title="Sem projetos vinculados" />}
        </section>
      ) : null}

      {tab === 'finance' ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card p-5"><p className="text-sm text-text-secondary">Receitas</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(totals.revenue)}</p></div>
            <div className="card p-5"><p className="text-sm text-text-secondary">Despesas</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(totals.expense)}</p></div>
            <div className="card p-5"><div className="flex items-center gap-3"><Wallet className="h-5 w-5 text-accent-text" /><div><p className="text-sm text-text-secondary">Saldo</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(totals.balance)}</p></div></div></div>
          </div>
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
              <tbody>
                {transactionsQuery.data?.length ? transactionsQuery.data.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="text-text-primary">{transaction.description}</td>
                    <td>{transaction.type}</td>
                    <td className="text-text-primary">{formatCurrencyBRL(transaction.amount)}</td>
                    <td>{formatDateBR(transaction.due_date)}</td>
                    <td><Badge statusValue={transaction.status}>{transactionStatusLabels[transaction.status]}</Badge></td>
                  </tr>
                )) : <tr><td colSpan={5}><EmptyState description="Nenhuma transação foi vinculada a este cliente ainda." icon={<Wallet className="h-5 w-5" />} title="Financeiro vazio" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'tasks' ? (
        <section className="card p-6">
          {tasksQuery.data?.length ? (
            <div className="space-y-3">
              {tasksQuery.data.map((task) => (
                <div key={task.id} className="rounded-button border border-border px-4 py-4">
                  <div className="flex items-center justify-between gap-3"><p className="font-medium text-text-primary">{task.title}</p><Badge statusValue={task.priority}>{taskPriorityLabels[task.priority]}</Badge></div>
                  <p className="mt-1 text-sm text-text-secondary">{task.project_name || 'Sem projeto'} • prazo {formatDateBR(task.due_date)}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState description="Use o botão de adicionar tarefa para acompanhar próximos passos do relacionamento." icon={<Plus className="h-5 w-5" />} title="Sem tarefas vinculadas" />}
        </section>
      ) : null}

      {tab === 'attachments' ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="card p-6"><AttachmentUpload onUploaded={() => queryClient.invalidateQueries({ queryKey: ['client', clientId] })} uploadUrl={`/clients/${client.id}/attachments`} /></section>
          <section className="card p-6">
            {client.attachments.length > 0 ? (
              <div className="space-y-3">
                {client.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between rounded-button border border-border px-4 py-4">
                    <div>
                      <p className="font-medium text-text-primary">{attachment.filename}</p>
                      <p className="text-sm text-text-secondary">Enviado em {formatDateTimeBR(attachment.uploaded_at)}</p>
                    </div>
                    {attachment.download_url ? <a className="btn-secondary" href={attachment.download_url} rel="noreferrer" target="_blank">Baixar</a> : <span className="text-sm text-text-secondary">Armazenamento não configurado</span>}
                  </div>
                ))}
              </div>
            ) : <EmptyState description="Use o uploader ao lado para centralizar contratos, propostas e arquivos do cliente." icon={<Paperclip className="h-5 w-5" />} title="Sem anexos" />}
          </section>
        </div>
      ) : null}

      <Modal description="Atualize dados cadastrais e o contexto do relacionamento." onClose={() => setEditOpen(false)} open={editOpen} size="lg" title="Editar cliente">
        <ClientForm client={client} onCancel={() => setEditOpen(false)} onSuccess={() => setEditOpen(false)} />
      </Modal>
      <Modal description="Vincule um novo projeto diretamente a este cliente." onClose={() => setProjectOpen(false)} open={projectOpen} size="lg" title="Novo projeto">
        <ProjectForm clients={[{ ...client, created_at: client.created_at }]} defaultClientId={client.id} onCancel={() => setProjectOpen(false)} onSuccess={() => setProjectOpen(false)} />
      </Modal>
      <Modal description="Crie uma nova tarefa sem sair da visão do cliente." onClose={() => setTaskOpen(false)} open={taskOpen} size="lg" title="Nova tarefa">
        <TaskForm clients={[{ ...client, created_at: client.created_at }]} defaultClientId={client.id} onCancel={() => setTaskOpen(false)} onSuccess={() => setTaskOpen(false)} projects={projectsQuery.data ?? []} />
      </Modal>
    </div>
  );
}
