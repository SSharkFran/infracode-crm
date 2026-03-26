import { useQuery } from '@tanstack/react-query';
import { BarChart3, FileDown, LineChart as LineChartIcon, PieChart } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import api from '../lib/api';
import { badgeTone, cn, formatCurrencyBRL, getErrorMessage, transactionStatusLabels } from '../lib/utils';
import type { ProfitByProjectItem, ReceivablesReport, RevenueByClientItem, RevenueByMonthItem } from '../types';

const tabs = ['client', 'month', 'receivables', 'profit'] as const;
type TabKey = (typeof tabs)[number];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<TabKey>('client');

  const revenueByClientQuery = useQuery({
    queryKey: ['reports', 'revenue-by-client'],
    queryFn: async () => (await api.get<RevenueByClientItem[]>('/reports/revenue-by-client')).data,
  });
  const revenueByMonthQuery = useQuery({
    queryKey: ['reports', 'revenue-by-month'],
    queryFn: async () => (await api.get<RevenueByMonthItem[]>('/reports/revenue-by-month')).data,
  });
  const receivablesQuery = useQuery({
    queryKey: ['reports', 'receivables'],
    queryFn: async () => (await api.get<ReceivablesReport>('/reports/receivables')).data,
  });
  const profitQuery = useQuery({
    queryKey: ['reports', 'profit-by-project'],
    queryFn: async () => (await api.get<ProfitByProjectItem[]>('/reports/profit-by-project')).data,
  });

  const failedQuery = [revenueByClientQuery, revenueByMonthQuery, receivablesQuery, profitQuery].find((query) => query.error);
  if (failedQuery) {
    return <div className="panel p-6 text-rose-300">{getErrorMessage(failedQuery.error)}</div>;
  }

  const printButton = (
    <button className="button-secondary gap-2 no-print" onClick={() => window.print()} type="button">
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </button>
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-app-accent">Relatórios</p>
        <h1 className="mt-2 text-4xl font-extrabold text-white">Indicadores financeiros</h1>
        <p className="mt-2 text-zinc-400">Seções prontas para análise rápida e impressão em PDF.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={cn('button-secondary', activeTab === tab && '!border-app-accent !bg-app-accent !text-white')}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === 'client' && 'Receita por Cliente'}
            {tab === 'month' && 'Receita por Mês'}
            {tab === 'receivables' && 'Contas a Receber'}
            {tab === 'profit' && 'Lucro por Projeto'}
          </button>
        ))}
      </div>

      {activeTab === 'client' ? (
        <section className="panel print-surface p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-app-accent" />
              <div>
                <h2 className="text-xl font-bold text-white">Receita por cliente</h2>
                <p className="text-sm text-zinc-400">Total recebido por conta.</p>
              </div>
            </div>
            {printButton}
          </div>
          <div className="h-96">
            <ResponsiveContainer>
              <BarChart data={revenueByClientQuery.data ?? []} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" stroke="#a1a1aa" tickFormatter={(value) => formatCurrencyBRL(Number(value))} />
                <YAxis type="category" dataKey="client_name" stroke="#a1a1aa" width={160} />
                <Tooltip formatter={(value) => formatCurrencyBRL(Number(value))} contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }} />
                <Bar dataKey="total_received" fill="#6366f1" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {activeTab === 'month' ? (
        <section className="panel print-surface p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LineChartIcon className="h-5 w-5 text-app-accent" />
              <div>
                <h2 className="text-xl font-bold text-white">Receita por mês</h2>
                <p className="text-sm text-zinc-400">Série histórica dos últimos 12 meses.</p>
              </div>
            </div>
            {printButton}
          </div>
          <div className="h-96">
            <ResponsiveContainer>
              <LineChart data={revenueByMonthQuery.data ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="month" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" tickFormatter={(value) => formatCurrencyBRL(Number(value))} />
                <Tooltip formatter={(value) => formatCurrencyBRL(Number(value))} contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }} />
                <Line type="monotone" dataKey="total_received" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {activeTab === 'receivables' ? (
        <section className="panel print-surface p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PieChart className="h-5 w-5 text-app-accent" />
              <div>
                <h2 className="text-xl font-bold text-white">Contas a receber</h2>
                <p className="text-sm text-zinc-400">Agrupadas por status com totais.</p>
              </div>
            </div>
            {printButton}
          </div>
          <div className="space-y-6">
            {receivablesQuery.data?.groups.map((group) => (
              <div key={group.status} className="rounded-2xl border border-white/10 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className={cn('badge-base', badgeTone(group.status))}>{transactionStatusLabels[group.status]}</span>
                  <div className="text-right text-sm text-zinc-400">
                    <p>Total: <span className="font-semibold text-white">{formatCurrencyBRL(group.total_amount)}</span></p>
                    <p>{group.count} lançamento(s)</p>
                  </div>
                </div>
                <div className="table-shell overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/5 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Descrição</th>
                        <th className="px-4 py-3 font-medium">Cliente</th>
                        <th className="px-4 py-3 font-medium">Valor</th>
                        <th className="px-4 py-3 font-medium">Vencimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-t border-white/10">
                          <td className="px-4 py-3 text-white">{transaction.description}</td>
                          <td className="px-4 py-3 text-zinc-400">{transaction.client_name || '-'}</td>
                          <td className="px-4 py-3 text-white">{formatCurrencyBRL(transaction.amount)}</td>
                          <td className="px-4 py-3 text-zinc-400">{formatDateBR(transaction.due_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-app-accent/20 bg-app-accent/10 p-4 text-right text-sm font-semibold text-white">
              Total geral: {formatCurrencyBRL(receivablesQuery.data?.grand_total ?? 0)}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'profit' ? (
        <section className="panel print-surface p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-app-accent" />
              <div>
                <h2 className="text-xl font-bold text-white">Lucro por projeto</h2>
                <p className="text-sm text-zinc-400">Receita menos despesa por entrega.</p>
              </div>
            </div>
            {printButton}
          </div>
          <div className="table-shell overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Projeto</th>
                  <th className="px-4 py-3 font-medium">Receita</th>
                  <th className="px-4 py-3 font-medium">Despesa</th>
                  <th className="px-4 py-3 font-medium">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {profitQuery.data?.map((item) => (
                  <tr key={item.project_id} className="border-t border-white/10">
                    <td className="px-4 py-3 text-white">{item.project_name}</td>
                    <td className="px-4 py-3 text-white">{formatCurrencyBRL(item.total_receita)}</td>
                    <td className="px-4 py-3 text-white">{formatCurrencyBRL(item.total_despesa)}</td>
                    <td className="px-4 py-3 text-white">{formatCurrencyBRL(item.lucro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
