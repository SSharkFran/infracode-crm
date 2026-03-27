import type { ReactNode } from 'react';

interface KanbanBoardProps {
  children: ReactNode;
}

export function KanbanBoard({ children }: KanbanBoardProps) {
  return <div className="grid gap-6 xl:grid-cols-3">{children}</div>;
}
