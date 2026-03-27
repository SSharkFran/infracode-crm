import { CheckCircle2 } from 'lucide-react';

import { Button } from '../ui/Button';
import { formatJsonWithHighlight } from '../../lib/utils';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: () => void;
  isValid: boolean | null;
}

export function JsonEditor({ isValid, onChange, onValidate, value }: JsonEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="field-label !mb-0">Configuração JSON</label>
        <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={onValidate} variant="secondary">Validar JSON</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <textarea className="textarea min-h-[22rem] font-mono text-xs" onChange={(event) => onChange(event.target.value)} value={value} />
        <div className="card-elevated min-h-[22rem] overflow-auto p-4">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className={isValid ? 'text-success-text' : isValid === false ? 'text-danger-text' : 'text-text-secondary'}>
              {isValid === null ? 'Preview de sintaxe' : isValid ? 'JSON válido' : 'JSON inválido'}
            </span>
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-secondary" dangerouslySetInnerHTML={{ __html: formatJsonWithHighlight(value) }} />
        </div>
      </div>
    </div>
  );
}
