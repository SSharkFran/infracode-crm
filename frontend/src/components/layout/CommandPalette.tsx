import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import type { Client, Integration, Project, Task } from '../../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function CommandPalette({ onClose, open }: CommandPaletteProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const items = useMemo<CommandItem[]>(() => {
    const clients = (queryClient.getQueriesData<Client[]>({ queryKey: ['clients'] }).flatMap(([, data]) => data ?? []));
    const projects = (queryClient.getQueriesData<Project[]>({ queryKey: ['projects'] }).flatMap(([, data]) => data ?? []));
    const tasks = (queryClient.getQueriesData<Task[]>({ queryKey: ['tasks'] }).flatMap(([, data]) => data ?? []));
    const integrations = (queryClient.getQueriesData<Integration[]>({ queryKey: ['integrations'] }).flatMap(([, data]) => data ?? []));

    return [
      ...clients.map((item) => ({ id: `client-${item.id}`, title: item.name, subtitle: 'Cliente', href: `/clients/${item.id}` })),
      ...projects.map((item) => ({ id: `project-${item.id}`, title: item.name, subtitle: 'Projeto', href: `/projects/${item.id}` })),
      ...tasks.map((item) => ({ id: `task-${item.id}`, title: item.title, subtitle: 'Tarefa', href: '/tasks' })),
      ...integrations.map((item) => ({ id: `integration-${item.id}`, title: item.name, subtitle: 'Integração', href: '/integrations' })),
    ];
  }, [queryClient]);

  const filteredItems = useMemo(
    () => items.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
    [items, query],
  );

  return (
    <Modal description="Busca rápida nos dados já carregados em cache." onClose={onClose} open={open} size="lg" title="Busca global">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
        <input autoFocus className="input pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, projeto, tarefa ou integração..." value={query} />
      </div>
      <div className="mt-4 space-y-2">
        {filteredItems.length > 0 ? filteredItems.map((item) => (
          <button
            key={item.id}
            className="card flex w-full items-center justify-between px-4 py-3 text-left transition hover:border-border-strong hover:bg-hover/40"
            onClick={() => {
              navigate(item.href);
              onClose();
            }}
            type="button"
          >
            <div>
              <p className="font-medium text-text-primary">{item.title}</p>
              <p className="text-sm text-text-secondary">{item.subtitle}</p>
            </div>
            <span className="text-xs uppercase tracking-wider text-text-tertiary">Abrir</span>
          </button>
        )) : <EmptyState description="A busca global usa os dados já carregados; navegue por algumas páginas e tente novamente." icon={<Search className="h-5 w-5" />} title="Nenhum resultado no cache" />}
      </div>
    </Modal>
  );
}
