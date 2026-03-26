import type { Client } from '../types';
import { badgeTone, clientStatusLabels, clientTypeLabels, cn, initials } from '../lib/utils';

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

export default function ClientCard({ client, onClick }: ClientCardProps) {
  return (
    <button className="panel w-full p-5 text-left transition hover:-translate-y-1 hover:border-white/20" onClick={onClick} type="button">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-sm font-bold text-indigo-300">
            {initials(client.name)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{client.name}</h3>
            <p className="text-sm text-zinc-400">{client.email || 'Sem e-mail cadastrado'}</p>
          </div>
        </div>
        <div className="space-y-2 text-right">
          <span className={cn('badge-base', badgeTone(client.type))}>{clientTypeLabels[client.type]}</span>
          <div>
            <span className={cn('badge-base', badgeTone(client.status))}>{clientStatusLabels[client.status]}</span>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-2 text-sm text-zinc-400">
        <p>{client.phone || 'Telefone não informado'}</p>
        <p className="line-clamp-2">{client.notes || 'Sem observações registradas.'}</p>
      </div>
    </button>
  );
}
