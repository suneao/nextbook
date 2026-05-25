"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  HardDrive,
  BookOpen,
  Plus,
  Wrench,
  HelpCircle,
  Info,
} from "lucide-react";
import Link from "next/link";

type AppSidebarProps = {
  onCreateProject?: () => void;
};

export function AppSidebar({ onCreateProject }: AppSidebarProps) {
  const { t } = useLocale();
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: t("nav.home"), icon: LayoutDashboard },
    { href: "/projects", label: t("nav.projects"), icon: FolderKanban },
    { href: "/storage", label: t("nav.storage"), icon: HardDrive },
    { href: "/tools", label: t("nav.tools"), icon: Wrench },
    { href: "/help", label: t("nav.help"), icon: HelpCircle },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
    { href: "/about", label: t("nav.about"), icon: Info },
  ];

  return (
    <aside className="hidden md:flex sticky top-14 h-[calc(100vh-3.5rem)] flex-col border-r bg-card/40 backdrop-blur-md shrink-0 w-60">
      {/* Nav Items */}
      <ScrollArea className="flex-1 px-2 py-3 sidebar-scroll">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    active && "font-semibold",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* New Project Button */}
        {onCreateProject && (
          <div className="mt-4">
            <Separator className="mb-3" />
            <Button
              variant="outline"
              className="w-full border-dashed justify-start gap-3"
              onClick={onCreateProject}
            >
              <Plus className="size-5 shrink-0" />
              <span>{t("projects.new")}</span>
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Footer branding */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="size-5" />
          <span>NextBook Study</span>
        </div>
      </div>
    </aside>
  );
}
