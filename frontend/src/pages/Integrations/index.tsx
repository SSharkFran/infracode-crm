import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, Eye, EyeOff, KeyRound, Plus, Save, Shield, Trash2, Webhook } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import api, { resolveApiBaseUrl } from '../../lib/api';
import { DATAJUD_TRIBUNALS, KNOWN_INTEGRATION_PROVIDERS } from '../../lib/constants';
import { formatDateTimeBR, formatJsonWithHighlight, getErrorMessage, integrationStatusLabels, integrationTypeLabels, isHtmlInputFocused, maskSecret } from '../../lib/utils';
import type { DataJudQueryResponse, Integration, IntegrationStatus, IntegrationType } from '../../types';
import { EventLog } from '../../components/integrations/EventLog';
import { IntegrationCard } from '../../components/integrations/IntegrationCard';
import { JsonEditor } from '../../components/integrations/JsonEditor';
import { WebhookTester } from '../../components/integrations/WebhookTester';
import { IntegrationForm } from '../../components/forms/IntegrationForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useConfirm } from '../../hooks/useConfirm';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useToast } from '../../hooks/useToast';

const tabs = ['config', 'webhook', 'events', 'docs'] as const;
type CenterTab = (typeof tabs)[number];

interface DataJudHistoryEntry {
  createdAt: string;
  cnj: string;
  result: Record<string, unknown>;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<IntegrationType | ''>('');
  const [tab, setTab] = useState<CenterTab>('config');
  const [draftName, setDraftName] = useState('');
  const [draftStatus, setDraftStatus] = useState<IntegrationStatus>('ativa');
  const [configText, setConfigText] = useState('{}');
  const [configValid, setConfigValid] = useState<boolean | null>(null);
  const [revealSecrets, setRevealSecrets] = useState<Record<string, boolean>>({});
  const [dataJudForm, setDataJudForm] = useState({ numero_cnj: '', endpoint_path: '' });
  const [dataJudHistory, setDataJudHistory] = useState<DataJudHistoryEntry[]>([]);
  const [apiKeysOpen, setApiKeysOpen] = useState(true);

