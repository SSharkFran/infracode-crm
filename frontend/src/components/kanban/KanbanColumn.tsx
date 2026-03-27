import { Plus } from 'lucide-react';
import type { DragEvent, ReactNode } from 'react';

import { Button } from '../ui/Button';

interface KanbanColumnProps {
  title: string;
  count: number;
  children: ReactNode;
  actions?: ReactNode;
  onAdd?: () => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
}

export function KanbanColumn({ actions, children, count, onAdd, onDragOver, onDrop, title }: KanbanColumnProps) {
  return (
    <section className="card min-h-[28rem] p-4" onDragOver={onDragOver} onDrop={onDrop}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary">{count} item(ns)</p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onAdd ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={onAdd} variant="ghost">Nova</Button> : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
