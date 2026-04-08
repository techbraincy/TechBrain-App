"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: Omit<Toast, "id">) => string;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastType, { wrapper: string; icon: string; bar: string }> = {
  success: { wrapper: "border-green-200 bg-white",  icon: "text-green-600", bar: "bg-green-500" },
  error:   { wrapper: "border-red-200 bg-white",    icon: "text-red-600",   bar: "bg-red-500"   },
  warning: { wrapper: "border-amber-200 bg-white",  icon: "text-amber-600", bar: "bg-amber-500" },
  info:    { wrapper: "border-violet-200 bg-white", icon: "text-violet-600",bar: "bg-violet-500"},
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const duration = toast.duration ?? 4000;
  const Icon = ICONS[toast.type];
  const style = STYLES[toast.type];

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const hide = setTimeout(dismiss, duration);
    return () => { cancelAnimationFrame(show); clearTimeout(hide); };
  }, [dismiss, duration]);

  return (
    <div
      role="alert"
      className={`
        relative flex items-start gap-3 w-full max-w-sm rounded-2xl border px-4 py-3.5
        overflow-hidden transition-all duration-300 ease-out
        ${style.wrapper}
        ${visible && !exiting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
      `}
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
    >
      <div className={`absolute bottom-0 left-0 h-[3px] ${style.bar}`}
        style={{ animation: `toast-shrink ${duration}ms linear forwards` }} />
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.icon}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{toast.title}</p>
        {toast.message && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>
      <button onClick={dismiss} aria-label="Dismiss"
        className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors mt-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ToastProvider");
  return ctx;
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function resolve(value: boolean) {
    setVisible(false);
    setTimeout(() => { state.resolve(value); onClose(); }, 200);
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200
        ${visible ? "bg-black/30 backdrop-blur-sm" : "bg-black/0"}`}
      onClick={() => resolve(false)}
    >
      <div
        className={`
          bg-white rounded-2xl w-full max-w-sm p-6
          transition-all duration-200 ease-out border border-gray-200
          ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        `}
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.16)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {state.danger && (
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
        )}
        <h3 className="text-base font-semibold text-gray-900">{state.title}</h3>
        {state.message && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{state.message}</p>}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => resolve(false)}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
          >
            {state.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={() => resolve(true)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all ${
              state.danger
                ? "bg-red-600 hover:bg-red-500"
                : "bg-violet-600 hover:bg-violet-500"
            }`}
            style={{ boxShadow: state.danger ? "0 4px 12px rgba(220,38,38,0.3)" : "0 4px 12px rgba(124,58,237,0.3)" }}
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = useCallback((opts: Omit<Toast, "id">): string => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]);
    return id;
  }, []);

  const success = useCallback((title: string, message?: string) => toast({ type: "success", title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: "error",   title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: "warning", title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: "info",    title, message }), [toast]);

  const showConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => setConfirm({ ...opts, resolve })), []);

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
      <ConfirmContext.Provider value={showConfirm}>
        {children}
        <div aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-3 pointer-events-none"
          style={{ maxWidth: "24rem", width: "calc(100vw - 2.5rem)" }}
        >
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>
        {confirm && <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />}
        <style>{`
          @keyframes toast-shrink { from { width: 100%; } to { width: 0%; } }
        `}</style>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
