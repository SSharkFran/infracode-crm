import { type ClassValue, clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AxiosError } from 'axios';
import { twMerge } from 'tailwind-merge';

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
    return format(parseISO(value), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return value;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg ?? String(item)).join(', ');
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Erro inesperado.';
}

export function jsonPreview(value: unknown, maxLength = 240) {
  const serialized = JSON.stringify(value, null, 2);
  if (serialized.length <= maxLength) return serialized;
  return `${serialized.slice(0, maxLength)}...`;
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

export function badgeTone(value: string) {
  if (['ativo', 'entregue', 'concluida', 'pago', 'ativa', 'ok'].includes(value)) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  }
  if (['andamento', 'negociacao', 'pendente', 'planejamento', 'webhook_in', 'api_out'].includes(value)) {
    return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300';
  }
  if (['vencido', 'inadimplente', 'urgente', 'erro', 'cancelado'].includes(value)) {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  }
  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
