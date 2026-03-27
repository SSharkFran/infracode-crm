import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

type ConfirmFn = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleClose = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setMessage(null);
  };

  const confirm: ConfirmFn = (nextMessage) =>
    new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setMessage(nextMessage);
    });

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        description="Essa ação pode alterar dados de forma permanente."
        onClose={() => handleClose(false)}
        open={Boolean(message)}
        size="sm"
        title="Confirmar ação"
      >
        <p className="text-sm leading-6 text-text-secondary">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={() => handleClose(false)} variant="secondary">
            Cancelar
          </Button>
          <Button onClick={() => handleClose(true)} variant="danger">
            Confirmar
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm deve ser usado dentro de ConfirmProvider.');
  }

  return context;
}
