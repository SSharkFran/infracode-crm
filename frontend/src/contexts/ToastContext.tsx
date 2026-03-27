import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { MAX_VISIBLE_TOASTS } from '../lib/constants';
import type { ToastItem, ToastType } from '../types';
import { Toast } from '../components/ui/Toast';

type ToastApi = {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
};

export const ToastContext = createContext<{ toast: ToastApi } | null>(null);

function createToast(id: string, type: ToastType, message: string, duration?: number): ToastItem {
  return { id, type, message, duration };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const timers = toasts.map((toast) => window.setTimeout(() => removeToast(toast.id), toast.duration ?? 4000));
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [removeToast, toasts]);

  const pushToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((current) => [createToast(id, type, message, duration), ...current].slice(0, MAX_VISIBLE_TOASTS));
  }, []);

  const value = useMemo(
    () => ({
      toast: {
        success: (message: string, duration?: number) => pushToast('success', message, duration),
        error: (message: string, duration?: number) => pushToast('error', message, duration),
        warning: (message: string, duration?: number) => pushToast('warning', message, duration),
        info: (message: string, duration?: number) => pushToast('info', message, duration),
      },
    }),
    [pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} item={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
