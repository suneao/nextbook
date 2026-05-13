"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { BookOpen } from "lucide-react";

export function AppNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-6 md:px-8 lg:px-10">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="size-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-sm tracking-tight">NextBook</span>
            <span className="text-[10px] text-muted-foreground">
              Study Smarter
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
