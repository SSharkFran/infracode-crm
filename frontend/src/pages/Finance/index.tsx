import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowLeft, ArrowRight, ArrowUpCircle, Plus, Trash2, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

import api from '../../lib/api';
import { formatCurrencyBRL, formatDateBR, formatMonthYear, getErrorMessage, isHtmlInputFocused, transactionStatusLabels } from '../../lib/utils';
import type { Client, Project, Transaction } from '../../types';
import { TransactionForm } from '../../components/forms/TransactionForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useConfirm } from '../../hooks/useConfirm';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSessionStorage } from '../../hooks/useSessionStorage';
import { useToast } from '../../hooks/useToast';

const today = new Date();
const DEFAULT_FILTERS = { month: today.getMonth() + 1, year: today.getFullYear(), client_id: '', project_id: '' };

export default function FinancePage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [filters, setFilters] = useSessionStorage('finance-filters', DEFAULT_FILTERS);
  const [createOpen, setCreateOpen] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ['finance', 'clients'],
    queryFn: async () => (await api.get<Client[]>('/clients')).data,
  });
  const projectsQuery = useQuery({
    queryKey: ['finance', 'projects'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'finance', filters],
    queryFn: async () => (await api.get<Transaction[]>('/transactions', { params: filters })).data,
  });

  useKeyboard('n', () => {
    if (!isHtmlInputFocused()) setCreateOpen(true);
  });

  const payMutation = useMutation({
    mutationFn: async (transactionId: string) => (await api.put<Transaction>(`/transactions/${transactionId}/pay`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      toast.success('Lançamento marcado como pago.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => { await api.delete(`/transactions/${transactionId}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false });
      toast.success('Lançamento excluído.');
    },
  });

  const splitTransactions = useMemo(() => {
    const items = transactionsQuery.data ?? [];
    const revenue = items.filter((item) => item.type === 'receita');
    const expense = items.filter((item) => item.type === 'despesa');
    const totalRevenue = revenue.reduce((total, item) => total + Number(item.amount), 0);
    const totalExpense = expense.reduce((total, item) => total + Number(item.amount), 0);
    const overdueCount = revenue.filter((item) => item.status === 'vencido').length;
    return { revenue, expense, totalRevenue, totalExpense, balance: totalRevenue - totalExpense, overdueCount };
  }, [transactionsQuery.data]);

  const selectedDate = new Date(filters.year, filters.month - 1, 1);

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Receitas, despesas e recebíveis vencidos com ações rápidas.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Novo lançamento</Button>
      </div>

      <div className="card space-y-5 p-5">
        <div className="flex items-center gap-3">
          <Button onClick={() => setFilters({ ...filters, month: new Date(filters.year, filters.month - 2, 1).getMonth() + 1, year: new Date(filters.year, filters.month - 2, 1).getFullYear() })} variant="secondary"><ArrowLeft className="h-4 w-4" /></Button>
          <p className="text-lg font-semibold text-text-primary">{formatMonthYear(selectedDate)}</p>
          <Button onClick={() => setFilters({ ...filters, month: new Date(filters.year, filters.month, 1).getMonth() + 1, year: new Date(filters.year, filters.month, 1).getFullYear() })} variant="secondary"><ArrowRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SearchableSelect onChange={(value) => setFilters({ ...filters, client_id: value })} options={[{ label: 'Todos os clientes', value: '' }, ...(clientsQuery.data ?? []).map((client) => ({ label: client.name, value: client.id }))]} value={filters.client_id} />
          <SearchableSelect onChange={(value) => setFilters({ ...filters, project_id: value })} options={[{ label: 'Todos os projetos', value: '' }, ...(projectsQuery.data ?? []).map((project) => ({ label: project.name, value: project.id }))]} value={filters.project_id} />
        </div>
      </div>

      {transactionsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}</div> : null}

      {!transactionsQuery.isLoading ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="card p-5"><div className="flex items-center gap-3"><ArrowDownCircle className="h-5 w-5 text-success-text" /><div><p className="text-sm text-text-secondary">Receita do período</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(splitTransactions.totalRevenue)}</p></div></div></div>
            <div className="card p-5"><div className="flex items-center gap-3"><ArrowUpCircle className="h-5 w-5 text-danger-text" /><div><p className="text-sm text-text-secondary">Despesas do período</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(splitTransactions.totalExpense)}</p></div></div></div>
            <div className="card p-5"><div className="flex items-center gap-3"><Wallet className={`h-5 w-5 ${splitTransactions.balance >= 0 ? 'text-success-text' : 'text-danger-text'}`} /><div><p className="text-sm text-text-secondary">Saldo</p><p className="mt-3 text-2xl font-semibold text-text-primary">{formatCurrencyBRL(splitTransactions.balance)}</p></div></div></div>
            <div className="card p-5"><p className="text-sm text-text-secondary">Recebíveis vencidos</p><div className="mt-3 flex items-center gap-3"><p className="text-2xl font-semibold text-text-primary">{splitTransactions.overdueCount}</p>{splitTransactions.overdueCount > 0 ? <Badge tone="danger">atenção</Badge> : null}</div></div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <FinanceColumn
              items={splitTransactions.revenue}
              onDelete={async (id) => { if (await confirm('Deseja excluir este lançamento?')) deleteMutation.mutate(id); }}
              onPay={(id) => payMutation.mutate(id)}
              title="Receitas"
            />
            <FinanceColumn
              items={splitTransactions.expense}
              onDelete={async (id) => { if (await confirm('Deseja excluir este lançamento?')) deleteMutation.mutate(id); }}
              title="Despesas"
            />
          </div>
        </>
      ) : null}

      {!transactionsQuery.isLoading && transactionsQuery.error ? <EmptyState description={getErrorMessage(transactionsQuery.error)} icon={<Wallet className="h-5 w-5" />} title="Erro ao carregar transações" /> : null}

      <Modal description="Cadastre uma nova receita ou despesa com vínculos opcionais." onClose={() => setCreateOpen(false)} open={createOpen} size="lg" title="Novo lançamento">
        <TransactionForm clients={clientsQuery.data ?? []} onCancel={() => setCreateOpen(false)} onSuccess={() => setCreateOpen(false)} projects={projectsQuery.data ?? []} />
      </Modal>
    </div>
  );
}

