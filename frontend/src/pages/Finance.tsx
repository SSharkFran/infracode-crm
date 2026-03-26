import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, Plus, WalletCards, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import TransactionForm from '../components/TransactionForm';
import api from '../lib/api';
import { badgeTone, cn, formatCurrencyBRL, formatDateBR, getErrorMessage, transactionStatusLabels } from '../lib/utils';
import type { Client, Project, Transaction } from '../types';

export default function Finance() {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const [filters, setFilters] = useState({
    month: String(currentDate.getMonth() + 1),
    year: String(currentDate.getFullYear()),
    client_id: '',
    project_id: '',
  });
  const [open, setOpen] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ['clients', 'finance-form'],
    queryFn: async () => (await api.get<Client[]>('/clients')).data,
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', 'finance-form'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'finance', filters],
    queryFn: async () => {
      const response = await api.get<Transaction[]>('/transactions', {
        params: {
          month: Number(filters.month),
          year: Number(filters.year),
          client_id: filters.client_id || undefined,
          project_id: filters.project_id || undefined,
        },
      });
      return response.data;
    },
  });

  const payMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await api.put<Transaction>(`/transactions/${transactionId}/pay`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
    },
  });

  const splitTransactions = useMemo(() => {
    const items = transactionsQuery.data ?? [];
    const receitas = items.filter((transaction) => transaction.type === 'receita');
    const despesas = items.filter((transaction) => transaction.type === 'despesa');
    const totalReceitas = receitas.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const totalDespesas = despesas.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    return { receitas, despesas, totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas };
  }, [transactionsQuery.data]);

  const years = Array.from({ length: 5 }, (_, index) => currentDate.getFullYear() - 2 + index);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-app-accent">Financeiro</p>
          <h1 className="mt-2 text-4xl font-extrabold text-white">Receitas e despesas</h1>
          <p className="mt-2 text-zinc-400">Controle mensal com baixa manual, filtros por cliente e projeto.</p>
        </div>
        <button className="button-primary gap-2" onClick={() => setOpen(true)} type="button">
          <Plus className="h-4 w-4" />
          Novo lançamento
        </button>
      </div>

      <div className="panel p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <select className="select-base" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={String(month)}>{String(month).padStart(2, '0')}</option>
            ))}
          </select>
          <select className="select-base" value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}>
            {years.map((year) => <option key={year} value={String(year)}>{year}</option>)}
          </select>
          <select className="select-base" value={filters.client_id} onChange={(event) => setFilters((current) => ({ ...current, client_id: event.target.value }))}>
            <option value="">Todos os clientes</option>
            {clientsQuery.data?.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select className="select-base" value={filters.project_id} onChange={(event) => setFilters((current) => ({ ...current, project_id: event.target.value }))}>
            <option value="">Todos os projetos</option>
            {projectsQuery.data?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <ArrowDownCircle className="h-5 w-5 text-emerald-300" />
            <div>
              <p className="text-sm text-zinc-400">Total receitas</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(splitTransactions.totalReceitas)}</p>
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="h-5 w-5 text-rose-300" />
            <div>
              <p className="text-sm text-zinc-400">Total despesas</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(splitTransactions.totalDespesas)}</p>
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <WalletCards className="h-5 w-5 text-app-accent" />
            <div>
              <p className="text-sm text-zinc-400">Saldo</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrencyBRL(splitTransactions.saldo)}</p>
            </div>
          </div>
        </div>
      </div>

      {transactionsQuery.isLoading ? <div className="panel p-6 text-zinc-400">Carregando lançamentos...</div> : null}
      {transactionsQuery.error ? <div className="panel p-6 text-rose-300">{getErrorMessage(transactionsQuery.error)}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <ArrowDownCircle className="h-5 w-5 text-emerald-300" />
            <div>
              <h2 className="text-xl font-bold text-white">Receitas</h2>
              <p className="text-sm text-zinc-400">Entradas previstas e já recebidas.</p>
            </div>
          </div>
          <div className="space-y-3">
            {splitTransactions.receitas.length > 0 ? splitTransactions.receitas.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-white/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{transaction.description}</p>
                    <p className="mt-1 text-sm text-zinc-400">{transaction.client_name || transaction.project_name || 'Sem vínculo'}</p>
                    <p className="mt-1 text-xs text-zinc-500">Vencimento: {formatDateBR(transaction.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatCurrencyBRL(transaction.amount)}</p>
                    <span className={cn('badge-base mt-2', badgeTone(transaction.status))}>{transactionStatusLabels[transaction.status]}</span>
                  </div>
                </div>
                {transaction.status !== 'pago' ? (
                  <div className="mt-4 flex justify-end">
                    <button className="button-primary" disabled={payMutation.isPending} onClick={() => payMutation.mutate(transaction.id)} type="button">
                      {payMutation.isPending ? 'Baixando...' : 'Marcar como pago'}
                    </button>
                  </div>
                ) : null}
              </div>
            )) : <p className="text-zinc-400">Nenhuma receita encontrada.</p>}
          </div>
        </section>

        <section className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <ArrowUpCircle className="h-5 w-5 text-rose-300" />
            <div>
              <h2 className="text-xl font-bold text-white">Despesas</h2>
              <p className="text-sm text-zinc-400">Saídas operacionais e de projeto.</p>
            </div>
          </div>
          <div className="space-y-3">
            {splitTransactions.despesas.length > 0 ? splitTransactions.despesas.map((transaction) => (
              <div key={transaction.id} className="rounded-2xl border border-white/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{transaction.description}</p>
                    <p className="mt-1 text-sm text-zinc-400">{transaction.client_name || transaction.project_name || 'Sem vínculo'}</p>
                    <p className="mt-1 text-xs text-zinc-500">Vencimento: {formatDateBR(transaction.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatCurrencyBRL(transaction.amount)}</p>
                    <span className={cn('badge-base mt-2', badgeTone(transaction.status))}>{transactionStatusLabels[transaction.status]}</span>
                  </div>
                </div>
              </div>
            )) : <p className="text-zinc-400">Nenhuma despesa encontrada.</p>}
          </div>
        </section>
      </div>

      {open ? (
        <div className="dialog-overlay no-print">
          <div className="dialog-panel">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Novo lançamento</h2>
                <p className="text-sm text-zinc-400">Cadastre receitas ou despesas com vencimento e vínculo opcional.</p>
              </div>
              <button className="button-secondary !px-3" onClick={() => setOpen(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <TransactionForm clients={clientsQuery.data ?? []} projects={projectsQuery.data ?? []} onCancel={() => setOpen(false)} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
