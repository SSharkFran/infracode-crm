import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  placement?: 'center' | 'right';
  children: ReactNode;
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
} as const;

export function Modal({
  children,
  description,
  onClose,
  open,
  placement = 'center',
  size = 'md',
  title,
}: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    document.body.dataset.modalOpen = 'true';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      delete document.body.dataset.modalOpen;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className={cn(
        'absolute inset-0 z-[80] flex bg-black/70 p-4 backdrop-blur-sm',
        placement === 'center' ? 'items-center justify-center' : 'items-stretch justify-end',
      )}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        aria-modal="true"
        className={cn(
          'card-elevated animate-modal-in flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden',
          sizeMap[size],
          placement === 'right' && 'h-full max-w-2xl rounded-r-none rounded-l-card',
        )}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    modalRoot,
  );
}
