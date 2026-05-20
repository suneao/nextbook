"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/toast-provider";
import { BookOpen } from "lucide-react";

export function AppNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="size-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-base tracking-tight">NextBook</span>
            <span className="text-[10px] text-muted-foreground">
              Study Smarter
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
