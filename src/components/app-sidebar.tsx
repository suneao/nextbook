"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  FolderKanban,
  Settings, HardDrive,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "主页", icon: LayoutDashboard },
  { href: "/projects", label: "项目管理", icon: FolderKanban },
  { href: "/storage", label: "存储", icon: HardDrive },
  { href: "/settings", label: "设置", icon: Settings },
];

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  onCreateProject?: () => void;
};

export function AppSidebar({
  collapsed,
  onToggle,
  onCreateProject,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col border-r bg-card/50 backdrop-blur shrink-0 transition-all duration-300",
        collapsed ? "w-[56px]" : "w-[240px]",
      )}
    >
      {/* Toggle */}
      <div
        className={cn(
          "flex items-center p-2",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onToggle}
          title={collapsed ? "展开侧栏" : "收起侧栏"}
        >
          {collapsed ? (
            <ChevronRight className="size-5" />
          ) : (
            <ChevronLeft className="size-5" />
          )}
        </Button>
      </div>

      <Separator />

      {/* Nav Items */}
      <ScrollArea className="flex-1 px-2 py-3 sidebar-scroll">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
              >
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full transition-all",
                    collapsed ? "justify-center px-0" : "justify-start gap-3",
                    active && "font-semibold",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
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
              className={cn(
                "w-full border-dashed transition-all",
                collapsed ? "justify-center px-0" : "justify-start gap-3",
              )}
              onClick={onCreateProject}
              title={collapsed ? "新建项目" : undefined}
            >
              <Plus className="size-5 shrink-0" />
              {!collapsed && <span>新建项目</span>}
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Footer branding */}
      <div className={cn("p-3 border-t", collapsed && "flex justify-center")}>
        {collapsed ? (
          <BookOpen className="size-5 text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="size-5" />
            <span>NextBook Study</span>
          </div>
        )}
      </div>
    </aside>
  );
}
