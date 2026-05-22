"use client";

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
} from "lucide-react";

export function MobileBottomNav() {
  const { t } = useLocale();
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: t("nav.home"), icon: LayoutDashboard },
    { href: "/projects", label: t("nav.projects"), icon: FolderKanban },
    { href: "/storage", label: t("nav.storage"), icon: HardDrive },
    { href: "/tools", label: t("nav.tools"), icon: Wrench },
    { href: "/help", label: t("nav.help"), icon: HelpCircle },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-16 px-2 safe-area-bottom">
        {navItems.map((item) => {
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
      </div>
    </nav>
  );
}
