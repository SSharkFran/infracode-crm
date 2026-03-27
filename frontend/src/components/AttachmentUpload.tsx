import { useMutation } from '@tanstack/react-query';
import { Paperclip, UploadCloud } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import api from '../lib/api';
import { extractValidationIssues, getErrorMessage } from '../lib/utils';
import type { Attachment } from '../types';
import { useToast } from '../hooks/useToast';
import { Button } from './ui/Button';

interface AttachmentUploadProps {
  uploadUrl: string;
  onUploaded?: (attachment: Attachment) => void;
}

export default function AttachmentUpload({ onUploaded, uploadUrl }: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [errors, setErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return (await api.post<Attachment>(uploadUrl, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: (attachment) => {
      toast.success('Arquivo enviado com sucesso.');
      setErrors([]);
      onUploaded?.(attachment);
    },
    onError: (error) => {
      const validationErrors = extractValidationIssues(error);
      setErrors(validationErrors.length > 0 ? validationErrors : [getErrorMessage(error)]);
    },
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrors([]);
    mutation.mutate(file);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-dashed border-border bg-elevated/60 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-accent-text">
          <UploadCloud className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-text-primary">Envie um arquivo de apoio</h3>
        <p className="mt-1 text-sm text-text-secondary">PDF, imagem ou documento de at&#233; 10 MB.</p>
        <input className="hidden" onChange={handleChange} ref={inputRef} type="file" />
        <Button className="mt-5" leftIcon={<Paperclip className="h-4 w-4" />} onClick={() => inputRef.current?.click()} variant="secondary">
          Selecionar arquivo
        </Button>
      </div>
      {mutation.isPending ? <p className="text-sm text-text-secondary">Enviando arquivo...</p> : null}
      {errors.length > 0 ? <div className="space-y-1 text-sm text-danger-text">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
    </div>
  );
}
