import { useMutation } from '@tanstack/react-query';
import { SendHorizonal } from 'lucide-react';
import { useState } from 'react';

import api from '../../lib/api';
import { getErrorMessage } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';

interface WebhookTesterProps {
  integrationName: string;
}

interface TestHistoryEntry {
  payload: string;
  response: string;
  createdAt: string;
}

export function WebhookTester({ integrationName }: WebhookTesterProps) {
  const { toast } = useToast();
  const [payload, setPayload] = useState('{\n  "message": "Teste de webhook"\n}');
  const [responseText, setResponseText] = useState('');
  const [history, setHistory] = useState<TestHistoryEntry[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(payload);
      return (await api.post(`/webhooks/${integrationName}`, parsed)).data;
    },
    onSuccess: (response) => {
      const formatted = JSON.stringify(response, null, 2);
      setResponseText(formatted);
      setHistory((current) => [{ payload, response: formatted, createdAt: new Date().toISOString() }, ...current].slice(0, 5));
      toast.success('Webhook de teste disparado com sucesso.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  return (
    <div className="space-y-4">
      <textarea className="textarea min-h-48 font-mono text-xs" onChange={(event) => setPayload(event.target.value)} value={payload} />
      <Button disabled={mutation.isPending} leftIcon={<SendHorizonal className="h-4 w-4" />} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Disparando...' : 'Disparar teste'}
      </Button>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-elevated p-4">
          <p className="text-sm font-semibold text-text-primary">Resposta</p>
          <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-text-secondary">{responseText || 'A resposta do teste aparecerá aqui.'}</pre>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm font-semibold text-text-primary">Últimos 5 testes</p>
          <div className="mt-3 space-y-3">
            {history.length > 0 ? history.map((entry) => (
              <div key={entry.createdAt} className="rounded-button border border-border px-3 py-3">
                <p className="text-xs text-text-tertiary">{entry.createdAt}</p>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-text-secondary">{entry.payload}</pre>
              </div>
            )) : <p className="text-sm text-text-secondary">Nenhum teste executado nesta sessão.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
