import type { ReactNode } from 'react';

import { badgeTone, cn } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';
  className?: string;
  dot?: boolean;
  statusValue?: string;
}

const toneMap = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  accent: 'badge-accent',
  neutral: 'badge-neutral',
} as const;

export function Badge({ children, className, dot = false, statusValue, tone = 'neutral' }: BadgeProps) {
  return (
    <span className={cn(statusValue ? badgeTone(statusValue) : toneMap[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
