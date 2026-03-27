import { useQuery } from '@tanstack/react-query';
import { ChevronDown, RefreshCcw } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import api from '../../lib/api';
import { DEFAULT_PAGE_SIZE } from '../../lib/constants';
import { formatDateTimeBR, jsonPreview } from '../../lib/utils';
import type { IntegrationEventPage, IntegrationEventStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface EventLogProps {
  integrationId: string;
}

export function EventLog({ integrationId }: EventLogProps) {
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState<IntegrationEventStatus | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    enabled: Boolean(integrationId),
    queryKey: ['integration-events', integrationId, page, DEFAULT_PAGE_SIZE],
    queryFn: async () => (await api.get<IntegrationEventPage>(`/integrations/${integrationId}/events`, { params: { page, page_size: DEFAULT_PAGE_SIZE } })).data,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const filteredItems = useMemo(
    () => (eventsQuery.data?.items ?? []).filter((item) => (statusFilter ? item.status === statusFilter : true)),
    [eventsQuery.data?.items, statusFilter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="select max-w-[12rem]" onChange={(event) => setStatusFilter(event.target.value as IntegrationEventStatus | '')} value={statusFilter}>
          <option value="">Todos os status</option>
          <option value="ok">OK</option>
          <option value="erro">Erro</option>
        </select>
        <Button leftIcon={<RefreshCcw className="h-4 w-4" />} onClick={() => eventsQuery.refetch()} variant="secondary">Atualizar</Button>
        <button className="switch" data-checked={autoRefresh} onClick={() => setAutoRefresh((current) => !current)} type="button">
          <span className="switch-thumb" />
        </button>
        <span className="text-sm text-text-secondary">Auto-refresh 30s</span>
      </div>
      {filteredItems.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>Direção</th>
                <th>Status</th>
                <th>Payload</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <Fragment key={item.id}>
                  <tr key={item.id}>
                    <td><Badge statusValue={item.direction}>{item.direction === 'in' ? 'Entrada' : 'Saída'}</Badge></td>
                    <td><Badge statusValue={item.status}>{item.status.toUpperCase()}</Badge></td>
                    <td>{jsonPreview(item.payload, 120)}</td>
                    <td>
                      <button className="flex items-center gap-2 text-left text-sm text-text-primary" onClick={() => setExpandedId((current) => current === item.id ? null : item.id)} type="button">
                        {formatDateTimeBR(item.created_at)}
                        <ChevronDown className="h-4 w-4 text-text-secondary" />
                      </button>
                    </td>
                  </tr>
                  {expandedId === item.id ? (
                    <tr>
                      <td className="bg-elevated/70" colSpan={4}>
                        <pre className="whitespace-pre-wrap break-words text-xs text-text-secondary">{JSON.stringify(item.payload, null, 2)}</pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState description="Os eventos recebidos e enviados por esta integração aparecerão aqui." icon={<RefreshCcw className="h-5 w-5" />} title="Nenhum evento nesta página" />
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">Página {page}</p>
        <div className="flex gap-3">
          <Button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} variant="secondary">Anterior</Button>
          <Button disabled={Boolean(eventsQuery.data) && page * DEFAULT_PAGE_SIZE >= (eventsQuery.data?.total ?? 0)} onClick={() => setPage((current) => current + 1)} variant="secondary">Próxima</Button>
        </div>
      </div>
    </div>
  );
}
