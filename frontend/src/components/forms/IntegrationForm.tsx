import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';

import api from '../../lib/api';
import { INTEGRATION_STATUS_VALUES, INTEGRATION_TYPE_VALUES } from '../../lib/constants';
import { extractValidationIssues, getErrorMessage, integrationStatusLabels, integrationTypeLabels } from '../../lib/utils';
import type { Integration, IntegrationStatus, IntegrationType } from '../../types';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';

interface IntegrationFormProps {
  integration?: Integration | null;
  onSuccess?: (integration: Integration) => void;
  onCancel?: () => void;
}

export function IntegrationForm({ integration, onCancel, onSuccess }: IntegrationFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    type: 'webhook_in' as IntegrationType,
    status: 'ativa' as IntegrationStatus,
    configText: '{\n  "provider": "custom"\n}',
  });

  useEffect(() => {
    if (!integration) return;
    setForm({
      name: integration.name,
      type: integration.type,
      status: integration.status,
      configText: JSON.stringify(integration.config, null, 2),
    });
  }, [integration]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name.trim(), type: form.type, status: form.status, config: JSON.parse(form.configText) };
      if (!payload.name) throw new Error('Nome da integração é obrigatório.');
      const response = integration
        ? await api.put<Integration>(`/integrations/${integration.id}`, payload)
        : await api.post<Integration>('/integrations', payload);
      return response.data;
    },
    onSuccess: (savedIntegration) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success(integration ? 'Integração atualizada com sucesso.' : 'Integração criada com sucesso.');
      setErrors([]);
      onSuccess?.(savedIntegration);
    },
    onError: (error) => {
      const validationErrors = extractValidationIssues(error);
      setErrors(validationErrors.length > 0 ? validationErrors : [getErrorMessage(error)]);
    },
  });

  return (
    <form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setErrors([]); mutation.mutate(); }}>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="field-label">Nome</label>
          <input className="input" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
        </div>
        <div>
          <label className="field-label">Tipo</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as IntegrationType }))} value={form.type}>
            {INTEGRATION_TYPE_VALUES.map((value) => <option key={value} value={value}>{integrationTypeLabels[value]}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select className="select" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as IntegrationStatus }))} value={form.status}>
            {INTEGRATION_STATUS_VALUES.map((value) => <option key={value} value={value}>{integrationStatusLabels[value]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label">Configuração JSON</label>
        <textarea className="textarea font-mono" onChange={(event) => setForm((current) => ({ ...current, configText: event.target.value }))} rows={10} value={form.configText} />
      </div>
      {errors.length > 0 ? <div className="space-y-1 text-sm text-danger-text">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="flex justify-end gap-3">
        {onCancel ? <Button onClick={onCancel} variant="secondary">Cancelar</Button> : null}
        <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? 'Salvando...' : 'Salvar integração'}</Button>
      </div>
    </form>
  );
}
