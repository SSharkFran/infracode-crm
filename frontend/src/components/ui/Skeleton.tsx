import { cn } from '../../lib/utils';

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock key={index} className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="mt-4 h-8 w-40" />
      <SkeletonBlock className="mt-6 h-24 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-4 gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-3 w-full" />)}
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((__, cellIndex) => <SkeletonBlock key={cellIndex} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonKanban() {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, columnIndex) => (
        <div key={columnIndex} className="card p-4">
          <SkeletonBlock className="h-5 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((__, cardIndex) => (
              <div key={cardIndex} className="rounded-card border border-border p-4">
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="mt-3 h-3 w-full" />
                <SkeletonBlock className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
