import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-app-bg bg-hero text-zinc-100">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-72">
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-app-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">InfraCode</p>
            <h1 className="text-lg font-bold text-white">CRM</h1>
          </div>
          <button className="button-secondary !px-3" onClick={() => setOpen(true)} type="button">
            <Menu className="h-5 w-5" />
          </button>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
