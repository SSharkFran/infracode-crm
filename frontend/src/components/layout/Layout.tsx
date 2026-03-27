import { Menu, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS } from '../../lib/constants';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [appSettings] = useLocalStorage(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS);

  useEffect(() => {
    document.body.dataset.compact = String(appSettings.compactMode);
  }, [appSettings.compactMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-base">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 lg:hidden">
          <button className="btn-icon" onClick={() => setMobileOpen(true)} type="button">
            <Menu className="h-5 w-5" />
          </button>
          <button className="btn-secondary" onClick={() => setCommandOpen(true)} type="button">
            <Search className="h-4 w-4" />
            Buscar
          </button>
        </div>
        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">{<Outlet />}</main>
      </div>
      <CommandPalette onClose={() => setCommandOpen(false)} open={commandOpen} />
    </div>
  );
}
