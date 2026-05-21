"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/toast-provider";
export function AppNav() {
  return (
    <header className="sticky top-0 z-50 w-full h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <img
            src="/favicon.ico"
            alt="NextBook"
            className="size-9 rounded-lg"
          />
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
