import {
  BarChart3,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  PlugZap,
  Wallet,
  Users,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { AUTH_TOKEN_KEY } from '../lib/api';
import { cn } from '../lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const items = useMemo(
    () => [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/clients', label: 'Clientes', icon: Users },
      { to: '/projects', label: 'Projetos', icon: FolderKanban },
      { to: '/tasks', label: 'Tarefas', icon: KanbanSquare },
      { to: '/finance', label: 'Financeiro', icon: Wallet },
      { to: '/reports', label: 'Relatórios', icon: BarChart3 },
      { to: '/integrations', label: 'Integrações', icon: PlugZap },
    ],
    [],
  );

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    navigate('/login');
  };

  return (
    <>
      <div
        className={cn(
          'no-print fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#101010]/95 p-5 backdrop-blur transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-app-accent">InfraCode</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">CRM</h2>
            <p className="mt-1 text-sm text-zinc-400">Operação comercial e entrega</p>
          </div>
          <button className="button-secondary !px-3 lg:hidden" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    isActive ? 'bg-app-accent text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-300 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button className="button-secondary mt-6 gap-2" onClick={logout} type="button">
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>
    </>
  );
}
