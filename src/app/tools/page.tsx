"use client";

import { useState } from "react";
import {
  ExternalLink,
  Globe,
  Search,
  Star,
  Wrench,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";

const tools = [
  {
    title: "Belindoc",
    description:
      "AI-powered document analysis and knowledge management platform. Upload PDFs, extract insights, and build your knowledge base.",
    url: "https://belindoc.com",
    icon: "📄",
    category: "ai",
    tags: ["AI", "PDF", "Knowledge"],
    color: "#3b82f6",
  },
  {
    title: "NotebookLM",
    description:
      "Google's experimental AI notebook. Upload sources and let AI help you summarize, ask questions, and generate ideas.",
    url: "https://notebooklm.google.com",
    icon: "📓",
    category: "ai",
    tags: ["AI", "Notes", "Research"],
    color: "#10b981",
  },
  {
    title: "雨课堂",
    description:
      "清华大学推出的智慧教学工具，支持课件互动、实时答题、弹幕讨论，让课堂更生动有趣。",
    url: "https://www.yuketang.cn",
    icon: "🌧️",
    category: "education",
    tags: ["教学", "互动", "课件"],
    color: "#8b5cf6",
  },
];

const categories = [
  { key: "all", labelKey: "tools.all", icon: Wrench },
  { key: "ai", labelKey: "tools.ai", icon: Sparkles },
  { key: "education", labelKey: "tools.education", icon: GraduationCap },
];

export default function ToolsPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = tools.filter((tool) => {
    const matchSearch =
      !search ||
      tool.title.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase()) ||
      tool.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchCategory =
      activeCategory === "all" || tool.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-gradient-to-b from-background via-background to-muted/10">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {t("nav.tools")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("tools.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="size-3.5 text-amber-500 fill-amber-500" />
              <span>
                {tools.length} {t("tools.count")}
              </span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder={t("tools.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeCategory === cat.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {t(cat.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("tools.noMatch")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tool) => (
              <a
                key={tool.url}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="relative h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden border-l-[3px] group-hover:border-l-primary">
                  {/* Top accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: tool.color }}
                  />
                  <CardContent className="p-5 space-y-4">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-3">
                      <div
                        className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm"
                        style={{
                          backgroundColor: tool.color + "14",
                        }}
                      >
                        {tool.icon}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className="text-base font-semibold group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {tool.title}
                          <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground/60">
                          <Globe className="size-3" />
                          <span className="truncate">
                            {new URL(tool.url).hostname}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {tool.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {tool.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[0.65rem] h-5 px-2 font-normal"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
