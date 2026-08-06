import { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

// Context — default is a no-op guard so the hook always has a safe fallback
export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => undefined,
  dismiss: () => undefined,
});

const DEFAULT_DURATION = 4000;

/**
 * Returns the factory function and state needed to power <ToastProvider>.
 * Exported separately so the provider file can be a .tsx file without
 * duplicating the context value logic.
 */
export function useToastState(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Keep a ref to timer IDs so we can cancel them on manual dismiss
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, message, duration = DEFAULT_DURATION }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = { id, type, message, duration };

      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        timers.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);

      timers.current.set(id, timer);
    },
    [],
  );

  return { toasts, toast, dismiss };
}

/**
 * useToast — consume toast context inside any component wrapped by <ToastProvider>.
 */
export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

// ToastProvider is in Toast.tsx (a .tsx file) because it renders JSX.
// Re-export the type so consumers can import everything from one place.
export type { ToastContextValue };