  const integrationsQuery = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => (await api.get<Integration[]>('/integrations')).data,
  });

  useKeyboard('n', () => {
    if (!isHtmlInputFocused()) setCreateOpen(true);
  });

  const filteredIntegrations = useMemo(
    () => (integrationsQuery.data ?? []).filter((integration) => (typeFilter ? integration.type === typeFilter : true)),
    [integrationsQuery.data, typeFilter],
  );

  useEffect(() => {
    if (!selectedId && filteredIntegrations[0]) {
      setSelectedId(filteredIntegrations[0].id);
    }
    if (selectedId && !filteredIntegrations.some((integration) => integration.id === selectedId)) {
      setSelectedId(filteredIntegrations[0]?.id ?? '');
    }
  }, [filteredIntegrations, selectedId]);

  const selectedIntegration = useMemo(
    () => (integrationsQuery.data ?? []).find((integration) => integration.id === selectedId) ?? null,
    [integrationsQuery.data, selectedId],
  );

  useEffect(() => {
    if (!selectedIntegration) return;
    setDraftName(selectedIntegration.name);
    setDraftStatus(selectedIntegration.status);
    setConfigText(JSON.stringify(selectedIntegration.config, null, 2));
    setConfigValid(null);
  }, [selectedIntegration]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIntegration) throw new Error('Selecione uma integração.');
      const config = JSON.parse(configText);
      return (await api.put<Integration>(`/integrations/${selectedIntegration.id}`, { name: draftName, status: draftStatus, config })).data;
    },
    onSuccess: (savedIntegration) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setSelectedId(savedIntegration.id);
      toast.success('Integração atualizada com sucesso.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIntegration) throw new Error('Selecione uma integração.');
      return (await api.put<Integration>(`/integrations/${selectedIntegration.id}`, { status: 'inativa' })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.warning('A API não expõe exclusão; a integração foi desativada.');
    },
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      const generatedKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '') : `${Date.now()}${Math.random().toString(16).slice(2)}`;
      return (await api.post<Integration>('/integrations', {
        name: `api-key-${Date.now()}`,
        type: 'api_out',
        status: 'ativa',
        config: { is_api_key: true, api_key: generatedKey },
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Nova API key gerada com sucesso.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IntegrationStatus }) => (await api.put<Integration>(`/integrations/${id}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Status da chave atualizado.');
    },
  });

  const dataJudMutation = useMutation({
    mutationFn: async () => (await api.post<DataJudQueryResponse>('/integrations/datajud/query', {
      numero_cnj: dataJudForm.numero_cnj,
      endpoint_path: dataJudForm.endpoint_path || undefined,
    })).data,
    onSuccess: (response) => {
      setDataJudHistory((current) => [{ createdAt: new Date().toISOString(), cnj: dataJudForm.numero_cnj, result: response.result }, ...current].slice(0, 10));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const parsedConfig = parseJson(configText) ?? {};
  const apiKeyIntegrations = (integrationsQuery.data ?? []).filter((integration) => integration.type === 'api_out' && Boolean((integration.config as { is_api_key?: boolean }).is_api_key));
  const baseWebhookUrl = resolveApiBaseUrl().replace(/\/api\/v1$/, '');

  const updateConfigField = (key: string, value: unknown) => {
    const current = parseJson(configText) ?? {};
    if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
      delete current[key];
    } else {
      current[key] = value;
    }
    setConfigText(JSON.stringify(current, null, 2));
    setConfigValid(null);
  };

  const dataJudResult = dataJudMutation.data?.result ?? null;

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrações</h1>
          <p className="page-subtitle">Webhooks, conectores, API keys e DataJud no mesmo painel operacional.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr_340px]">
        <aside className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Integrações</h2>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)} variant="secondary">Nova</Button>
          </div>
          <div className="mb-4 flex gap-2">
            <button className={`pill-filter ${typeFilter === '' ? 'pill-filter-active' : ''}`} onClick={() => setTypeFilter('')} type="button">Todas</button>
            <button className={`pill-filter ${typeFilter === 'webhook_in' ? 'pill-filter-active' : ''}`} onClick={() => setTypeFilter('webhook_in')} type="button">Webhook</button>
            <button className={`pill-filter ${typeFilter === 'api_out' ? 'pill-filter-active' : ''}`} onClick={() => setTypeFilter('api_out')} type="button">API</button>
          </div>
          <div className="space-y-3">
            {integrationsQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />) : filteredIntegrations.map((integration) => <IntegrationCard key={integration.id} integration={integration} onClick={() => setSelectedId(integration.id)} selected={integration.id === selectedId} />)}
          </div>
        </aside>

        <section className="card p-6">
          {selectedIntegration ? (
            <>
              <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <input className="w-full bg-transparent text-2xl font-semibold text-text-primary focus:outline-none" onChange={(event) => setDraftName(event.target.value)} value={draftName} />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button className="switch" data-checked={draftStatus === 'ativa'} onClick={() => setDraftStatus((current) => current === 'ativa' ? 'inativa' : 'ativa')} type="button"><span className="switch-thumb" /></button>
                    <span className="text-sm text-text-secondary">{integrationStatusLabels[draftStatus]}</span>
                    <Badge statusValue={selectedIntegration.type}>{integrationTypeLabels[selectedIntegration.type]}</Badge>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button leftIcon={<Save className="h-4 w-4" />} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
                  <Button onClick={async () => { if (await confirm('A integração será desativada porque a API ainda não expõe exclusão. Deseja continuar?')) deactivateMutation.mutate(); }} variant="danger"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className={`pill-filter ${tab === 'config' ? 'pill-filter-active' : ''}`} onClick={() => setTab('config')} type="button">Configuração</button>
                {selectedIntegration.type === 'webhook_in' ? <button className={`pill-filter ${tab === 'webhook' ? 'pill-filter-active' : ''}`} onClick={() => setTab('webhook')} type="button">Webhook Tester</button> : null}
                <button className={`pill-filter ${tab === 'events' ? 'pill-filter-active' : ''}`} onClick={() => setTab('events')} type="button">Log de Eventos</button>
                <button className={`pill-filter ${tab === 'docs' ? 'pill-filter-active' : ''}`} onClick={() => setTab('docs')} type="button">Documentação</button>
              </div>

              {tab === 'config' ? (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="field-label">Provider</label>
                      <select className="select" onChange={(event) => updateConfigField('provider', event.target.value)} value={String(parsedConfig.provider ?? 'custom')}>
                        {KNOWN_INTEGRATION_PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Endpoint path</label>
                      <input className="input" onChange={(event) => updateConfigField('endpoint_path', event.target.value)} value={String(parsedConfig.endpoint_path ?? '')} />
                    </div>
                    <SensitiveField label="API key / token" reveal={revealSecrets.api_key || revealSecrets.token} value={String(parsedConfig.api_key ?? parsedConfig.token ?? '')} onReveal={() => setRevealSecrets((current) => ({ ...current, api_key: !(current.api_key || current.token) }))} onValueChange={(value) => updateConfigField(parsedConfig.api_key ? 'api_key' : 'token', value)} />
                    <SensitiveField label="Webhook secret" reveal={revealSecrets.webhook_secret} value={String(parsedConfig.webhook_secret ?? '')} onReveal={() => setRevealSecrets((current) => ({ ...current, webhook_secret: !current.webhook_secret }))} onValueChange={(value) => updateConfigField('webhook_secret', value)} />
                  </div>
                  <div>
                    <label className="field-label">Allowed IPs</label>
                    <textarea className="textarea" onChange={(event) => updateConfigField('allowed_ips', event.target.value.split('\n').filter(Boolean))} rows={4} value={Array.isArray(parsedConfig.allowed_ips) ? parsedConfig.allowed_ips.join('\n') : ''} />
                  </div>
                  <JsonEditor isValid={configValid} onChange={setConfigText} onValidate={() => setConfigValid(Boolean(parseJson(configText)))} value={configText} />
                </div>
              ) : null}

              {tab === 'webhook' && selectedIntegration.type === 'webhook_in' ? <div className="mt-6"><WebhookTester integrationName={selectedIntegration.name} /></div> : null}
              {tab === 'events' ? <div className="mt-6"><EventLog integrationId={selectedIntegration.id} /></div> : null}
              {tab === 'docs' ? (
                <div className="mt-6 space-y-4">
                  {selectedIntegration.type === 'webhook_in' ? (
                    <div className="card-elevated p-5">
                      <p className="text-sm text-text-secondary">URL do webhook</p>
                      <p className="mt-2 font-mono text-sm text-text-primary">{baseWebhookUrl}/webhooks/{selectedIntegration.name}</p>
                      <pre className="mt-4 rounded-button border border-border bg-surface p-4 text-xs text-text-secondary">{'{\n  "event": "client.updated",\n  "payload": { "id": "uuid" }\n}'}</pre>
                    </div>
                  ) : (
                    <div className="card-elevated p-5">
                      <p className="text-sm text-text-secondary">Consulta DataJud</p>
                      <p className="mt-2 text-sm text-text-primary">Use um número CNJ válido e informe o tribunal no campo endpoint_path quando necessário.</p>
                      <pre className="mt-4 rounded-button border border-border bg-surface p-4 text-xs text-text-secondary">{'{\n  "numero_cnj": "0000000-00.0000.0.00.0000",\n  "endpoint_path": "api_publica_tjac/_search"\n}'}</pre>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : <EmptyState description="Selecione uma integração na lista lateral ou crie uma nova configuração." icon={<Webhook className="h-5 w-5" />} title="Nenhuma integração selecionada" />}
        </section>

        <aside className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">API Keys</h2>
            <Button leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => generateApiKeyMutation.mutate()} variant="secondary">Gerar</Button>
          </div>
          <button className="mt-3 text-sm text-text-secondary" onClick={() => setApiKeysOpen((current) => !current)} type="button">{apiKeysOpen ? 'Ocultar painel' : 'Mostrar painel'}</button>
          {apiKeysOpen ? (
            <div className="mt-4 space-y-3">
              {apiKeyIntegrations.length > 0 ? apiKeyIntegrations.map((integration) => (
                <div key={integration.id} className="rounded-card border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{integration.name}</p>
                      <p className="text-xs text-text-tertiary">{maskSecret(String((integration.config as { api_key?: string }).api_key ?? ''))}</p>
                    </div>
                    <button className="switch" data-checked={integration.status === 'ativa'} onClick={() => updateApiKeyMutation.mutate({ id: integration.id, status: integration.status === 'ativa' ? 'inativa' : 'ativa' })} type="button"><span className="switch-thumb" /></button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge statusValue={integration.status}>{integrationStatusLabels[integration.status]}</Badge>
                    <Button onClick={async () => { if (await confirm('Deseja revogar esta API key?')) updateApiKeyMutation.mutate({ id: integration.id, status: 'inativa' }); }} variant="danger">Revogar</Button>
                  </div>
                </div>
              )) : <EmptyState description="Gere chaves da empresa usando integrações `api_out` com `config.is_api_key`." icon={<Shield className="h-5 w-5" />} title="Nenhuma API key cadastrada" />}
            </div>
          ) : null}
        </aside>
      </div>

      <section className="card p-6">
        <div className="mb-5 flex items-center gap-3"><DatabaseZap className="h-5 w-5 text-accent-text" /><div><h2 className="section-title !mb-0">DataJud</h2><p className="text-sm text-text-secondary">Consulta formatada por número CNJ com histórico de sessão.</p></div></div>
        <div className="grid gap-4 md:grid-cols-[1fr_20rem_auto]">
          <input className="input" onChange={(event) => setDataJudForm((current) => ({ ...current, numero_cnj: event.target.value }))} placeholder="0000000-00.0000.0.00.0000" value={dataJudForm.numero_cnj} />
          <SearchableSelect onChange={(value) => setDataJudForm((current) => ({ ...current, endpoint_path: value }))} options={DATAJUD_TRIBUNALS} value={dataJudForm.endpoint_path} />
          <Button onClick={() => dataJudMutation.mutate()}>{dataJudMutation.isPending ? 'Consultando...' : 'Buscar'}</Button>
        </div>
        {dataJudResult ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="grid gap-4 md:grid-cols-2">
              <DataJudResultCard label="Número do processo" value={String((dataJudResult as Record<string, unknown>).numeroProcesso ?? (dataJudResult as Record<string, unknown>).numero_processo ?? dataJudForm.numero_cnj)} />
              <DataJudResultCard
                label="Tribunal"
                value={String(((dataJudResult as Record<string, unknown>).tribunal ?? dataJudForm.endpoint_path) || '-')}
              />
              <DataJudResultCard label="Assunto" value={String((dataJudResult as Record<string, unknown>).assunto ?? (dataJudResult as Record<string, unknown>).classe ?? '-')} />
              <DataJudResultCard label="Última movimentação" value={String((dataJudResult as Record<string, unknown>).ultima_movimentacao ?? (dataJudResult as Record<string, unknown>).dataHoraUltimaAtualizacao ?? '-')} />
            </div>
            <div className="card-elevated overflow-auto p-4">
              <p className="text-sm font-semibold text-text-primary">Raw JSON</p>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-text-secondary" dangerouslySetInnerHTML={{ __html: formatJsonWithHighlight(dataJudResult) }} />
            </div>
          </div>
        ) : null}
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Histórico desta sessão</h3>
          <div className="mt-3 space-y-3">
            {dataJudHistory.length > 0 ? dataJudHistory.map((entry) => (
              <div key={entry.createdAt} className="rounded-button border border-border px-4 py-4">
                <div className="flex items-center justify-between gap-3"><p className="font-medium text-text-primary">{entry.cnj}</p><span className="text-xs text-text-tertiary">{formatDateTimeBR(entry.createdAt)}</span></div>
                <p className="mt-1 text-sm text-text-secondary">{String(entry.result.assunto ?? entry.result.classe ?? 'Consulta registrada')}</p>
              </div>
            )) : <EmptyState description="As últimas 10 consultas DataJud desta sessão ficam registradas aqui." icon={<DatabaseZap className="h-5 w-5" />} title="Sem histórico ainda" />}
          </div>
        </div>
      </section>

      <Modal description="Crie uma nova integração base e depois refine nos painéis centrais." onClose={() => setCreateOpen(false)} open={createOpen} size="lg" title="Nova integração">
        <IntegrationForm onCancel={() => setCreateOpen(false)} onSuccess={(integration) => { setCreateOpen(false); setSelectedId(integration.id); }} />
      </Modal>
    </div>
  );
}

function SensitiveField({
  label,
  onReveal,
  onValueChange,
  reveal,
  value,
}: {
  label: string;
  onReveal: () => void;
  onValueChange: (value: string) => void;
  reveal: boolean;
  value: string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input className="input pr-10" onChange={(event) => onValueChange(event.target.value)} type={reveal ? 'text' : 'password'} value={value} />
        <button className="absolute right-3 top-2.5 text-text-secondary" onClick={onReveal} type="button">{reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
    </div>
  );
}

function DataJudResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-elevated p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-2 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
