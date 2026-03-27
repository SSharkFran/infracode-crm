import { type ClassValue, clsx } from 'clsx';
import { AxiosError } from 'axios';
import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

import type { ClientStatus, ClientType, IntegrationStatus, IntegrationType, JwtPayload, ProjectStatus, TaskPriority, TaskStatus, ToastType, TransactionStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyBRL(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateBR(value?: string | null) {
  if (!value) return '-';

  try {
    return format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return value;
  }
}

export function formatDateTimeBR(value?: string | null) {
  if (!value) return '-';

  try {
    return format(parseISO(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

export function formatRelativeTime(value?: string | null): string {
  if (!value) return 'Sem registro';

  try {
    return formatDistanceToNow(parseISO(value), {
      locale: ptBR,
      addSuffix: true,
    });
  } catch {
    return value;
  }
}

export function formatMonthYear(date: Date): string {
  const label = format(date, 'MMM yyyy', { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getDaysOverdue(dueDate: string): number {
  try {
    return differenceInCalendarDays(new Date(), parseISO(dueDate));
  } catch {
    return 0;
  }
}

export function sumAmount(items: Array<{ amount: string }>): number {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((accumulator, item) => {
    const groupKey = String(item[key]);
    accumulator[groupKey] = [...(accumulator[groupKey] ?? []), item];
    return accumulator;
  }, {});
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function hashColor(name: string): string {
  const hash = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  const hue = hash % 360;
  return `hsl(${hue} 70% 45%)`;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;

    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg ?? String(item)).join(', ');
    }

    return error.message;
  }

  if (error instanceof Error) return error.message;

  return 'Erro inesperado.';
}

export function extractValidationIssues(error: unknown): string[] {
  if (!(error instanceof AxiosError) || !Array.isArray(error.response?.data?.detail)) {
    return [];
  }

  return error.response.data.detail.map((item: { msg?: string }) => item.msg ?? 'Erro de validação.');
}

export function jsonPreview(value: unknown, maxLength = 240) {
  const serialized = JSON.stringify(value, null, 2) ?? String(value);
  if (serialized.length <= maxLength) return serialized;
  return `${serialized.slice(0, maxLength)}...`;
}

export function statusColor(status: string): string {
  if (['ativo', 'entregue', 'concluida', 'pago', 'ativa', 'ok'].includes(status)) {
    return 'text-success';
  }

  if (['negociacao', 'pendente', 'planejamento', 'warning', 'vencido'].includes(status)) {
    return 'text-warning';
  }

  if (['inadimplente', 'erro', 'cancelado', 'urgente', 'despesa'].includes(status)) {
    return 'text-danger';
  }

  if (['andamento', 'webhook_in', 'api_out', 'receita', 'info', 'in', 'out'].includes(status)) {
    return 'text-accent';
  }

  return 'text-text-secondary';
}

export function priorityBorderColor(priority: TaskPriority): string {
  if (priority === 'urgente') return 'border-danger';
  if (priority === 'alta') return 'border-warning';
  if (priority === 'media') return 'border-accent';
  return 'border-border';
}

export function statusToTone(status: string): ToastType | 'accent' {
  if (['ativo', 'entregue', 'concluida', 'pago', 'ativa', 'ok'].includes(status)) {
    return 'success';
  }

  if (['inadimplente', 'erro', 'cancelado', 'urgente'].includes(status)) {
    return 'error';
  }

  if (['vencido', 'pendente'].includes(status)) {
    return 'warning';
  }

  if (status === 'alta') {
    return 'warning';
  }

  if (status === 'media' || status === 'baixa') {
    return 'info';
  }

  if (['webhook_in', 'api_out', 'andamento', 'receita', 'in', 'out', 'negociacao', 'planejamento'].includes(status)) {
    return 'accent';
  }

  return 'info';
}

export function badgeTone(value: string) {
  const toneMap: Record<string, string> = {
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-danger',
    info: 'badge-info',
    accent: 'badge-accent',
  };

  const tone = statusToTone(value);
  return toneMap[tone] ?? 'badge-neutral';
}

export const clientTypeLabels: Record<string, string> = {
  recorrente: 'Recorrente',
  pontual: 'Pontual',
  lead: 'Lead',
  parceiro: 'Parceiro',
};

export const clientStatusLabels: Record<string, string> = {
  ativo: 'Ativo',
  negociacao: 'Negociação',
  encerrado: 'Encerrado',
  inadimplente: 'Inadimplente',
};

export const projectStatusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  andamento: 'Em andamento',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const taskStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  andamento: 'Em andamento',
  concluida: 'Concluída',
};

export const taskPriorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const transactionStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
};

export const integrationStatusLabels: Record<string, string> = {
  ativa: 'Ativa',
  inativa: 'Inativa',
  erro: 'Erro',
};

export const integrationTypeLabels: Record<string, string> = {
  webhook_in: 'Webhook',
  api_out: 'API externa',
};

export function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('Token inválido.');
  }

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const decoded = atob(padded);

  return JSON.parse(decoded) as JwtPayload;
}

export function isTokenExpired(token: string): boolean {
  return tokenExpiresAt(token).getTime() <= Date.now();
}

export function tokenExpiresAt(token: string): Date {
  const payload = decodeJwt(token);
  return new Date(payload.exp * 1000);
}

export function maskSecret(value: string, visible = 4) {
  if (!value) return '';
  if (value.length <= visible) return value;
  return `${value.slice(0, visible)}${'•'.repeat(Math.max(4, value.length - visible))}`;
}

export function formatJsonWithHighlight(value: unknown): string {
  const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? String(value);

  return json.replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?)/g,
    (match) => {
      if (match.endsWith(':')) {
        return `<span class="json-key">${match}</span>`;
      }
      if (match.startsWith('"')) {
        return `<span class="json-string">${match}</span>`;
      }
      if (match === 'true' || match === 'false') {
        return `<span class="json-boolean">${match}</span>`;
      }
      if (match === 'null') {
        return `<span class="json-null">${match}</span>`;
      }
      return `<span class="json-number">${match}</span>`;
    },
  );
}

export function isHtmlInputFocused() {
  const active = document.activeElement;
  if (!active) return false;

  const tag = active.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (active as HTMLElement).isContentEditable;
}
