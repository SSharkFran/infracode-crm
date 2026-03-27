import { Badge } from '../ui/Badge';
import { cn, formatRelativeTime, integrationStatusLabels, integrationTypeLabels } from '../../lib/utils';
import type { Integration } from '../../types';

interface IntegrationCardProps {
  integration: Integration;
  selected?: boolean;
  onClick: () => void;
}

export function IntegrationCard({ integration, onClick, selected = false }: IntegrationCardProps) {
  return (
    <button
      className={cn(
        'card w-full p-4 text-left transition hover:border-border-strong',
        selected && 'border-accent/40 bg-accent-subtle/40',
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text-primary">{integration.name}</p>
          <p className="mt-1 text-sm text-text-secondary">{integrationTypeLabels[integration.type]}</p>
        </div>
        <Badge dot statusValue={integration.status}>{integrationStatusLabels[integration.status]}</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-text-tertiary">
        <span>{integrationTypeLabels[integration.type]}</span>
        <span>{formatRelativeTime(integration.last_event_at)}</span>
      </div>
    </button>
  );
}
