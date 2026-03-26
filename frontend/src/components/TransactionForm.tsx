import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import type { Client, Project, Transaction, TransactionType } from '../types';

interface TransactionFormProps {
  clients: Client[];
  projects: Project[];
  defaultType?: TransactionType;
  defaultClientId?: string;
  defaultProjectId?: string;
  onSuccess?: (transaction: Transaction) => void;
  onCancel?: () => void;
}

export default function TransactionForm({
  clients,
  projects,
  defaultType = 'receita',
  defaultClientId = '',
  defaultProjectId = '',
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: defaultType,
    description: '',
    amount: '',
    due_date: '',
    client_id: defaultClientId,
    project_id: defaultProjectId,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === form.project_id),
    [form.project_id, projects],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.description.trim()) {
        throw new Error('Descrição é obrigatória.');
      }
      if (!form.amount || Number(form.amount) <= 0) {
        throw new Error('Informe um valor maior que zero.');
      }
      if (!form.due_date) {
        throw new Error('Informe a data de vencimento.');
      }

      const response = await api.post<Transaction>('/transactions', {
        ...form,
        amount: Number(form.amount),
        client_id: form.client_id || selectedProject?.client_id || null,
        project_id: form.project_id || null,
      });
      return response.data;
    },
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      setForm({
        type: defaultType,
        description: '',
        amount: '',
        due_date: '',
        client_id: defaultClientId,
        project_id: defaultProjectId,
      });
      setValidationError(null);
      onSuccess?.(transaction);
    },
    onError: (error) => {
      setValidationError(getErrorMessage(error));
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setValidationError(null);
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Tipo</label>
          <select
            className="select-base"
            value={form.type}
            onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as TransactionType }))}
          >
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>
        <div>
          <label className="field-label">Valor</label>
          <input
            className="input-base"
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder="0,00"
            step="0.01"
            type="number"
            value={form.amount}
          />
        </div>
      </div>

      <div>
        <label className="field-label">Descrição</label>
        <input
          className="input-base"
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Ex.: parcela de projeto"
          value={form.description}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Cliente</label>
          <select
            className="select-base"
            value={form.client_id}
            onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value }))}
          >
            <option value="">Sem cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Projeto</label>
          <select
            className="select-base"
            value={form.project_id}
            onChange={(event) => {
              const value = event.target.value;
              const project = projects.find((item) => item.id === value);
              setForm((current) => ({
                ...current,
                project_id: value,
                client_id: project?.client_id || current.client_id,
              }));
            }}
          >
            <option value="">Sem projeto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label">Vencimento</label>
        <input
          className="input-base"
          onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
          type="date"
          value={form.due_date}
        />
      </div>

      {validationError ? <p className="text-sm text-rose-300">{validationError}</p> : null}

      <div className="flex justify-end gap-3">
        {onCancel ? (
          <button className="button-secondary" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <button className="button-primary" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Salvando...' : 'Salvar lançamento'}
        </button>
      </div>
    </form>
  );
}
