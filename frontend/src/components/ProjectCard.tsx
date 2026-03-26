import type { Project } from '../types';
import { badgeTone, cn, formatCurrencyBRL, formatDateBR, projectStatusLabels } from '../lib/utils';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <button className="panel w-full p-5 text-left transition hover:-translate-y-1 hover:border-white/20" onClick={onClick} type="button">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-400">{project.client_name || 'Cliente não vinculado'}</p>
          <h3 className="mt-1 text-xl font-bold text-white">{project.name}</h3>
        </div>
        <span className={cn('badge-base', badgeTone(project.status))}>{projectStatusLabels[project.status]}</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-zinc-400">
        <p>Valor: <span className="font-semibold text-zinc-200">{formatCurrencyBRL(project.value)}</span></p>
        <p>Prazo: <span className="font-semibold text-zinc-200">{formatDateBR(project.deadline)}</span></p>
        <p className="line-clamp-2">{project.description || 'Sem descrição registrada.'}</p>
      </div>
    </button>
  );
}
