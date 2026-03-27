import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';

import api from '../../lib/api';
import { CLIENT_STATUS_VALUES, CLIENT_TYPE_VALUES } from '../../lib/constants';
import { clientStatusLabels, clientTypeLabels, extractValidationIssues, getErrorMessage } from '../../lib/utils';
import type { Client, ClientStatus, ClientType } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';

interface ClientFormProps {
  client?: Client | null;
  onSuccess?: (client: Client) => void;
  onCancel?: () => void;
}

export function ClientForm({ client, onCancel, onSuccess }: ClientFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'recorrente' as ClientType,
    status: 'ativo' as ClientStatus,
    notes: '',
  });

  useEffect(() => {
    if (!client) return;
    setForm({
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      type: client.type,
      status: client.status,
      notes: client.notes ?? '',
    });
  }, [client]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nome é obrigatório.');

      const payload = {
        ...form,
        email: form.email || null,
        phone: form.phone || null,
        notes: form.notes || null,
      };

      const response = client
        ? await api.put<Client>(`/clients/${client.id}`, payload)
        : await api.post<Client>('/clients', payload);

      return response.data;
    },
    onSuccess: (savedClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      toast.success(client ? 'Cliente atualizado com sucesso.' : 'Cliente criado com sucesso.');
      setErrors([]);
      onSuccess?.(savedClient);
    },
    onError: (error) => {
      const validationErrors = extractValidationIssues(error);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
      setErrors([getErrorMessage(error)]);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors([]);
    mutation.mutate();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Nome</label>
          <input className="input" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
        </div>
        <div>
          <label className="field-label">E-mail</label>
          <input className="input" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" value={form.email} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="field-label">Telefone</label>
          <input className="input" onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone} />
        </div>
        <div>
          <label className="field-label">Tipo</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ClientType }))} value={form.type}>
            {CLIENT_TYPE_VALUES.map((value) => <option key={value} value={value}>{clientTypeLabels[value]}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ClientStatus }))} value={form.status}>
            {CLIENT_STATUS_VALUES.map((value) => <option key={value} value={value}>{clientStatusLabels[value]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label">Observações</label>
        <textarea className="textarea" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={5} value={form.notes} />
      </div>
      {errors.length > 0 ? <div className="space-y-1 text-sm text-danger-text">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="flex justify-end gap-3">
        {onCancel ? <Button onClick={onCancel} variant="secondary">Cancelar</Button> : null}
        <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Salvando...' : client ? 'Salvar cliente' : 'Criar cliente'}</Button>
      </div>
    </form>
  );
}
