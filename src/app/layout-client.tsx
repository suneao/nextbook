"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AIChatPanel } from "@/components/ai-chat-panel";

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
      <main className="flex-1 overflow-auto relative">{children}</main>
      <AIChatPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        chapterTitle={aiPanelChapter}
      />
    </LayoutContext.Provider>
  );
}
