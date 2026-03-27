import { useQuery } from '@tanstack/react-query';
import { BarChart3, CheckSquare, FolderKanban, LayoutDashboard, LogOut, Plug2, Settings, Users, Wallet } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

import api, { clearAuthToken, getAuthToken } from '../../lib/api';
import { DEFAULT_COMPANY_SETTINGS } from '../../lib/constants';
import { cn, decodeJwt } from '../../lib/utils';
import type { Integration, Task } from '../../types';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Avatar } from '../ui/Avatar';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
  { to: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { to: '/finance', label: 'Financeiro', icon: Wallet },
  { to: '/reports', label: 'Relatórios', icon: BarChart3 },
  { to: '/integrations', label: 'Integrações', icon: Plug2 },
];

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const [companySettings] = useLocalStorage('infracode_company_settings', DEFAULT_COMPANY_SETTINGS);
  const token = getAuthToken();
  const userEmail = (() => {
    if (!token) return 'admin@infracode.com';
    try {
      return decodeJwt(token).sub;
    } catch {
      return 'admin@infracode.com';
    }
  })();

  const todayTasksQuery = useQuery({
    queryKey: ['sidebar', 'tasks', 'today'],
    queryFn: async () => (await api.get<Task[]>('/tasks', { params: { status: 'pendente', due_today: true } })).data,
  });
  const integrationsQuery = useQuery({
    queryKey: ['sidebar', 'integrations'],
    queryFn: async () => (await api.get<Integration[]>('/integrations')).data,
  });

  const integrationTone = integrationsQuery.data?.some((item) => item.status === 'erro')
    ? 'bg-danger'
    : integrationsQuery.data?.some((item) => item.status === 'ativa')
      ? 'bg-success'
      : 'bg-warning';

  return (
    <>
      <div className={cn('fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden', mobileOpen ? 'block' : 'hidden')} onClick={onClose} role="presentation" />
      <aside className={cn('fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-base px-4 py-5 transition-transform lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent-text">InfraCode</p>
            <h1 className="text-lg font-semibold text-text-primary">{companySettings.name}</h1>
          </div>
          <Avatar name={userEmail} size="md" />
        </div>

        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-pill px-3 py-2.5 text-sm text-text-secondary transition hover:bg-hover hover:text-text-primary',
                    isActive && 'bg-accent-subtle text-text-primary',
                  )
                }
                end={item.end}
                onClick={onClose}
                to={item.to}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.to === '/tasks' ? (
                  <span className="badge-neutral min-w-7 justify-center">{todayTasksQuery.data?.length ?? 0}</span>
                ) : null}
                {item.to === '/integrations' ? <span className={cn('h-2.5 w-2.5 rounded-full', integrationTone)} /> : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-6 rounded-card border border-border bg-surface px-4 py-4">
          <p className="text-xs uppercase tracking-wider text-text-tertiary">Indicadores rápidos</p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-text-secondary">Pendentes hoje</span>
            <span className="font-semibold text-text-primary">{todayTasksQuery.data?.length ?? 0}</span>
          </div>
        </div>

        <div className="mt-auto space-y-1">
          <NavLink className={({ isActive }) => cn('flex items-center gap-3 rounded-pill px-3 py-2.5 text-sm text-text-secondary transition hover:bg-hover hover:text-text-primary', isActive && 'bg-accent-subtle text-text-primary')} onClick={onClose} to="/settings">
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          <button
            className="flex w-full items-center gap-3 rounded-pill px-3 py-2.5 text-sm text-text-secondary transition hover:bg-hover hover:text-text-primary"
            onClick={() => {
              clearAuthToken();
              navigate('/login');
            }}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
