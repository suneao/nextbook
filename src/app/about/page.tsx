"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Globe, Heart, ExternalLink, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import Link from "next/link";

const ossProjects = [
  {
    name: "Next.js",
    url: "https://nextjs.org",
    desc: "The React framework for production",
  },
  {
    name: "Tailwind CSS",
    url: "https://tailwindcss.com",
    desc: "Utility-first CSS framework",
  },
  {
    name: "shadcn/ui",
    url: "https://ui.shadcn.com",
    desc: "Beautifully designed components",
  },
  {
    name: "Lucide",
    url: "https://lucide.dev",
    desc: "Beautiful & consistent icons",
  },
  {
    name: "KaTeX",
    url: "https://katex.org",
    desc: "Fast math typesetting for the web",
  },
  {
    name: "PDF.js",
    url: "https://mozilla.github.io/pdf.js/",
    desc: "PDF rendering in the browser",
  },
  {
    name: "Framer Motion",
    url: "https://motion.dev",
    desc: "Animation library for React",
  },
  {
    name: "Vercel AI SDK",
    url: "https://sdk.vercel.ai",
    desc: "AI-powered features",
  },
];

export default function AboutPage() {
  const { t } = useLocale();
  const features = [
    {
      key: "1",
      title: t("about.feature1.title"),
      desc: t("about.feature1.desc"),
    },
    {
      key: "2",
      title: t("about.feature2.title"),
      desc: t("about.feature2.desc"),
    },
    {
      key: "3",
      title: t("about.feature3.title"),
      desc: t("about.feature3.desc"),
    },
    {
      key: "4",
      title: t("about.feature4.title"),
      desc: t("about.feature4.desc"),
    },
  ];

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto pb-16 md:pb-0">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">NextBook</h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            {t("dashboard.welcome")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3" />
              {t("about.aiDriven")}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Globe className="size-3" />
              {t("about.multilingual")}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Heart className="size-3" />
              {t("about.openSource")}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t("about.title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("about.description")}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {features.map((f) => (
                <div key={f.key} className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t("about.links")}</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="https://github.com/suneao/nextbook" target="_blank">
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="size-4" />
                  GitHub
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Open Source */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t("about.opensource")}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {ossProjects.map((proj) => (
                <Link key={proj.name} href={proj.url} target="_blank">
                  <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{proj.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {proj.desc}
                      </p>
                    </div>
                    <ExternalLink className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
