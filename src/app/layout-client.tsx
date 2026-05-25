"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AIChatPanel } from "@/components/ai-chat-panel";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";

// ── Context ────────────────────────────────────────────────────────────

export type LayoutContextType = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  aiPanelOpen: boolean;
  setAiPanelOpen: (value: boolean) => void;
  aiPanelChapter: string | undefined;
  setAiPanelChapter: (value: string | undefined) => void;
};

const LayoutContext = createContext<LayoutContextType | null>(null);

export function useLayout(): LayoutContextType {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within an <AppLayout>");
  }
  return context;
}

// ── Client Wrapper ─────────────────────────────────────────────────────

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isProjectPage =
    pathname.startsWith("/projects/") && pathname !== "/projects";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPanelChapter, setAiPanelChapter] = useState<string | undefined>(
    undefined,
  );

  return (
    <LayoutContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        aiPanelOpen,
        setAiPanelOpen,
        aiPanelChapter,
        setAiPanelChapter,
      }}
    >
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />
      <main className="flex-1 overflow-auto pb-16 md:pb-0 relative">
        {sidebarCollapsed && !isProjectPage && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 left-2 z-30 size-8 bg-background/80 backdrop-blur border shadow-sm hidden md:inline-flex"
            onClick={() => setSidebarCollapsed(false)}
            title="展开侧栏"
          >
            <PanelLeft className="size-4" />
          </Button>
        )}
        {children}
      </main>
      <AIChatPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        chapterTitle={aiPanelChapter}
      />
    </LayoutContext.Provider>
  );
}
