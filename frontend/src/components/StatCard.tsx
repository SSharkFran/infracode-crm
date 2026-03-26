import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
}

export default function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <h3 className="mt-3 text-3xl font-extrabold text-white">{value}</h3>
          <p className="mt-2 text-sm text-zinc-500">{description}</p>
        </div>
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-300">{icon}</div>
      </div>
    </div>
  );
}
