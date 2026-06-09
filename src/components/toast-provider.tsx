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
  Loader2,
} from "lucide-react";
import { getTaskCallbacks, registerTaskCallbacks } from "@/lib/task-callbacks";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n";

type ToastType = "error" | "success" | "warning" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  time: number;
};

type GenTask = {
  id: string;
  title: string;
  progress: string;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
  history: Toast[];
  clearHistory: () => void;
  activeTaskCount: number;
  setActiveTaskCount: (n: number) => void;
  activeTaskList: GenTask[];
  setActiveTaskList: (tasks: GenTask[]) => void;
  dismissAll: () => void;
  unreadCount: number;
  markAllRead: () => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  history: [],
  clearHistory: () => {},
  activeTaskCount: 0,
  setActiveTaskCount: () => {},
  activeTaskList: [],
  setActiveTaskList: () => {},
  dismissAll: () => {},
  unreadCount: 0,
  markAllRead: () => {},
});

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<Toast[]>([]);
  const [leavingIds, setLeavingIds] = useState<Set<number>>(new Set());
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [activeTaskList, setActiveTaskList] = useState<GenTask[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const toast = useCallback((message: string, type: ToastType = "error") => {
    const id = ++toastId;
    const t: Toast = { id, message, type, time: Date.now() };
    setToasts((prev) => [...prev, t]);
    setHistory((prev) => [t, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);
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

  const dismissAll = useCallback(() => {
    setToasts((prev) => {
      const ids = new Set(prev.map((t) => t.id));
      setLeavingIds((l) => new Set([...l, ...ids]));
      setTimeout(() => {
        setToasts((p) => p.filter((t) => !ids.has(t.id)));
        setLeavingIds((l) => {
          const next = new Set(l);
          for (const id of ids) next.delete(id);
          return next;
        });
      }, 300);
      return prev;
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

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
    <ToastContext.Provider
      value={{
        toast,
        history,
        clearHistory,
        activeTaskCount,
        setActiveTaskCount,
        activeTaskList,
        setActiveTaskList,
        dismissAll,
        unreadCount,
        markAllRead,
      }}
    >
      {children}
      <div className="fixed top-16 right-6 z-50 flex flex-col gap-2 max-w-80 max-h-[60vh] overflow-y-auto">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const leaving = leavingIds.has(t.id);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 ${colors[t.type]} text-white px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 max-w-sm ${
                leaving
                  ? "opacity-0 translate-x-4 scale-95"
                  : "opacity-100 translate-x-0 scale-100 animate-in fade-in slide-in-from-top-2 duration-300"
              }`}
            >
              <Icon className="size-4 shrink-0 mt-0.5" />
              <p className="text-sm flex-1 min-w-0 line-clamp-2">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-70 hover:opacity-100"
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

// ── Task callbacks ─── imported from lib/task-callbacks.ts

export function NotificationBell() {
  const {
    history,
    clearHistory,
    activeTaskCount,
    activeTaskList,
    dismissAll,
    unreadCount,
    markAllRead,
  } = useToast();
  const taskCallbacks = getTaskCallbacks();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const openRef = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    if (!openRef.current) return;
    setLeaving(true);
    setTimeout(() => {
      setOpen(false);
      setLeaving(false);
    }, 200);
  }, []);

  // Keep openRef in sync
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Register closeDropdown callback
  useEffect(() => {
    registerTaskCallbacks({
      ...getTaskCallbacks(),
      closeDropdown: close,
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totalBadge = unreadCount + activeTaskCount;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          if (open) {
            close();
          } else {
            taskCallbacks.onClosePanel?.();
            dismissAll();
            markAllRead();
            setOpen(true);
          }
        }}
        className="relative size-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="size-4" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>
      {(open || leaving) && (history.length > 0 || activeTaskCount > 0) ? (
        <div
          className={`absolute right-0 top-16 w-80 bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 max-h-80 overflow-y-auto flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 ${
            leaving
              ? "animate-out fade-out slide-out-to-top-2 fill-mode-forwards"
              : ""
          }`}
        >
          {activeTaskCount > 0 && (
            <div className="border-b bg-violet-50/80 dark:bg-violet-950/30 backdrop-blur-md">
              <p className="px-4 pt-2.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
                {t("notification.generating").replace(
                  "{count}",
                  String(activeTaskCount),
                )}
              </p>
              <div className="px-2 py-1.5 space-y-0.5">
                {activeTaskList.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      close();
                      taskCallbacks?.onExpandTasks();
                    }}
                    className="flex items-center gap-2 w-full text-left rounded-md px-2 py-1.5 hover:bg-muted/30 hover:backdrop-blur-md transition-colors"
                  >
                    <Loader2 className="size-3.5 animate-spin text-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {task.progress}
                      </p>
                    </div>
                    {taskCallbacks && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          taskCallbacks.onCancelTask(task.id);
                        }}
                        className="size-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/20 shrink-0 transition-colors"
                        title="取消"
                      >
                        <X className="size-3 text-red-500" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
            <p className="text-xs font-semibold text-muted-foreground">
              {t("notification.history")}
            </p>
            <button
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("notification.clear")}
            </button>
          </div>
          <div className="">
            {history.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-accent hover:text-accent-foreground transition-colors"
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
      ) : (
        (open || leaving) && (
          <div
            className={`absolute right-0 top-16 w-80 bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 p-6 text-center animate-in fade-in slide-in-from-top-2 duration-200 ${
              leaving
                ? "animate-out fade-out slide-out-to-top-2 fill-mode-forwards"
                : ""
            }`}
          >
            <Bell className="size-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {t("notification.empty")}
            </p>
          </div>
        )
      )}
    </div>
  );
}
