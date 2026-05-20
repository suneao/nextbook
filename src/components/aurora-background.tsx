"use client";

import type React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  animationSpeed?: number;
}

export function AuroraBackground({
  className,
  children,
  animationSpeed = 60,
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col bg-zinc-50 text-slate-950 dark:bg-zinc-900 dark:text-slate-100 overflow-hidden",
        className,
      )}
      {...(props as Record<string, unknown>)}
    >
      {/* Aurora layer — emerald gradient with gaussian blur, dark-theme adaptive */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -inset-[10px] opacity-40 blur-[80px] will-change-transform dark:opacity-50"
          style={{
            background:
              "repeating-linear-gradient(100deg, #10b981 10%, #34d399 15%, #6ee7b7 20%, #2dd4bf 25%, #14b8a6 30%)",
            backgroundSize: "200% 200%",
            backgroundPosition: "50% 50%",
            animation: `aurora ${animationSpeed}s linear infinite`,
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full w-full">{children}</div>

      <style>{`
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
