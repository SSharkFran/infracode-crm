import type { AppSettings, ClientStatus, ClientType, CompanySettings, IntegrationStatus, IntegrationType, ProjectStatus, TaskPriority, TaskStatus, TransactionStatus } from '../types';

export const APP_VERSION = '0.2.0';
export const AUTH_TOKEN_KEY = 'infracode_token';
export const COMPANY_SETTINGS_KEY = 'infracode_company_settings';
export const APP_SETTINGS_KEY = 'infracode_app_settings';
export const PROJECTS_VIEW_STORAGE_KEY = 'infracode_projects_view';
export const QUERY_STALE_TIME = 1000 * 60 * 2;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_VISIBLE_TOASTS = 4;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'InfraCode CRM',
  email: 'suporte@infracode.com',
  timezone: 'America/Sao_Paulo',
  logo: null,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  compactMode: false,
};

export const TIMEZONE_OPTIONS = [
  'America/Rio_Branco',
  'America/Manaus',
  'America/Sao_Paulo',
  'America/Fortaleza',
  'UTC',
];

export const DATAJUD_TRIBUNALS = [
  { label: 'Todos os tribunais', value: '' },
  { label: 'STF', value: 'api_publica_stf/_search' },
  { label: 'STJ', value: 'api_publica_stj/_search' },
  { label: 'TST', value: 'api_publica_tst/_search' },
  { label: 'TRF1', value: 'api_publica_trf1/_search' },
  { label: 'TRF2', value: 'api_publica_trf2/_search' },
  { label: 'TRF3', value: 'api_publica_trf3/_search' },
  { label: 'TRF4', value: 'api_publica_trf4/_search' },
  { label: 'TRF5', value: 'api_publica_trf5/_search' },
  { label: 'TJAC', value: 'api_publica_tjac/_search' },
  { label: 'TJSP', value: 'api_publica_tjsp/_search' },
  { label: 'TJRJ', value: 'api_publica_tjrj/_search' },
];

export const KNOWN_INTEGRATION_PROVIDERS = ['whatsapp', 'telegram', 'discord', 'slack', 'custom'] as const;

export const CLIENT_TYPE_VALUES: ClientType[] = ['recorrente', 'pontual', 'lead', 'parceiro'];
export const CLIENT_STATUS_VALUES: ClientStatus[] = ['ativo', 'negociacao', 'encerrado', 'inadimplente'];
export const PROJECT_STATUS_VALUES: ProjectStatus[] = ['planejamento', 'andamento', 'entregue', 'cancelado'];
export const TASK_STATUS_VALUES: TaskStatus[] = ['pendente', 'andamento', 'concluida'];
export const TASK_PRIORITY_VALUES: TaskPriority[] = ['baixa', 'media', 'alta', 'urgente'];
export const TRANSACTION_STATUS_VALUES: TransactionStatus[] = ['pendente', 'pago', 'vencido'];
export const INTEGRATION_TYPE_VALUES: IntegrationType[] = ['webhook_in', 'api_out'];
export const INTEGRATION_STATUS_VALUES: IntegrationStatus[] = ['ativa', 'inativa', 'erro'];
