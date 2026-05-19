"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  FolderKanban,
  CheckCircle2,
  BarChart3,
  Plus,
  ArrowRight,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLayout } from "./layout-client";
import { type Project, defaultProjects } from "@/lib/study-data";

// ── Stats Calculation ──────────────────────────────────────────────────

function useDashboardStats() {
  return useMemo(() => {
    const totalProjects = defaultProjects.length;

    let totalChapters = 0;
    let completedSubChapters = 0;
    let totalSubChapters = 0;

    for (const project of defaultProjects) {
      totalChapters += project.chapters.length;
      for (const chapter of project.chapters) {
        for (const sc of chapter.subChapters) {
          totalSubChapters += 1;
          if (sc.completed) completedSubChapters += 1;
        }
      }
    }

    const progressPct =
      totalSubChapters > 0
        ? Math.round((completedSubChapters / totalSubChapters) * 100)
        : 0;

    return {
      totalProjects,
      totalChapters,
      completedSubChapters,
      totalSubChapters,
      progressPct,
    };
  }, []);
}

// ── Helpers ────────────────────────────────────────────────────────────

function projectProgress(project: Project) {
  let completed = 0;
  let total = 0;
  for (const ch of project.chapters) {
    for (const sc of ch.subChapters) {
      total += 1;
      if (sc.completed) completed += 1;
    }
  }
  return {
    completed,
    total,
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// ── Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const stats = useDashboardStats();
  const { setAiPanelOpen, setAiPanelChapter } = useLayout();

  return (
    <ScrollArea className="h-[calc(100vh-3.5rem)]">
      <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-10 py-8 space-y-8">
        {/* ── Welcome Header ──────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">学习仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-1">
            欢迎回来，继续你的学习之旅
          </p>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <FolderKanban className="size-5 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tabular-nums leading-none">
                  {stats.totalProjects}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  项目数
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                <Layers className="size-5 text-violet-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tabular-nums leading-none">
                  {stats.totalChapters}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  章节数
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="size-5 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tabular-nums leading-none">
                  {stats.completedSubChapters}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{stats.totalSubChapters}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  完成进度
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">学习进度</span>
                <span className="ml-auto text-sm font-bold tabular-nums">
                  {stats.progressPct}%
                </span>
              </div>
              <Progress value={stats.progressPct} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* ── Recent Projects ──────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">最近项目</h2>
              <p className="text-sm text-muted-foreground">继续你的学习进度</p>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                查看全部
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {defaultProjects.map((project) => {
              const { pct, completed, total } = projectProgress(project);
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="group h-full transition-shadow hover:shadow-md cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg"
                            style={{ backgroundColor: project.color + "18" }}
                          >
                            {project.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {project.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {project.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {project.chapters.length} 章
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>
                          已完成 {completed}/{total} 节
                        </span>
                        <span className="font-medium tabular-nums">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* ── Quick Actions ────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">快速操作</h2>
            <p className="text-sm text-muted-foreground">管理你的学习项目</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-dashed bg-muted/40 hover:bg-muted/60 transition-colors">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Plus className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">创建新项目</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    上传教材，开始新的学习
                  </p>
                </div>
                <Link href="/projects">
                  <Button size="sm">
                    创建
                    <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-dashed bg-muted/40 hover:bg-muted/60 transition-colors">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">浏览项目库</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    查看所有学习项目
                  </p>
                </div>
                <Link href="/projects">
                  <Button size="sm" variant="outline">
                    浏览
                    <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-dashed bg-muted/40 hover:bg-muted/60 transition-colors sm:col-span-2">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <GraduationCap className="size-5 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">AI 答疑助手</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    打开 AI 面板，随时提问你的学习内容
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setAiPanelChapter(undefined);
                    setAiPanelOpen(true);
                  }}
                >
                  打开 AI 面板
                  <ArrowRight className="ml-1 size-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
