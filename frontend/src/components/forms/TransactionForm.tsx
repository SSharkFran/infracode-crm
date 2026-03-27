import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import api from '../../lib/api';
import { extractValidationIssues, getErrorMessage } from '../../lib/utils';
import type { Client, Project, Transaction, TransactionStatus, TransactionType } from '../../types';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';

interface TransactionFormProps {
  clients: Client[];
  projects: Project[];
  transaction?: Transaction | null;
  defaultType?: TransactionType;
  defaultClientId?: string;
  defaultProjectId?: string;
  onSuccess?: (transaction: Transaction) => void;
  onCancel?: () => void;
}

export function TransactionForm({
  clients,
  defaultClientId = '',
  defaultProjectId = '',
  defaultType = 'receita',
  onCancel,
  onSuccess,
  projects,
  transaction,
}: TransactionFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    type: defaultType,
    description: '',
    amount: '',
    due_date: '',
    client_id: defaultClientId,
    project_id: defaultProjectId,
    status: 'pendente' as TransactionStatus,
  });

  useEffect(() => {
    if (!transaction) return;
    setForm({
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      due_date: transaction.due_date.slice(0, 10),
      client_id: transaction.client_id ?? '',
      project_id: transaction.project_id ?? '',
      status: transaction.status,
    });
  }, [transaction]);

  const selectedProject = useMemo(() => projects.find((project) => project.id === form.project_id), [form.project_id, projects]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.description.trim()) throw new Error('Descrição é obrigatória.');
      if (!form.amount || Number(form.amount) <= 0) throw new Error('Informe um valor maior que zero.');
      if (!form.due_date) throw new Error('Informe a data de vencimento.');
      const payload = {
        ...form,
        amount: Number(form.amount),
        client_id: form.client_id || selectedProject?.client_id || null,
        project_id: form.project_id || null,
      };
      return (await api.post<Transaction>('/transactions', payload)).data;
    },
    onSuccess: (savedTransaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      toast.success('Lançamento salvo com sucesso.');
      setErrors([]);
      onSuccess?.(savedTransaction);
    },
    onError: (error) => {
      const validationErrors = extractValidationIssues(error);
      setErrors(validationErrors.length > 0 ? validationErrors : [getErrorMessage(error)]);
    },
  });

  return (
    <form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setErrors([]); mutation.mutate(); }}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="field-label">Tipo</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as TransactionType }))} value={form.type}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>
        <div>
          <label className="field-label">Valor</label>
          <input className="input" min="0" onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} step="0.01" type="number" value={form.amount} />
        </div>
      </div>
      <div>
        <label className="field-label">Descrição</label>
        <input className="input" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="field-label">Cliente</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value }))} value={form.client_id}>
            <option value="">Sem cliente</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Projeto</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))} value={form.project_id}>
            <option value="">Sem projeto</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Vencimento</label>
          <input className="input" onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} type="date" value={form.due_date} />
        </div>
      </div>
      {errors.length > 0 ? <div className="space-y-1 text-sm text-danger-text">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="flex justify-end gap-3">
        {onCancel ? <Button onClick={onCancel} variant="secondary">Cancelar</Button> : null}
        <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Salvando...' : 'Salvar lançamento'}</Button>
      </div>
    </form>
  );
}
