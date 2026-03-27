import type { DragEventHandler, ReactNode } from 'react';

import { cn } from '../../lib/utils';

interface KanbanCardProps {
  children: ReactNode;
  className?: string;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
}

export function KanbanCard({ children, className, draggable = false, onDragStart }: KanbanCardProps) {
  return (
    <div
      className={cn('rounded-card border border-border bg-elevated p-4 shadow-sm transition hover:border-border-strong hover:bg-hover/60', className)}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {children}
    </div>
  );
}
