import type { DragEvent, ReactNode } from 'react';

import type { Task } from '../types';
import { badgeTone, cn, formatDateBR, taskPriorityLabels } from '../lib/utils';

interface TaskCardProps {
  task: Task;
  draggable?: boolean;
  onDragStart?: (task: Task, event: DragEvent<HTMLDivElement>) => void;
  footer?: ReactNode;
}

export default function TaskCard({ task, draggable, onDragStart, footer }: TaskCardProps) {
  return (
    <div
      className="panel-soft cursor-grab p-4 active:cursor-grabbing"
      draggable={draggable}
      onDragStart={(event) => onDragStart?.(task, event)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">{task.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{task.client_name || task.project_name || 'Sem vínculo definido'}</p>
        </div>
        <span className={cn('badge-base', badgeTone(task.priority))}>{taskPriorityLabels[task.priority]}</span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-zinc-400">{task.description || 'Sem descrição.'}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>{task.project_name || 'Sem projeto'}</span>
        <span>Prazo: {formatDateBR(task.due_date)}</span>
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
