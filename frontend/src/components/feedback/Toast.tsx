import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext, useToastState } from '../../hooks/useToast';
import type { Toast as ToastItem, ToastType } from '../../hooks/useToast';

// ─── Provider ────────────────────────────────────────────────────────────────

interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app and supplies toast context + the rendered toast stack.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const value = useToastState();

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={value.toasts} dismiss={value.dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Stack ───────────────────────────────────────────────────────────────────

interface ToastStackProps {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}

function ToastStack({ toasts, dismiss }: ToastStackProps) {
  // Render into document.body to avoid z-index/stacking-context issues
  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center z-[9999] pointer-events-none w-full max-w-sm px-4"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>,
    document.body,
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: () => void;
}

const colorMap: Record<ToastType, string> = {
  success: 'bg-white border-l-4 border-green-600 text-gray-800',
  error: 'bg-white border-l-4 border-red-600 text-gray-800',
  warning: 'bg-white border-l-4 border-amber-600 text-gray-800',
  info: 'bg-white border-l-4 border-blue-600 text-gray-800',
};

const iconColorMap: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

function ToastIcon({ type }: { type: ToastType }) {
  const cls = `w-5 h-5 flex-shrink-0 ${iconColorMap[type]}`;

  switch (type) {
    case 'success':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case 'info':
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const [visible, setVisible] = useState(false);
  const mountedRef = useRef(false);

  // Animate in on mount
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      // Small tick so the browser registers the initial state before animating
      requestAnimationFrame(() => setVisible(true));
    }
  }, []);

  const isAlert = toast.type === 'error' || toast.type === 'warning';

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={[
        'pointer-events-auto w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg',
        'transition-all duration-300 ease-in-out',
        colorMap[toast.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      ].join(' ')}
    >
      <ToastIcon type={toast.type} />

      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>

      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 rounded-md p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
