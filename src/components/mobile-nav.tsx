"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  HardDrive,
  Wrench,
  HelpCircle,
  Settings,
  Info,
  Ellipsis,
} from "lucide-react";

export function MobileBottomNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        btnRef.current &&
        !btnRef.current.contains(t) &&
        menuRef.current &&
        !menuRef.current.contains(t)
      )
        setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const primaryItems = [
    { href: "/", label: t("nav.home"), icon: LayoutDashboard },
    { href: "/projects", label: t("nav.projects"), icon: FolderKanban },
    { href: "/tools", label: t("nav.tools"), icon: Wrench },
  ];

  const secondaryItems = [
    { href: "/storage", label: t("nav.storage"), icon: HardDrive },
    { href: "/help", label: t("nav.help"), icon: HelpCircle },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
    { href: "/about", label: t("nav.about"), icon: Info },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 px-2 safe-area-bottom">
        {primaryItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 rounded-lg transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="text-[10px] font-medium truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <div ref={btnRef} className="flex-1 flex flex-col items-center">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 rounded-lg transition-colors w-full",
              moreOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Ellipsis className="size-5 shrink-0" />
            <span className="text-[10px] font-medium">更多</span>
          </button>

          {moreOpen &&
            createPortal(
              <div
                ref={menuRef}
                className="fixed bottom-[calc(4rem+16px+env(safe-area-inset-bottom,0px))] right-4 w-44 bg-card/40 backdrop-blur-md border rounded-xl shadow-2xl overflow-hidden z-50"
              >
                {secondaryItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>,
              document.body,
            )}
        </div>
      </div>
    </nav>
  );
}
