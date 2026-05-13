"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "nextbook-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
  }, [storageKey]);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (t: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(t);
      setResolvedTheme(t);
    };

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(media.matches ? "dark" : "light");

      const handler = (e: MediaQueryListEvent) =>
        applyTheme(e.matches ? "dark" : "light");
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (t: Theme) => {
      localStorage.setItem(storageKey, t);
      setThemeState(t);
    },
    [storageKey],
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next =
        prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      localStorage.setItem(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return (
    <ThemeProviderContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
