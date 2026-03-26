import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SearchCode, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import api from '../lib/api';
import { badgeTone, cn, formatDateTimeBR, getErrorMessage, integrationStatusLabels, jsonPreview } from '../lib/utils';
import type { DataJudQueryResponse, Integration, IntegrationEventPage, IntegrationStatus, IntegrationType } from '../types';

const defaultForm = {
  name: '',
  type: 'webhook_in' as IntegrationType,
  status: 'ativa' as IntegrationStatus,
  configText: '{\n  "provider": "custom"\n}',
};

export default function Integrations() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [dataJudCnj, setDataJudCnj] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const integrationsQuery = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => (await api.get<Integration[]>('/integrations')).data,
  });

  const eventsQueries = useQueries({
    queries: (integrationsQuery.data ?? []).map((integration) => ({
      queryKey: ['integration-events', integration.id],
      queryFn: async () => (await api.get<IntegrationEventPage>(`/integrations/${integration.id}/events`, { params: { page: 1, page_size: 50 } })).data,
      enabled: Boolean(integration.id),
    })),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(form.configText);
      const response = await api.post<Integration>('/integrations', {
        name: form.name,
        type: form.type,
        status: form.status,
        config: parsed,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setOpen(false);
      setValidationError(null);
      setForm(defaultForm);
    },
    onError: (error) => setValidationError(getErrorMessage(error)),
  });

  const dataJudMutation = useMutation({
    mutationFn: async () => {
      if (!dataJudCnj.trim()) throw new Error('Informe um número CNJ.');
      const response = await api.post<DataJudQueryResponse>('/integrations/datajud/query', { numero_cnj: dataJudCnj.trim() });
      return response.data;
    },
  });

  const eventMap = useMemo(() => {
    const integrations = integrationsQuery.data ?? [];
    return integrations.reduce<Record<string, IntegrationEventPage['items']>>((accumulator, integration, index) => {
      accumulator[integration.id] = eventsQueries[index]?.data?.items ?? [];
      return accumulator;
    }, {});
  }, [eventsQueries, integrationsQuery.data]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-app-accent">Integrações</p>
          <h1 className="mt-2 text-4xl font-extrabold text-white">APIs, webhooks e auditoria</h1>
          <p className="mt-2 text-zinc-400">Cadastre integrações, acompanhe eventos e consulte o DataJud.</p>
        </div>
        <button className="button-primary gap-2" onClick={() => setOpen(true)} type="button">
          <Plus className="h-4 w-4" />
          Nova integração
        </button>
      </div>

      {integrationsQuery.isLoading ? <div className="panel p-6 text-zinc-400">Carregando integrações...</div> : null}
      {integrationsQuery.error ? <div className="panel p-6 text-rose-300">{getErrorMessage(integrationsQuery.error)}</div> : null}

      <section className="panel p-6">
        <div className="mb-5 flex items-center gap-3">
          <SearchCode className="h-5 w-5 text-app-accent" />
          <div>
            <h2 className="text-xl font-bold text-white">Consulta DataJud</h2>
            <p className="text-sm text-zinc-400">Busca rápida de processo por número CNJ.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <input className="input-base" placeholder="0000000-00.0000.0.00.0000" value={dataJudCnj} onChange={(event) => setDataJudCnj(event.target.value)} />
          <button className="button-primary" disabled={dataJudMutation.isPending} onClick={() => dataJudMutation.mutate()} type="button">
            {dataJudMutation.isPending ? 'Consultando...' : 'Buscar'}
          </button>
        </div>
        {dataJudMutation.error ? <p className="mt-3 text-sm text-rose-300">{getErrorMessage(dataJudMutation.error)}</p> : null}
        {dataJudMutation.data ? (
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">{JSON.stringify(dataJudMutation.data.result, null, 2)}</pre>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="panel p-6">
          <h2 className="text-xl font-bold text-white">Integrações cadastradas</h2>
          <div className="mt-5 space-y-3">
            {integrationsQuery.data && integrationsQuery.data.length > 0 ? integrationsQuery.data.map((integration) => (
              <div key={integration.id} className="rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{integration.name}</h3>
                    <p className="text-sm text-zinc-400">{integration.type}</p>
                  </div>
                  <span className={cn('badge-base', badgeTone(integration.status))}>{integrationStatusLabels[integration.status]}</span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">Último evento: {formatDateTimeBR(integration.last_event_at)}</p>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-black/30 p-3 text-xs text-zinc-300">{JSON.stringify(integration.config, null, 2)}</pre>
              </div>
            )) : <p className="text-zinc-400">Nenhuma integração cadastrada.</p>}
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold text-white">Log de eventos</h2>
          <div className="mt-5 space-y-5">
            {integrationsQuery.data && integrationsQuery.data.length > 0 ? integrationsQuery.data.map((integration) => (
              <div key={integration.id} className="rounded-2xl border border-white/10 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{integration.name}</h3>
                    <p className="text-xs text-zinc-500">Últimos 50 eventos</p>
                  </div>
                  <span className={cn('badge-base', badgeTone(integration.status))}>{integrationStatusLabels[integration.status]}</span>
                </div>
                <div className="space-y-3">
                  {(eventMap[integration.id] ?? []).length > 0 ? (eventMap[integration.id] ?? []).map((event) => (
                    <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('badge-base', badgeTone(event.direction))}>{event.direction === 'in' ? 'Entrada' : 'Saída'}</span>
                          <span className={cn('badge-base', badgeTone(event.status))}>{event.status}</span>
                        </div>
                        <span className="text-xs text-zinc-500">{formatDateTimeBR(event.created_at)}</span>
                      </div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-zinc-300">{jsonPreview(event.payload)}</pre>
                    </div>
                  )) : <p className="text-sm text-zinc-500">Nenhum evento registrado.</p>}
                </div>
              </div>
            )) : <p className="text-zinc-400">Sem integrações para exibir eventos.</p>}
          </div>
        </section>
      </div>

      {open ? (
        <div className="dialog-overlay no-print">
          <div className="dialog-panel">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Nova integração</h2>
                <p className="text-sm text-zinc-400">A configuração é persistida de forma criptografada no backend.</p>
              </div>
              <button className="button-secondary !px-3" onClick={() => setOpen(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setValidationError(null);
                createMutation.mutate();
              }}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="field-label">Nome</label>
                  <input className="input-base" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Tipo</label>
                  <select className="select-base" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as IntegrationType }))}>
                    <option value="webhook_in">webhook_in</option>
                    <option value="api_out">api_out</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="select-base" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as IntegrationStatus }))}>
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                    <option value="erro">Erro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">Configuração JSON</label>
                <textarea className="textarea-base" rows={10} value={form.configText} onChange={(event) => setForm((current) => ({ ...current, configText: event.target.value }))} />
              </div>
              {validationError ? <p className="text-sm text-rose-300">{validationError}</p> : null}
              <div className="flex justify-end gap-3">
                <button className="button-secondary" onClick={() => setOpen(false)} type="button">Cancelar</button>
                <button className="button-primary" disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? 'Salvando...' : 'Criar integração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
