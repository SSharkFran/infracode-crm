export type ClientType = 'recorrente' | 'pontual' | 'lead' | 'parceiro';
export type ClientStatus = 'ativo' | 'negociacao' | 'encerrado' | 'inadimplente';
export type ProjectStatus = 'planejamento' | 'andamento' | 'entregue' | 'cancelado';
export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'pendente' | 'andamento' | 'concluida';
export type TransactionType = 'receita' | 'despesa';
export type TransactionStatus = 'pendente' | 'pago' | 'vencido';
export type IntegrationType = 'webhook_in' | 'api_out';
export type IntegrationStatus = 'ativa' | 'inativa' | 'erro';
export type IntegrationEventDirection = 'in' | 'out';
export type IntegrationEventStatus = 'ok' | 'erro';

export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  filename: string;
  storage_key: string;
  uploaded_at: string;
  download_url?: string | null;
}

export interface ClientInteraction {
  id: string;
  client_id: string;
  type: string;
  summary: string;
  happened_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: ClientType;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
}

export interface ClientDetail extends Client {
  interactions: ClientInteraction[];
  attachments: Attachment[];
}

export interface Project {
  id: string;
  client_id: string;
  client_name?: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  value: string | null;
  started_at: string | null;
  deadline: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  client_id: string | null;
  project_name?: string | null;
  client_name?: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  project_id: string | null;
  client_id: string | null;
  project_name?: string | null;
  client_name?: string | null;
  type: TransactionType;
  description: string;
  amount: string;
  due_date: string;
  paid_at: string | null;
  status: TransactionStatus;
  created_at: string;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
  transactions: Transaction[];
  attachments: Attachment[];
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  last_event_at: string | null;
}

export interface IntegrationEvent {
  id: string;
  integration_id: string;
  client_id: string | null;
  direction: IntegrationEventDirection;
  payload: Record<string, unknown>;
  status: IntegrationEventStatus;
  created_at: string;
}

export interface IntegrationEventPage {
  items: IntegrationEvent[];
  page: number;
  page_size: number;
  total: number;
}

export interface RevenueByClientItem {
  client_id: string | null;
  client_name: string;
  total_received: string;
}

export interface RevenueByMonthItem {
  month: string;
  total_received: string;
}

export interface ReceivablesStatusGroup {
  status: TransactionStatus;
  total_amount: string;
  count: number;
  transactions: Transaction[];
}

export interface ReceivablesReport {
  groups: ReceivablesStatusGroup[];
  grand_total: string;
}

export interface ProfitByProjectItem {
  project_id: string;
  project_name: string;
  total_receita: string;
  total_despesa: string;
  lucro: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface DataJudQueryResponse {
  integration_id: string;
  queried_at: string;
  result: Record<string, unknown>;
}
