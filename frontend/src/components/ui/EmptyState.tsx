import type { ReactNode } from 'react';

import { Button } from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <div className="card flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="rounded-full border border-border bg-elevated p-4 text-accent-text">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">{description}</p>
      {action ? <Button className="mt-5" onClick={action.onClick} variant="secondary">{action.label}</Button> : null}
    </div>
  );
}
