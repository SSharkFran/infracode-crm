import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

import type { ToastItem } from '../../types';
import { cn } from '../../lib/utils';

interface ToastProps {
  item: ToastItem;
  onClose: (id: string) => void;
}

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const toneMap = {
  success: 'border-success/20 bg-success-subtle text-success-text',
  error: 'border-danger/20 bg-danger-subtle text-danger-text',
  warning: 'border-warning/20 bg-warning-subtle text-warning-text',
  info: 'border-info/20 bg-info-subtle text-info-text',
} as const;

export function Toast({ item, onClose }: ToastProps) {
  const Icon = iconMap[item.type];

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm animate-toast-in rounded-card border px-4 py-3 shadow-lg backdrop-blur',
        toneMap[item.type],
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1 text-sm leading-6">{item.message}</p>
        <button className="rounded-full p-1 text-current/80 transition hover:bg-white/10 hover:text-current" onClick={() => onClose(item.id)} type="button">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
