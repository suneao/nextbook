"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Heart,
  ExternalLink,
  Sparkles,
  Cpu,
  GraduationCap,
  Award,
  MessageSquare,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import Link from "next/link";

const ossProjects = [
  {
    name: "Next.js",
    url: "https://nextjs.org",
    desc: "The React framework for production",
    tag: "Framework",
    color: "bg-black/5 dark:bg-white/5 text-foreground",
  },
  {
    name: "Tailwind CSS",
    url: "https://tailwindcss.com",
    desc: "Utility-first CSS framework",
    tag: "CSS",
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    name: "shadcn/ui",
    url: "https://ui.shadcn.com",
    desc: "Beautifully designed components",
    tag: "UI Library",
    color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  },
  {
    name: "Lucide",
    url: "https://lucide.dev",
    desc: "Beautiful & consistent icons",
    tag: "Icons",
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  {
    name: "KaTeX",
    url: "https://katex.org",
    desc: "Fast math typesetting for the web",
    tag: "Math",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    name: "PDF.js",
    url: "https://mozilla.github.io/pdf.js/",
    desc: "PDF rendering in the browser",
    tag: "PDF Engine",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    name: "Framer Motion",
    url: "https://motion.dev",
    desc: "Animation library for React",
    tag: "Animation",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    name: "Vercel AI SDK",
    url: "https://sdk.vercel.ai",
    desc: "AI-powered features",
    tag: "AI SDK",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
];

const featureDetails = [
  {
    icon: Cpu,
    colorClass:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10",
    hoverClass: "hover:bg-blue-500/[0.02] hover:border-blue-500/20",
  },
  {
    icon: GraduationCap,
    colorClass:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/10",
    hoverClass: "hover:bg-purple-500/[0.02] hover:border-purple-500/20",
  },
  {
    icon: Award,
    colorClass:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10",
    hoverClass: "hover:bg-amber-500/[0.02] hover:border-amber-500/20",
  },
  {
    icon: MessageSquare,
    colorClass:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10",
    hoverClass: "hover:bg-emerald-500/[0.02] hover:border-emerald-500/20",
  },
];

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
      <title>GitHub</title>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

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
    <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto pb-20 md:pb-12 bg-background/50 scrollbar-thin">
      {/* Background Decorative Blobs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-125 h-125 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl pointer-events-none animate-float [animation-delay:4s]" />

      <div className="relative max-w-2xl mx-auto px-6 py-16 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-8 animate-fade-in-up">
          <div className="relative inline-flex">
            {/* Inner container */}
            <div className="relative size-16 items-center justify-center flex rounded-2xl bg-linear-to-tr from-primary/10 to-purple-500/10 border border-primary/20 shadow-inner p-2.5">
              <img
                src="/favicon.ico"
                alt="NextBook Logo"
                className="size-full object-contain rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-linear-to-r from-primary via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              NextBook
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto font-normal leading-relaxed">
              {t("about.tagline")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Badge
              variant="outline"
              className="px-3.5 py-1 rounded-full bg-primary/3 border-primary/10 text-primary gap-1.5 text-xs font-medium"
            >
              <Sparkles className="size-3.5" />
              {t("about.aiDriven")}
            </Badge>
            <Badge
              variant="outline"
              className="px-3.5 py-1 rounded-full bg-indigo-500/3 border-indigo-500/10 text-indigo-600 dark:text-indigo-400 gap-1.5 text-xs font-medium"
            >
              <Globe className="size-3.5" />
              {t("about.multilingual")}
            </Badge>
            <Badge
              variant="outline"
              className="px-3.5 py-1 rounded-full bg-rose-500/3 border-rose-500/10 text-rose-600 dark:text-rose-400 gap-1.5 text-xs font-medium"
            >
              <Heart className="size-3.5" />
              {t("about.openSource")}
            </Badge>
          </div>
        </div>

        {/* Mission / Description Section */}
        <div className="text-center space-y-4 max-w-xl mx-auto animate-fade-in-up [animation-delay:100ms]">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-primary/80">
            {t("about.title")}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground/90 font-normal leading-relaxed">
            {t("about.description")}
          </p>
          <div className="flex justify-center">
            <div className="h-0.5 w-12 bg-linear-to-r from-primary/30 to-purple-600/30 rounded-full" />
          </div>
        </div>

        {/* Core Features Grid */}
        <div className="space-y-6 animate-fade-in-up [animation-delay:200ms]">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">
              {t("about.coreFeatures")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("about.coreFeaturesDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, idx) => {
              const detail = featureDetails[idx];
              const Icon = detail.icon;
              return (
                <div
                  key={f.key}
                  className={`group relative rounded-2xl border border-muted/60 bg-card/40 backdrop-blur-xs p-5 transition-all duration-300 ${detail.hoverClass}`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-105 ${detail.colorClass}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                        {f.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Open Source Credits */}
        <div className="space-y-6 animate-fade-in-up [animation-delay:300ms]">
          <div className="text-center space-y-1">
            <div className="inline-flex p-1.5 rounded-lg bg-primary/5 text-primary mb-1">
              <Layers className="size-4" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">
              {t("about.opensource")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("about.builtWith")}
            </p>
          </div>
          <div className="grid gap-3 grid-cols-2">
            {ossProjects.map((proj) => (
              <Link
                key={proj.name}
                href={proj.url}
                target="_blank"
                className="block"
              >
                <div className="group flex items-start justify-between gap-2.5 rounded-xl border border-muted/50 bg-card/30 backdrop-blur-xs p-3.5 hover:bg-muted/30 hover:border-primary/10 transition-all duration-300 h-full">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {proj.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1 py-0 font-medium rounded-md scale-90 origin-left ${proj.color}`}
                      >
                        {proj.tag}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                      {proj.desc}
                    </p>
                  </div>
                  <ExternalLink className="size-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Call to Action / Links Section */}
        <div className="text-center space-y-6 animate-fade-in-up [animation-delay:400ms] pt-4">
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-semibold tracking-tight">
              {t("about.links")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("about.cta")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="https://github.com/suneao/nextbook" target="_blank">
              <Button
                size="sm"
                className="gap-1.5 rounded-full px-5 shadow-xs hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              >
                <GithubIcon className="size-4" />
                {t("about.githubRepo")}
              </Button>
            </Link>
            <Link href="/projects">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full px-5 hover:bg-muted/80 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              >
                {t("about.getStarted")}
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
