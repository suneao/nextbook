"use client";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`Current theme: ${theme}. Click to cycle.`}
    >
      <Icon className="size-5" />
    </Button>
  );
}
