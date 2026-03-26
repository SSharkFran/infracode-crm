import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ClientCard from '../components/ClientCard';
import api from '../lib/api';
import { clientStatusLabels, clientTypeLabels, getErrorMessage } from '../lib/utils';
import type { Client, ClientStatus, ClientType } from '../types';

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  type: 'recorrente' as ClientType,
  status: 'ativo' as ClientStatus,
  notes: '',
};

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', type: '', status: '' });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const response = await api.get<Client[]>('/clients', {
        params: {
          search: filters.search || undefined,
          type: filters.type || undefined,
          status: filters.status || undefined,
        },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) {
        throw new Error('Nome é obrigatório.');
      }
      const response = await api.post<Client>('/clients', {
        ...form,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setForm(defaultForm);
      setValidationError(null);
      setOpen(false);
    },
    onError: (error) => {
      setValidationError(getErrorMessage(error));
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-app-accent">Clientes</p>
          <h1 className="mt-2 text-4xl font-extrabold text-white">Carteira e prospecção</h1>
          <p className="mt-2 text-zinc-400">Busque, filtre e abra novos cadastros com contexto comercial completo.</p>
        </div>
        <button className="button-primary gap-2" onClick={() => setOpen(true)} type="button">
          <Plus className="h-4 w-4" />
          Novo cliente
        </button>
      </div>

      <div className="panel p-5">
        <div className="grid gap-4 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
            <input
              className="input-base pl-11"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Buscar por nome ou e-mail"
              value={filters.search}
            />
          </div>
          <select
            className="select-base"
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            value={filters.type}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(clientTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="select-base"
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            value={filters.status}
          >
            <option value="">Todos os status</option>
            {Object.entries(clientStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {clientsQuery.isLoading ? <div className="panel p-6 text-zinc-400">Carregando clientes...</div> : null}
      {clientsQuery.error ? <div className="panel p-6 text-rose-300">{getErrorMessage(clientsQuery.error)}</div> : null}

      {clientsQuery.data && clientsQuery.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {clientsQuery.data.map((client) => (
            <ClientCard key={client.id} client={client} onClick={() => navigate(`/clients/${client.id}`)} />
          ))}
        </div>
      ) : null}

      {clientsQuery.data && clientsQuery.data.length === 0 ? (
        <div className="panel p-8 text-center text-zinc-400">Nenhum cliente encontrado para os filtros atuais.</div>
      ) : null}

      {open ? (
        <div className="dialog-overlay no-print">
          <div className="dialog-panel">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Novo cliente</h2>
                <p className="text-sm text-zinc-400">Cadastre um contato recorrente, pontual ou lead.</p>
              </div>
              <button className="button-secondary !px-3" onClick={() => setOpen(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setValidationError(null);
                createMutation.mutate();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Nome</label>
                  <input className="input-base" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">E-mail</label>
                  <input className="input-base" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="field-label">Telefone</label>
                  <input className="input-base" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Tipo</label>
                  <select className="select-base" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ClientType }))}>
                    {Object.entries(clientTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="select-base" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ClientStatus }))}>
                    {Object.entries(clientStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Observações</label>
                <textarea className="textarea-base" rows={5} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>

              {validationError ? <p className="text-sm text-rose-300">{validationError}</p> : null}

              <div className="flex justify-end gap-3">
                <button className="button-secondary" onClick={() => setOpen(false)} type="button">Cancelar</button>
                <button className="button-primary" disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? 'Salvando...' : 'Criar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