function FinanceColumn({
  items,
  onDelete,
  onPay,
  title,
}: {
  items: Transaction[];
  onDelete: (id: string) => void | Promise<void>;
  onPay?: (id: string) => void | Promise<void>;
  title: string;
}) {
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <section className="card p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="section-title">{title}</h2><p className="text-sm text-text-secondary">Total {formatCurrencyBRL(total)}</p></div>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`rounded-card border-l-4 ${item.status === 'pago' ? 'border-l-success' : item.status === 'vencido' ? 'border-l-danger' : 'border-l-warning'} border border-border bg-elevated/60 p-4`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-text-primary">{item.description}</p>
                  <p className="mt-1 text-sm text-text-secondary">{item.client_name || item.project_name || 'Sem vínculo'}</p>
                  <p className="mt-1 text-xs text-text-tertiary">Vencimento {formatDateBR(item.due_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-text-primary">{formatCurrencyBRL(item.amount)}</p>
                  <Badge statusValue={item.status}>{transactionStatusLabels[item.status]}</Badge>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {onPay && item.status !== 'pago' ? <Button onClick={() => onPay(item.id)} variant="secondary">Marcar como pago</Button> : null}
                <Button onClick={() => onDelete(item.id)} variant="danger"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState description="Nenhum lançamento encontrado para este período." icon={<Wallet className="h-5 w-5" />} title={`Sem ${title.toLowerCase()}`} />}
    </section>
  );
}
