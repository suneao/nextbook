import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/toast-provider";
import { Analytics } from "@vercel/analytics/react";
import { AppNav } from "@/components/app-nav";
import { AppLayout } from "./layout-client";
import { BackgroundBeams } from "@/components/background-beams";
import { MobileBottomNav } from "@/components/mobile-nav";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NextBook — Study Smarter",
  description:
    "An application that helps you study and review subjects with your own materials.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased font-sans",
        inter.variable,
        geistMono.variable,
      )}
      suppressHydrationWarning
    >
      <body
        className="h-full overflow-hidden flex flex-col"
        suppressHydrationWarning
      >
        <div className="relative flex h-full flex-col bg-zinc-50 text-slate-950 dark:bg-zinc-950 dark:text-slate-100 overflow-hidden">
          <BackgroundBeams />
          <div className="relative z-10 h-full flex flex-col">
            <ThemeProvider defaultTheme="system">
              <LocaleProvider>
                <ToastProvider>
                  <TooltipProvider>
                    <AppNav />
                    <div className="flex flex-1">
                      <AppLayout>{children}</AppLayout>
                    </div>
                    <MobileBottomNav />
                  </TooltipProvider>
                </ToastProvider>
              </LocaleProvider>
              <Analytics />
            </ThemeProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
