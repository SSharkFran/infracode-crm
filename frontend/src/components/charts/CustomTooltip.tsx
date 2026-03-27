import { formatCurrencyBRL } from '../../lib/utils';

interface TooltipPayloadItem {
  value?: number | string;
  name?: string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  currency?: boolean;
}

export function CustomTooltip({ active, currency = false, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-card border border-border bg-elevated px-3 py-2 shadow-md">
      {label ? <p className="text-xs uppercase tracking-wider text-text-tertiary">{label}</p> : null}
      <div className="mt-1 space-y-1">
        {payload.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? '#6366f1' }} />
            <span>{item.name}</span>
            <strong className="ml-auto text-text-primary">
              {currency ? formatCurrencyBRL(Number(item.value ?? 0)) : item.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
