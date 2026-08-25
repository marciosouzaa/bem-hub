"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type FeedbackToastVariant = "error" | "info" | "success" | "warning";

type FeedbackToastInput = {
  action?: ReactNode;
  durationMs?: number;
  message: string;
  title?: string;
  variant?: FeedbackToastVariant;
};

type FeedbackToastItem = FeedbackToastInput & {
  id: number;
  variant: FeedbackToastVariant;
};

type FeedbackToastContextValue = {
  dismissToast: (toastId: number) => void;
  showToast: (toast: FeedbackToastInput) => number;
};

const FeedbackToastContext = createContext<FeedbackToastContextValue | null>(null);

const variantStyles: Record<FeedbackToastVariant, string> = {
  error: "border-danger/40 bg-danger text-[#180707]",
  info: "border-panel-border bg-panel-elevated text-foreground",
  success: "border-primary/40 bg-primary text-primary-foreground",
  warning: "border-warning/40 bg-warning text-[#171104]",
};

const closeStyles: Record<FeedbackToastVariant, string> = {
  error: "hover:bg-[#180707]/10 focus-visible:ring-[#180707]/35",
  info: "hover:bg-panel focus-visible:ring-primary/45",
  success: "hover:bg-primary-foreground/10 focus-visible:ring-primary-foreground/35",
  warning: "hover:bg-[#171104]/10 focus-visible:ring-[#171104]/35",
};

const variantIcons = {
  error: XCircle,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
};

export function FeedbackToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<FeedbackToastItem[]>([]);

  const dismissToast = useCallback((toastId: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback((toast: FeedbackToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [
      ...current,
      {
        ...toast,
        durationMs: toast.durationMs ?? 3000,
        id,
        variant: toast.variant ?? "info",
      },
    ]);
    return id;
  }, []);

  const value = useMemo(
    () => ({ dismissToast, showToast }),
    [dismissToast, showToast],
  );

  return (
    <FeedbackToastContext.Provider value={value}>
      {children}
      <FeedbackToastViewport dismissToast={dismissToast} toasts={toasts} />
    </FeedbackToastContext.Provider>
  );
}

export function useFeedbackToast() {
  const context = useContext(FeedbackToastContext);
  if (!context) {
    throw new Error("useFeedbackToast deve ser usado dentro de FeedbackToastProvider.");
  }
  return context;
}

function FeedbackToastViewport({
  dismissToast,
  toasts,
}: {
  dismissToast: (toastId: number) => void;
  toasts: FeedbackToastItem[];
}) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[var(--layer-feedback)] flex flex-col-reverse items-center gap-2">
      {toasts.slice(-3).map((toast) => (
        <FeedbackToastCard
          dismissToast={dismissToast}
          key={toast.id}
          toast={toast}
        />
      ))}
    </div>
  );
}

function FeedbackToastCard({
  dismissToast,
  toast,
}: {
  dismissToast: (toastId: number) => void;
  toast: FeedbackToastItem;
}) {
  const Icon = variantIcons[toast.variant];

  useEffect(() => {
    if ((toast.durationMs ?? 3000) <= 0) return;
    const timeoutId = window.setTimeout(
      () => dismissToast(toast.id),
      toast.durationMs ?? 3000,
    );
    return () => window.clearTimeout(timeoutId);
  }, [dismissToast, toast.durationMs, toast.id]);

  return (
    <div
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto w-[min(28rem,calc(100vw-2rem))] rounded-[var(--radius-panel)] border px-3 py-3 shadow-[var(--shadow-popover)]",
        variantStyles[toast.variant],
      )}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          {toast.title ? (
            <p className="text-sm font-semibold">{toast.title}</p>
          ) : null}
          <p className="text-sm font-medium leading-5">{toast.message}</p>
          {toast.action ? <div className="mt-2">{toast.action}</div> : null}
        </div>
        <button
          aria-label="Fechar notificacao"
          className={cn(
            "-mr-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-current opacity-80 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2",
            closeStyles[toast.variant],
          )}
          onClick={() => dismissToast(toast.id)}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
