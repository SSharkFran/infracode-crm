import { useMutation } from '@tanstack/react-query';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import Layout from './components/Layout';
import { AUTH_TOKEN_KEY } from './lib/api';
import api from './lib/api';
import { getErrorMessage } from './lib/utils';
import type { TokenResponse } from './types';
import ClientDetail from './pages/ClientDetail';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Integrations from './pages/Integrations';
import ProjectDetail from './pages/ProjectDetail';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Tasks from './pages/Tasks';

function hasToken() {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

function ProtectedLayout() {
  const location = useLocation();
  if (!hasToken()) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }
  return <Layout />;
}

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'fran@infracode.com', password: 'changeme' });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.email.trim() || !form.password.trim()) {
        throw new Error('Informe e-mail e senha.');
      }
      const response = await api.post<TokenResponse>('/auth/login', form);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      navigate('/');
    },
  });

  if (hasToken()) {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg bg-hero p-4">
      <div className="panel w-full max-w-md p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-app-accent">InfraCode</p>
        <h1 className="mt-3 text-3xl font-extrabold text-white">CRM</h1>
        <p className="mt-2 text-sm text-zinc-400">Acesse o ambiente operacional da equipe.</p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div>
            <label className="field-label">E-mail</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                className="input-base pl-11"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="fran@infracode.com"
                type="email"
                value={form.email}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Senha</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                className="input-base pl-11"
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="••••••••"
                type="password"
                value={form.password}
              />
            </div>
          </div>

          {mutation.error ? <p className="text-sm text-rose-300">{getErrorMessage(mutation.error)}</p> : null}

          <button className="button-primary mt-4 w-full gap-2" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Entrando...' : 'Entrar'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<ProtectedLayout />}>
        <Route element={<Dashboard />} path="/" />
        <Route element={<Clients />} path="/clients" />
        <Route element={<ClientDetail />} path="/clients/:clientId" />
        <Route element={<Projects />} path="/projects" />
        <Route element={<ProjectDetail />} path="/projects/:projectId" />
        <Route element={<Tasks />} path="/tasks" />
        <Route element={<Finance />} path="/finance" />
        <Route element={<Reports />} path="/reports" />
        <Route element={<Integrations />} path="/integrations" />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}
