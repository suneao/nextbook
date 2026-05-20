"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";

type ToastType = "error" | "success" | "warning" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "error") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons: Record<ToastType, typeof AlertCircle> = {
    error: AlertCircle,
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
  };

  const colors: Record<ToastType, string> = {
    error: "bg-red-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-16 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 ${colors[t.type]} text-white px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-2 fade-in`}
            >
              <Icon className="size-4 shrink-0" />
              <p className="text-sm">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-2 shrink-0 opacity-70 hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
