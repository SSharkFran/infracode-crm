import { useQuery } from '@tanstack/react-query';
import { CalendarRange, ChevronDown, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../../lib/api';
import { CLIENT_STATUS_VALUES, CLIENT_TYPE_VALUES } from '../../lib/constants';
import { clientStatusLabels, clientTypeLabels, formatRelativeTime, isHtmlInputFocused } from '../../lib/utils';
import type { Client, ClientDetail } from '../../types';
import { ClientForm } from '../../components/forms/ClientForm';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useDebounce } from '../../hooks/useDebounce';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useSessionStorage } from '../../hooks/useSessionStorage';

const DEFAULT_FILTERS = {
  search: '',
  types: [] as string[],
  statuses: [] as string[],
  from: '',
  to: '',
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useSessionStorage('clients-filters', DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebounce(filters.search, 300);

  const clientsQuery = useQuery({
    queryKey: ['clients', debouncedSearch],
    queryFn: async () => (await api.get<Client[]>('/clients', { params: { search: debouncedSearch || undefined } })).data,
  });
  const detailsQuery = useQuery({
    enabled: Boolean(clientsQuery.data?.length),
    queryKey: ['client-cards', clientsQuery.data?.map((client) => client.id).join(',')],
    queryFn: async () => Promise.all((clientsQuery.data ?? []).map(async (client) => (await api.get<ClientDetail>(`/clients/${client.id}`)).data)),
  });

  useKeyboard('n', () => {
    if (!isHtmlInputFocused()) {
      setCreateOpen(true);
    }
  });

  const interactionMap = useMemo(
    () => Object.fromEntries((detailsQuery.data ?? []).map((client) => [client.id, client.interactions[0]?.happened_at ?? null])),
    [detailsQuery.data],
  );

  const filteredClients = useMemo(() => {
    return (clientsQuery.data ?? []).filter((client) => {
      if (filters.types.length > 0 && !filters.types.includes(client.type)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(client.status)) return false;
      if (filters.from && new Date(client.created_at) < new Date(filters.from)) return false;
      if (filters.to && new Date(client.created_at) > new Date(`${filters.to}T23:59:59`)) return false;
      return true;
    });
  }, [clientsQuery.data, filters]);

  const toggleArrayFilter = (key: 'types' | 'statuses', value: string) => {
    setFilters({
      ...filters,
      [key]: filters[key].includes(value) ? filters[key].filter((item) => item !== value) : [...filters[key], value],
    });
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Carteira, prospecção e contexto comercial com filtros persistentes.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>Novo cliente</Button>
      </div>

      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
            <input className="input pl-10" onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Buscar por nome, e-mail ou telefone" value={filters.search} />
          </div>
          <Button onClick={() => setFiltersOpen((current) => !current)} variant="secondary">
            Filtros
            <ChevronDown className={`h-4 w-4 transition ${filtersOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {filtersOpen ? (
          <div className="mt-5 space-y-5 border-t border-border pt-5">
            <div>
              <label className="field-label">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {CLIENT_TYPE_VALUES.map((value) => (
                  <button key={value} className={`pill-filter ${filters.types.includes(value) ? 'pill-filter-active' : ''}`} onClick={() => toggleArrayFilter('types', value)} type="button">{clientTypeLabels[value]}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Status</label>
              <div className="flex flex-wrap gap-2">
                {CLIENT_STATUS_VALUES.map((value) => (
                  <button key={value} className={`pill-filter ${filters.statuses.includes(value) ? 'pill-filter-active' : ''}`} onClick={() => toggleArrayFilter('statuses', value)} type="button">{clientStatusLabels[value]}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">De</label>
                <input className="input" onChange={(event) => setFilters({ ...filters, from: event.target.value })} type="date" value={filters.from} />
              </div>
              <div>
                <label className="field-label">Até</label>
                <input className="input" onChange={(event) => setFilters({ ...filters, to: event.target.value })} type="date" value={filters.to} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {clientsQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}</div> : null}

      {!clientsQuery.isLoading && filteredClients.length === 0 ? (
        <EmptyState description="Ajuste a busca ou os filtros para encontrar a conta certa." icon={<Users className="h-5 w-5" />} title="Nenhum cliente encontrado" />
      ) : null}

      {filteredClients.length > 0 ? (
        <div className={filteredClients.length > 50 ? 'max-h-[72vh] overflow-y-auto pr-1' : ''}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((client) => (
              <button
                key={client.id}
                className="card group p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-glow"
                onClick={() => navigate(`/clients/${client.id}`)}
                type="button"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={client.name} size="lg" />
                    <div>
                      <p className="font-semibold text-text-primary">{client.name}</p>
                      <p className="text-sm text-text-secondary">{client.email || 'Sem e-mail cadastrado'}</p>
                    </div>
                  </div>
                  <Badge statusValue={client.type}>{clientTypeLabels[client.type]}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge dot statusValue={client.status}>{clientStatusLabels[client.status]}</Badge>
                  <span className="text-xs text-text-tertiary">{client.phone || 'Sem telefone'}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
                  <CalendarRange className="h-4 w-4" />
                  Última interação: {formatRelativeTime(interactionMap[client.id])}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Modal description="Novo cadastro em formato de sheet lateral." onClose={() => setCreateOpen(false)} open={createOpen} placement="right" size="lg" title="Novo cliente">
        <ClientForm onCancel={() => setCreateOpen(false)} onSuccess={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}
