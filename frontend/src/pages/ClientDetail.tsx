import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Edit, MessageSquareText, Paperclip, Wallet, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import AttachmentUpload from '../components/AttachmentUpload';
import api from '../lib/api';
import {
  badgeTone,
  clientStatusLabels,
  clientTypeLabels,
  cn,
  formatCurrencyBRL,
  formatDateBR,
  formatDateTimeBR,
  getErrorMessage,
  transactionStatusLabels,
} from '../lib/utils';
import type { ClientDetail as ClientDetailType, ClientStatus, ClientType, Project, Transaction } from '../types';

const tabs = ['overview', 'interactions', 'projects', 'finance', 'attachments'] as const;
type TabKey = (typeof tabs)[number];

export default function ClientDetail() {
  const { clientId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'recorrente' as ClientType,
    status: 'ativo' as ClientStatus,
    notes: '',
  });
  const [interactionForm, setInteractionForm] = useState({
    type: 'reuniao',
    summary: '',
    happened_at: new Date().toISOString().slice(0, 16),
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const clientQuery = useQuery({
    enabled: Boolean(clientId),
    queryKey: ['client', clientId],
    queryFn: async () => (await api.get<ClientDetailType>(`/clients/${clientId}`)).data,
  });
  const projectsQuery = useQuery({
    enabled: Boolean(clientId),
    queryKey: ['client-projects', clientId],
    queryFn: async () => (await api.get<Project[]>('/projects', { params: { client_id: clientId } })).data,
  });
  const transactionsQuery = useQuery({
    enabled: Boolean(clientId),
    queryKey: ['client-transactions', clientId],
    queryFn: async () => (await api.get<Transaction[]>('/transactions', { params: { client_id: clientId } })).data,
  });

  useEffect(() => {
    if (!clientQuery.data) return;
    setEditForm({
      name: clientQuery.data.name,
      email: clientQuery.data.email || '',
      phone: clientQuery.data.phone || '',
      type: clientQuery.data.type,
      status: clientQuery.data.status,
      notes: clientQuery.data.notes || '',
    });
  }, [clientQuery.data]);

  const updateClientMutation = useMutation({
    mutationFn: async () => {
      if (!editForm.name.trim()) throw new Error('Nome é obrigatório.');
      const response = await api.put(`/clients/${clientId}`, {
        ...editForm,
        email: editForm.email || null,
        phone: editForm.phone || null,
        notes: editForm.notes || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditing(false);
      setValidationError(null);
    },
    onError: (error) => setValidationError(getErrorMessage(error)),
  });

  const interactionMutation = useMutation({
    mutationFn: async () => {
      if (!interactionForm.summary.trim()) throw new Error('Resumo da interação é obrigatório.');
      const response = await api.post(`/clients/${clientId}/interactions`, {
        type: interactionForm.type,
        summary: interactionForm.summary,
        happened_at: new Date(interactionForm.happened_at).toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      setInteractionForm({ type: 'reuniao', summary: '', happened_at: new Date().toISOString().slice(0, 16) });
      setValidationError(null);
    },
    onError: (error) => setValidationError(getErrorMessage(error)),
  });

  const financialSummary = useMemo(() => {
    const transactions = transactionsQuery.data ?? [];
    const receitas = transactions
      .filter((transaction) => transaction.type === 'receita')
      .reduce((accumulator, transaction) => accumulator + Number(transaction.amount), 0);
    const despesas = transactions
      .filter((transaction) => transaction.type === 'despesa')
      .reduce((accumulator, transaction) => accumulator + Number(transaction.amount), 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [transactionsQuery.data]);

  const lastInteraction = clientQuery.data?.interactions?.[0]?.happened_at;

  if (!clientId) {
    return <div className="panel p-6 text-rose-300">Cliente não informado.</div>;
  }

  if (clientQuery.isLoading) {
    return <div className="panel p-6 text-zinc-400">Carregando cliente...</div>;
  }

  if (clientQuery.error || !clientQuery.data) {
    return <div className="panel p-6 text-rose-300">{getErrorMessage(clientQuery.error)}</div>;
  }

  const client = clientQuery.data;

  return (
    <div className="space-y-8">
      <div className="panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('badge-base', badgeTone(client.type))}>{clientTypeLabels[client.type]}</span>
              <span className={cn('badge-base', badgeTone(client.status))}>{clientStatusLabels[client.status]}</span>
            </div>
            <h1 className="mt-4 text-4xl font-extrabold text-white">{client.name}</h1>
            <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
              <p>{client.email || 'Sem e-mail cadastrado'}</p>
              <p>{client.phone || 'Sem telefone cadastrado'}</p>
              <p>Cadastrado em {formatDateTimeBR(client.created_at)}</p>
              <p>Última interação em {formatDateTimeBR(lastInteraction)}</p>
            </div>
          </div>

          <button className="button-secondary gap-2" onClick={() => setEditing(true)} type="button">
            <Edit className="h-4 w-4" />
            Editar cliente
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={cn('button-secondary', activeTab === tab && '!border-app-accent !bg-app-accent !text-white')}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === 'overview' && 'Visão Geral'}
            {tab === 'interactions' && 'Interações'}
            {tab === 'projects' && 'Projetos'}
            {tab === 'finance' && 'Financeiro'}
            {tab === 'attachments' && 'Anexos'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="panel p-6">
            <h2 className="text-xl font-bold text-white">Resumo do relacionamento</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{client.notes || 'Nenhuma observação registrada até o momento.'}</p>
          </div>
          <div className="space-y-4">
            <div className="panel p-5">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-app-accent" />
                <div>
                  <p className="text-sm text-zinc-400">Data de cadastro</p>
                  <p className="text-lg font-bold text-white">{formatDateBR(client.created_at)}</p>
                </div>
              </div>
            </div>
            <div className="panel p-5">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-app-accent" />
                <div>
                  <p className="text-sm text-zinc-400">Última interação</p>
                  <p className="text-lg font-bold text-white">{formatDateTimeBR(lastInteraction)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'interactions' ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="panel p-6">
            <h2 className="text-xl font-bold text-white">Timeline</h2>
            <div className="mt-6 space-y-4">
              {client.interactions.length > 0 ? client.interactions.map((interaction) => (
                <div key={interaction.id} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="badge-base border-indigo-500/20 bg-indigo-500/10 text-indigo-300">{interaction.type}</span>
                    <span className="text-xs text-zinc-500">{formatDateTimeBR(interaction.happened_at)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">{interaction.summary}</p>
                </div>
              )) : <p className="text-zinc-400">Nenhuma interação registrada.</p>}
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-xl font-bold text-white">Nova interação</h2>
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setValidationError(null);
                interactionMutation.mutate();
              }}
            >
              <div>
                <label className="field-label">Tipo</label>
                <select className="select-base" value={interactionForm.type} onChange={(event) => setInteractionForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="reuniao">Reunião</option>
                  <option value="ligacao">Ligação</option>
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="field-label">Data e hora</label>
                <input className="input-base" type="datetime-local" value={interactionForm.happened_at} onChange={(event) => setInteractionForm((current) => ({ ...current, happened_at: event.target.value }))} />
              </div>
              <div>
                <label className="field-label">Resumo</label>
                <textarea className="textarea-base" rows={6} value={interactionForm.summary} onChange={(event) => setInteractionForm((current) => ({ ...current, summary: event.target.value }))} />
              </div>
              {validationError ? <p className="text-sm text-rose-300">{validationError}</p> : null}
              <button className="button-primary" disabled={interactionMutation.isPending} type="submit">
                {interactionMutation.isPending ? 'Salvando...' : 'Registrar interação'}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === 'projects' ? (
        <section className="panel p-6">
          <h2 className="text-xl font-bold text-white">Projetos vinculados</h2>
          <div className="mt-5 space-y-4">
            {projectsQuery.data && projectsQuery.data.length > 0 ? projectsQuery.data.map((project) => (
              <Link key={project.id} className="block rounded-2xl border border-white/10 p-4 transition hover:border-white/20" to={`/projects/${project.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{project.name}</h3>
                    <p className="text-sm text-zinc-400">Prazo: {formatDateBR(project.deadline)}</p>
                  </div>
                  <span className={cn('badge-base', badgeTone(project.status))}>{project.status}</span>
                </div>
              </Link>
            )) : <p className="text-zinc-400">Nenhum projeto associado a este cliente.</p>}
          </div>
        </section>
      ) : null}

      {activeTab === 'finance' ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="panel p-5">
              <p className="text-sm text-zinc-400">Receitas</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(financialSummary.receitas)}</p>
            </div>
            <div className="panel p-5">
              <p className="text-sm text-zinc-400">Despesas</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(financialSummary.despesas)}</p>
            </div>
            <div className="panel p-5">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-app-accent" />
                <div>
                  <p className="text-sm text-zinc-400">Saldo</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(financialSummary.saldo)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-xl font-bold text-white">Histórico financeiro</h2>
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
                  {transactionsQuery.data && transactionsQuery.data.length > 0 ? transactionsQuery.data.map((transaction) => (
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
                      <td className="px-4 py-5 text-zinc-400" colSpan={5}>Nenhum lançamento para este cliente.</td>
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
                <p className="text-sm text-zinc-400">Contratos, propostas e outros arquivos do cliente.</p>
              </div>
            </div>
            <AttachmentUpload uploadUrl={`/clients/${client.id}/attachments`} onUploaded={() => queryClient.invalidateQueries({ queryKey: ['client', clientId] })} />
          </div>

          <div className="panel p-6">
            <h2 className="text-xl font-bold text-white">Arquivos</h2>
            <div className="mt-5 space-y-3">
              {client.attachments.length > 0 ? client.attachments.map((attachment) => (
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
              )) : <p className="text-zinc-400">Nenhum anexo enviado.</p>}
            </div>
          </div>
        </section>
      ) : null}

      {editing ? (
        <div className="dialog-overlay no-print">
          <div className="dialog-panel">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Editar cliente</h2>
                <p className="text-sm text-zinc-400">Atualize status, contato e contexto do relacionamento.</p>
              </div>
              <button className="button-secondary !px-3" onClick={() => setEditing(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setValidationError(null);
                updateClientMutation.mutate();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Nome</label>
                  <input className="input-base" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">E-mail</label>
                  <input className="input-base" type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="field-label">Telefone</label>
                  <input className="input-base" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Tipo</label>
                  <select className="select-base" value={editForm.type} onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value as ClientType }))}>
                    {Object.entries(clientTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="select-base" value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as ClientStatus }))}>
                    {Object.entries(clientStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Observações</label>
                <textarea className="textarea-base" rows={6} value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              {validationError ? <p className="text-sm text-rose-300">{validationError}</p> : null}
              <div className="flex justify-end gap-3">
                <button className="button-secondary" onClick={() => setEditing(false)} type="button">Cancelar</button>
                <button className="button-primary" disabled={updateClientMutation.isPending} type="submit">
                  {updateClientMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
