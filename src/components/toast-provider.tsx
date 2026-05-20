"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertCircle,
  Bell,
} from "lucide-react";

type ToastType = "error" | "success" | "warning" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  time: number;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
  history: Toast[];
  clearHistory: () => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  history: [],
  clearHistory: () => {},
});

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<Toast[]>([]);
  const [leavingIds, setLeavingIds] = useState<Set<number>>(new Set());

  const toast = useCallback((message: string, type: ToastType = "error") => {
    const id = ++toastId;
    const t: Toast = { id, message, type, time: Date.now() };
    setToasts((prev) => [...prev, t]);
    setHistory((prev) => [t, ...prev].slice(0, 50));
    setTimeout(() => {
      setLeavingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
        setLeavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    }, 4700);
  }, []);

  const dismiss = useCallback((id: number) => {
    setLeavingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

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
    <ToastContext.Provider value={{ toast, history, clearHistory }}>
      {children}
      <div className="fixed top-16 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const leaving = leavingIds.has(t.id);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 ${colors[t.type]} text-white px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 ${
                leaving
                  ? "opacity-0 translate-x-4 scale-95"
                  : "opacity-100 translate-x-0 scale-100 motion-preset-slide-down motion-duration-300"
              }`}
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

export function NotificationBell() {
  const { history, clearHistory } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative size-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="size-4" />
        {history.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {history.length > 9 ? "9+" : history.length}
          </span>
        )}
      </button>
      {open && history.length > 0 && (
        <div className="absolute right-0 top-11 w-80 bg-card border rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
            <p className="text-xs font-semibold text-muted-foreground">
              通知历史
            </p>
            <button
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              清除
            </button>
          </div>
          <div className="overflow-y-auto">
            {history.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30"
              >
                {t.type === "error" && (
                  <AlertCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                )}
                {t.type === "success" && (
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                )}
                {t.type === "warning" && (
                  <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                {t.type === "info" && (
                  <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs">{t.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(t.time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {open && history.length === 0 && (
        <div className="absolute right-0 top-11 w-80 bg-card border rounded-xl shadow-2xl z-50 p-6 text-center">
          <Bell className="size-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">暂无通知</p>
        </div>
      )}
    </div>
  );
}
