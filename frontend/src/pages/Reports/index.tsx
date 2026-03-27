import { useQuery } from '@tanstack/react-query';
import { BarChart3, FileDown, LineChart as LineChartIcon, PieChart } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import api from '../../lib/api';
import { CustomTooltip } from '../../components/charts/CustomTooltip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import { formatCurrencyBRL, formatDateBR, getDaysOverdue, getErrorMessage, transactionStatusLabels } from '../../lib/utils';
import type { ProfitByProjectItem, ReceivablesReport, RevenueByClientItem, RevenueByMonthItem } from '../../types';
import { Badge } from '../../components/ui/Badge';

const tabs = ['client', 'month', 'receivables', 'profit'] as const;
type TabKey = (typeof tabs)[number];

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('client');

  const revenueByClientQuery = useQuery({ queryKey: ['reports', 'revenue-by-client'], queryFn: async () => (await api.get<RevenueByClientItem[]>('/reports/revenue-by-client')).data });
  const revenueByMonthQuery = useQuery({ queryKey: ['reports', 'revenue-by-month'], queryFn: async () => (await api.get<RevenueByMonthItem[]>('/reports/revenue-by-month')).data });
  const receivablesQuery = useQuery({ queryKey: ['reports', 'receivables'], queryFn: async () => (await api.get<ReceivablesReport>('/reports/receivables')).data });
  const profitQuery = useQuery({ queryKey: ['reports', 'profit-by-project'], queryFn: async () => (await api.get<ProfitByProjectItem[]>('/reports/profit-by-project')).data });

  const failedQuery = [revenueByClientQuery, revenueByMonthQuery, receivablesQuery, profitQuery].find((query) => query.error);
  if (failedQuery) return <EmptyState description={getErrorMessage(failedQuery.error)} icon={<BarChart3 className="h-5 w-5" />} title="Não foi possível carregar os relatórios" />;

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Indicadores financeiros com visual consistente e impressão pronta.</p>
        </div>
        <Button leftIcon={<FileDown className="h-4 w-4" />} onClick={() => window.print()} variant="secondary">Exportar PDF</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => <button key={item} className={`pill-filter ${tab === item ? 'pill-filter-active' : ''}`} onClick={() => setTab(item)} type="button">{item === 'client' ? 'Receita por cliente' : item === 'month' ? 'Receita por mês' : item === 'receivables' ? 'Contas a receber' : 'Lucro por projeto'}</button>)}
      </div>

      {tab === 'client' ? (
        <section className="card print-card p-6">
          <div className="mb-4 flex items-center gap-3"><BarChart3 className="h-5 w-5 text-accent-text" /><h2 className="section-title !mb-0">Receita por cliente</h2></div>
          {revenueByClientQuery.isLoading ? <SkeletonCard /> : (
            <div className="h-[28rem]">
              <ResponsiveContainer>
                <BarChart data={revenueByClientQuery.data ?? []} layout="vertical">
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatCurrencyBRL(Number(value))} />
                  <YAxis dataKey="client_name" type="category" width={160} />
                  <Tooltip content={<CustomTooltip currency />} />
                  <Bar dataKey="total_received" fill="#6366f1" radius={[0, 10, 10, 0]} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      ) : null}

      {tab === 'month' ? (
        <section className="card print-card p-6">
          <div className="mb-4 flex items-center gap-3"><LineChartIcon className="h-5 w-5 text-success-text" /><h2 className="section-title !mb-0">Receita por mês</h2></div>
          {revenueByMonthQuery.isLoading ? <SkeletonCard /> : (
            <div className="h-[28rem]">
              <ResponsiveContainer>
                <LineChart data={revenueByMonthQuery.data ?? []}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrencyBRL(Number(value))} />
                  <Tooltip content={<CustomTooltip currency />} />
                  <Line dataKey="total_received" dot={{ fill: '#22c55e', r: 4 }} isAnimationActive stroke="#22c55e" strokeWidth={3} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      ) : null}

      {tab === 'receivables' ? (
        <section className="space-y-6">
          {receivablesQuery.isLoading ? <SkeletonTable /> : receivablesQuery.data?.groups.map((group) => (
            <div key={group.status} className="card print-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <Badge statusValue={group.status}>{transactionStatusLabels[group.status]}</Badge>
                <p className="text-sm text-text-secondary">Total {formatCurrencyBRL(group.total_amount)} • {group.count} lançamento(s)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead><tr><th>Descrição</th><th>Cliente</th><th>Valor</th><th>Vencimento</th><th>Dias em atraso</th></tr></thead>
                  <tbody>
                    {group.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="text-text-primary">{transaction.description}</td>
                        <td>{transaction.client_name || '-'}</td>
                        <td className="text-text-primary">{formatCurrencyBRL(transaction.amount)}</td>
                        <td>{formatDateBR(transaction.due_date)}</td>
                        <td>{Math.max(0, getDaysOverdue(transaction.due_date))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {tab === 'profit' ? (
        <section className="card print-card p-6">
          <div className="mb-4 flex items-center gap-3"><PieChart className="h-5 w-5 text-accent-text" /><h2 className="section-title !mb-0">Lucro por projeto</h2></div>
          {profitQuery.isLoading ? <SkeletonTable /> : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr><th>Projeto</th><th>Receita</th><th>Despesa</th><th>Lucro</th></tr></thead>
                <tbody>
                  {profitQuery.data?.map((item) => (
                    <tr key={item.project_id}>
                      <td className="text-text-primary">{item.project_name}</td>
                      <td className="text-text-primary">{formatCurrencyBRL(item.total_receita)}</td>
                      <td className="text-text-primary">{formatCurrencyBRL(item.total_despesa)}</td>
                      <td className="text-text-primary">{formatCurrencyBRL(item.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
