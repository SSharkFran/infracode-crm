import { useMutation } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import api from '../lib/api';
import { cn, getErrorMessage } from '../lib/utils';
import type { Attachment } from '../types';

interface AttachmentUploadProps {
  uploadUrl: string;
  onUploaded?: (attachment: Attachment) => void;
}

export default function AttachmentUpload({ uploadUrl, onUploaded }: AttachmentUploadProps) {
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<Attachment>(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (attachment) => {
      onUploaded?.(attachment);
    },
  });

  const dropzone = useDropzone({
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    onDropAccepted: (files) => {
      const [file] = files;
      if (file) mutation.mutate(file);
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...dropzone.getRootProps()}
        className={cn(
          'rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center transition',
          dropzone.isDragActive ? 'border-app-accent bg-app-accent/10' : 'hover:border-white/30',
        )}
      >
        <input {...dropzone.getInputProps()} />
        <UploadCloud className="mx-auto h-10 w-10 text-app-accent" />
        <p className="mt-4 text-sm font-semibold text-white">Arraste um arquivo ou clique para enviar</p>
        <p className="mt-1 text-xs text-zinc-500">PDF, imagem ou documento até 10 MB</p>
      </div>
      {mutation.isPending ? <p className="text-sm text-zinc-400">Enviando arquivo...</p> : null}
      {mutation.error ? <p className="text-sm text-rose-300">{getErrorMessage(mutation.error)}</p> : null}
      {mutation.isSuccess ? <p className="text-sm text-emerald-300">Arquivo enviado com sucesso.</p> : null}
    </div>
  );
}
