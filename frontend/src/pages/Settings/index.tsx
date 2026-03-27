import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, Clock3, LifeBuoy, Palette, ShieldCheck, Webhook } from 'lucide-react';
import { useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

import api, { getAuthToken, setAuthToken } from '../../lib/api';
import { APP_SETTINGS_KEY, APP_VERSION, COMPANY_SETTINGS_KEY, DEFAULT_APP_SETTINGS, DEFAULT_COMPANY_SETTINGS, TIMEZONE_OPTIONS } from '../../lib/constants';
import { decodeJwt, formatDateTimeBR, getErrorMessage, integrationStatusLabels, isTokenExpired, tokenExpiresAt } from '../../lib/utils';
import type { CompanySettings, Integration, TokenResponse } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useToast } from '../../hooks/useToast';

const tabs = ['company', 'access', 'appearance', 'webhooks', 'about'] as const;
type SettingsTab = (typeof tabs)[number];

export default function SettingsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<SettingsTab>('company');
  const [companySettings, setCompanySettings] = useLocalStorage<CompanySettings>(COMPANY_SETTINGS_KEY, DEFAULT_COMPANY_SETTINGS);
  const [appSettings, setAppSettings] = useLocalStorage(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const token = getAuthToken();
  const payload = useMemo(() => {
    if (!token) return null;
    try {
      return decodeJwt(token);
    } catch {
      return null;
    }
  }, [token]);

  const integrationsQuery = useQuery({
    queryKey: ['settings', 'integrations'],
    queryFn: async () => (await api.get<Integration[]>('/integrations')).data,
  });
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get<{ status: string }>('/health')).data,
  });

  const renewMutation = useMutation({
    mutationFn: async () => {
      if (!payload?.sub || !passwords.currentPassword) {
        throw new Error('Informe a senha atual para renovar a sessão.');
      }
      return (await api.post<TokenResponse>('/auth/login', { email: payload.sub, password: passwords.currentPassword })).data;
    },
    onSuccess: (response) => {
      setAuthToken(response.access_token);
      toast.success('Sessão renovada com sucesso.');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!payload?.sub || !passwords.currentPassword || !passwords.newPassword) {
        throw new Error('Preencha senha atual e nova senha.');
      }
      await api.post('/auth/login', { email: payload.sub, password: passwords.currentPassword });
    },
    onSuccess: () => toast.warning('Contate o administrador para trocar a senha: a API ainda não expõe esse endpoint.'),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const webhookIntegrations = useMemo(() => (integrationsQuery.data ?? []).filter((integration) => integration.type === 'webhook_in'), [integrationsQuery.data]);

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCompanySettings({ ...companySettings, logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configurações locais da operação, aparência e acesso.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[240px_1fr]">
        <aside className="card p-4">
          {tabs.map((item) => (
            <button key={item} className={`mb-2 flex w-full items-center gap-3 rounded-button px-3 py-3 text-left text-sm ${tab === item ? 'bg-accent-subtle text-text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`} onClick={() => setTab(item)} type="button">
              {item === 'company' ? <Building2 className="h-4 w-4" /> : item === 'access' ? <ShieldCheck className="h-4 w-4" /> : item === 'appearance' ? <Palette className="h-4 w-4" /> : item === 'webhooks' ? <Webhook className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}
              {item === 'company' ? 'Empresa' : item === 'access' ? 'Perfil / Acesso' : item === 'appearance' ? 'Aparência' : item === 'webhooks' ? 'Webhooks globais' : 'Sobre'}
            </button>
          ))}
        </aside>

        <section className="card p-6">
          {tab === 'company' ? (
            <div className="space-y-4">
              <div>
                <label className="field-label">Nome da empresa</label>
                <input className="input" onChange={(event) => setCompanySettings({ ...companySettings, name: event.target.value })} value={companySettings.name} />
              </div>
              <div>
                <label className="field-label">Email de suporte</label>
                <input className="input" onChange={(event) => setCompanySettings({ ...companySettings, email: event.target.value })} value={companySettings.email} />
              </div>
              <div>
                <label className="field-label">Fuso horário</label>
                <select className="select" onChange={(event) => setCompanySettings({ ...companySettings, timezone: event.target.value })} value={companySettings.timezone}>
                  {TIMEZONE_OPTIONS.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Logo</label>
                <input className="input" onChange={handleLogoChange} type="file" />
                {companySettings.logo ? <img alt="Logo da empresa" className="mt-4 h-16 rounded-button border border-border object-cover" src={companySettings.logo} /> : null}
              </div>
            </div>
          ) : null}

          {tab === 'access' ? (
            <div className="space-y-6">
              <div className="rounded-card border border-border bg-elevated/60 p-4">
                <p className="text-sm text-text-secondary">Email do administrador</p>
                <p className="mt-2 font-medium text-text-primary">{payload?.sub || 'Sessão não encontrada'}</p>
                <p className="mt-2 text-sm text-text-secondary">Token expira em {token ? formatDateTimeBR(tokenExpiresAt(token).toISOString()) : '-'}</p>
                <p className="mt-1 text-sm text-text-secondary">Status atual {token ? (isTokenExpired(token) ? 'expirado' : 'ativo') : 'desconhecido'}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Senha atual</label>
                  <input className="input" onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} type="password" value={passwords.currentPassword} />
                </div>
                <div>
                  <label className="field-label">Nova senha</label>
                  <input className="input" onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} type="password" value={passwords.newPassword} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => changePasswordMutation.mutate()} variant="secondary">Alterar senha</Button>
                <Button onClick={() => renewMutation.mutate()}>Renovar sessão</Button>
              </div>
            </div>
          ) : null}

          {tab === 'appearance' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button className="switch" data-checked={appSettings.compactMode} onClick={() => setAppSettings({ compactMode: !appSettings.compactMode })} type="button"><span className="switch-thumb" /></button>
                <div>
                  <p className="font-medium text-text-primary">Modo compacto</p>
                  <p className="text-sm text-text-secondary">Reduz espaçamentos internos dos cards e listas.</p>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'webhooks' ? (
            <div className="space-y-4">
              {webhookIntegrations.length > 0 ? webhookIntegrations.map((integration) => (
                <div key={integration.id} className="rounded-card border border-border px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{integration.name}</p>
                      <p className="text-sm text-text-secondary">{resolveWebhookUrl(integration.name)}</p>
                    </div>
                    <Badge statusValue={integration.status}>{integrationStatusLabels[integration.status]}</Badge>
                  </div>
                </div>
              )) : <EmptyState description="As integrações do tipo `webhook_in` aparecerão automaticamente aqui." icon={<Webhook className="h-5 w-5" />} title="Nenhum webhook global" />}
              <Link className="btn-secondary inline-flex" to="/integrations">Abrir Integrações</Link>
            </div>
          ) : null}

          {tab === 'about' ? (
            <div className="space-y-4">
              <div className="rounded-card border border-border bg-elevated/60 p-4">
                <p className="text-sm text-text-secondary">Versão do app</p>
                <p className="mt-2 font-medium text-text-primary">{APP_VERSION}</p>
              </div>
              <div className="rounded-card border border-border bg-elevated/60 p-4">
                <p className="text-sm text-text-secondary">Documentação</p>
                <p className="mt-2 text-sm text-text-primary">Links internos podem ser adicionados aqui quando a base documental estiver publicada.</p>
              </div>
              <div className="rounded-card border border-border bg-elevated/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Status da API</p>
                    <p className="mt-2 font-medium text-text-primary">{healthQuery.data?.status || 'verificando'}</p>
                  </div>
                  <Badge tone={healthQuery.data?.status === 'ok' ? 'success' : 'warning'}>{healthQuery.data?.status || '...'}</Badge>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function resolveWebhookUrl(name: string) {
  const baseUrl = api.defaults.baseURL?.replace(/\/api\/v1$/, '') ?? '';
  return `${baseUrl}/webhooks/${name}`;
}
