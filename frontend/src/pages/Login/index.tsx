import { useMutation } from '@tanstack/react-query';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import api, { clearAuthToken, getAuthToken, setAuthToken } from '../../lib/api';
import { getErrorMessage, isTokenExpired } from '../../lib/utils';
import type { TokenResponse } from '../../types';
import { Button } from '../../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.email.trim() || !form.password.trim()) {
        throw new Error('Informe e-mail e senha.');
      }
      return (await api.post<TokenResponse>('/auth/login', form)).data;
    },
    onSuccess: (response) => {
      setAuthToken(response.access_token);
      navigate('/');
    },
  });

  const token = getAuthToken();
  if (token && isTokenExpired(token)) {
    clearAuthToken();
  }

  if (getAuthToken()) {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="card-elevated w-full max-w-md p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent-text">InfraCode</p>
        <h1 className="mt-3 text-3xl font-semibold text-text-primary">CRM</h1>
        <p className="mt-2 text-sm text-text-secondary">Acesse o ambiente interno com um layout revisado para operação enterprise.</p>
        <form className="mt-8 space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); mutation.mutate(); }}>
          <div>
            <label className="field-label">E-mail</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
              <input className="input pl-10" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="voce@empresa.com" type="email" value={form.email} />
            </div>
          </div>
          <div>
            <label className="field-label">Senha</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
              <input className="input pl-10" onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="••••••••" type="password" value={form.password} />
            </div>
          </div>
          {mutation.error ? <p className="text-sm text-danger-text">{getErrorMessage(mutation.error)}</p> : null}
          <Button fullWidth rightIcon={<ArrowRight className="h-4 w-4" />} type="submit">{mutation.isPending ? 'Entrando...' : 'Entrar'}</Button>
        </form>
      </div>
    </div>
  );
}
