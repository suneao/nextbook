"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AIChatPanel } from "@/components/ai-chat-panel";

// ── Context ────────────────────────────────────────────────────────────

export type LayoutContextType = {
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
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPanelChapter, setAiPanelChapter] = useState<string | undefined>(
    undefined,
  );

  return (
    <LayoutContext.Provider
      value={{
        aiPanelOpen,
        setAiPanelOpen,
        aiPanelChapter,
        setAiPanelChapter,
      }}
    >
      <AppSidebar />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      <AIChatPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        chapterTitle={aiPanelChapter}
      />
    </LayoutContext.Provider>
  );
}
