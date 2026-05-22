"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  FolderKanban,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ArrowRight,
  Layers,
  ListTodo,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useLayout } from "./layout-client";
import { useLocale } from "@/lib/i18n";
import { type Project, defaultProjects } from "@/lib/study-data";
import { loadAllProjects } from "@/lib/storage";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const DEFAULT_TODOS: Todo[] = [];
const TODOS_KEY = "nextbook-todos";

async function loadFromIndexedDB() {
  if (typeof window === "undefined") return defaultProjects;
  return (await loadAllProjects()) || defaultProjects;
}

function projectProgress(p: Project) {
  let total = 0,
    done = 0;
  for (const ch of p.chapters) {
    for (const sc of ch.subChapters) {
      total++;
      if (sc.completed) done++;
    }
  }
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export default function DashboardPage() {
  const { t } = useLocale();
  const { setAiPanelOpen } = useLayout();
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [todos, setTodos] = useState<Todo[]>(DEFAULT_TODOS);

  useEffect(() => {
    const raw = localStorage.getItem(TODOS_KEY);
    if (raw) setTodos(JSON.parse(raw));
  }, []);
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    loadFromIndexedDB().then((data) => {
      setProjects(data || defaultProjects);
      setPageLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
  }, [todos]);

  const stats = useMemo(() => {
    let ch = 0,
      done = 0;
    for (const p of projects) {
      ch += p.chapters.length;
      for (const c of p.chapters)
        for (const s of c.subChapters) {
          if (s.completed) done++;
        }
    }
    return {
      projects: projects.length,
      chapters: ch,
      done,
      total: projects.reduce(
        (a, p) => a + p.chapters.reduce((b, c) => b + c.subChapters.length, 0),
        0,
      ),
      pct: projects.length
        ? Math.round(
            (projects.reduce(
              (a, p) =>
                a +
                p.chapters.reduce(
                  (b, c) => b + c.subChapters.filter((s) => s.completed).length,
                  0,
                ),
              0,
            ) /
              Math.max(
                1,
                projects.reduce(
                  (a, p) =>
                    a +
                    p.chapters.reduce((b, c) => b + c.subChapters.length, 0),
                  0,
                ),
              )) *
              100,
          )
        : 0,
    };
  }, [projects]);

  const doneTodos = todos.filter((t) => t.completed).length;

  const addTodo = () => {
    const tx = newTodo.trim();
    if (!tx) return;
    setTodos((p) => [
      ...p,
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        text: tx,
        completed: false,
      },
    ]);
    setNewTodo("");
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto relative pb-16 md:pb-0">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl animate-float [animation-delay:5s]" />
        <div className="absolute top-1/3 left-1/2 w-1/3 h-1/3 bg-gradient-to-tr from-amber-500/8 via-pink-500/5 to-transparent rounded-full blur-3xl animate-float [animation-delay:10s]" />
      </div>
      {/* Content */}
      <div className="relative z-10">
        {!pageLoaded ? (
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            <div className="h-10 w-56 bg-muted rounded-xl animate-pulse" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-muted rounded-2xl animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-3 h-64 bg-muted rounded-2xl animate-pulse" />
              <div className="col-span-2 h-64 bg-muted rounded-2xl animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-8 space-y-6 md:space-y-8">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-violet-500/5 dark:from-primary/10 dark:via-primary/15 dark:to-violet-500/10 p-6 md:p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-3xl" />
              <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="size-4 text-primary" />
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">
                      {new Date().toLocaleDateString(
                        t("settings.language") === "en-US" ? "en-US" : "zh-CN",
                        { weekday: "long", month: "long", day: "numeric" },
                      )}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {t("nav.dashboard")}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("dashboard.welcome")}
                  </p>
                </div>
                <Button
                  className="gap-2 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-shadow"
                  onClick={() => setAiPanelOpen(true)}
                >
                  <Sparkles className="size-4" />
                  {t("dashboard.aiChat")}
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  icon: FolderKanban,
                  val: stats.projects,
                  sub: t("dashboard.units.projects"),
                  color: "#3b82f6",
                  gradient: "from-blue-500/10 to-blue-600/5",
                },
                {
                  icon: Layers,
                  val: stats.chapters,
                  sub: t("dashboard.units.chapters"),
                  color: "#8b5cf6",
                  gradient: "from-violet-500/10 to-violet-600/5",
                },
                {
                  icon: CheckCircle2,
                  val: `${stats.done}/${stats.total}`,
                  sub: t("dashboard.units.completed"),
                  color: "#10b981",
                  gradient: "from-emerald-500/10 to-emerald-600/5",
                },
                {
                  icon: TrendingUp,
                  val: `${stats.pct}%`,
                  sub: t("dashboard.units.section"),
                  color: "#f59e0b",
                  gradient: "from-amber-500/10 to-amber-600/5",
                },
              ].map((s, i) => (
                <Card
                  key={s.sub}
                  className="group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                  />
                  <CardContent
                    className={`relative p-4 ${i === 3 ? "flex flex-col gap-2" : "flex items-center gap-4"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: s.color + "14" }}
                      >
                        <s.icon className="size-5" style={{ color: s.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-bold tabular-nums">
                          {s.val}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                      </div>
                    </div>
                    {i === 3 && (
                      <Progress
                        value={stats.pct}
                        className="h-1.5 rounded-full"
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Two columns */}
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Projects */}
              <section className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" />
                    {t("dashboard.recentProjects")}
                  </h2>
                  <Link href="/projects">
                    <Button variant="ghost" size="sm" className="group">
                      {t("dashboard.viewAll")}
                      <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.length === 0 && (
                    <Card className="sm:col-span-2 border-dashed bg-muted/20 shadow-none">
                      <CardContent className="flex flex-col items-center py-12 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mb-3">
                          <FolderKanban className="size-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t("dashboard.noProjects")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("dashboard.createFirst")}
                        </p>
                        <Link href="/projects" className="mt-4">
                          <Button size="sm" className="gap-2">
                            <Plus className="size-4" />
                            {t("projects.create")}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}
                  {projects.slice(0, 4).map((p) => {
                    const { pct, done, total } = projectProgress(p);
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`}>
                        <Card
                          className="group h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border-l-[3px] overflow-hidden"
                          style={{ borderLeftColor: p.color }}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
                                style={{ backgroundColor: p.color + "14" }}
                              >
                                {p.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                  {p.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {p.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex-1">
                                {done}/{total} {t("dashboard.units.section")}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[0.65rem] h-5"
                              >
                                {p.chapters.length}
                                {t("dashboard.units.chapter")}
                              </Badge>
                              <span className="font-medium tabular-nums">
                                {pct}%
                              </span>
                            </div>
                            <Progress
                              value={pct}
                              className="h-1.5 rounded-full"
                            />
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  {[
                    {
                      icon: Plus,
                      title: t("dashboard.newProject"),
                      desc: t("dashboard.uploadTextbook"),
                      href: "/projects",
                    },
                    {
                      icon: BookOpen,
                      title: t("dashboard.browseProjects"),
                      desc: t("dashboard.viewAllProjects"),
                      href: "/projects",
                    },
                  ].map((a) => (
                    <Link key={a.title} href={a.href}>
                      <Card className="border-dashed bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer shadow-none group">
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background group-hover:bg-primary/10 transition-colors">
                            <a.icon className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.desc}
                            </p>
                          </div>
                          <ArrowRight className="size-4 text-muted-foreground/50 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Todos */}
              <section className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ListTodo className="size-4 text-muted-foreground" />
                    {t("dashboard.todos")}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {doneTodos}/{todos.length}
                  </Badge>
                </div>
                <Card className="shadow-sm">
                  <CardContent className="p-4 space-y-1">
                    {todos.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {t("dashboard.noTodos")}
                      </p>
                    )}
                    {todos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center gap-2.5 py-1.5 group rounded-md px-1 -mx-1 hover:bg-muted/30 transition-colors"
                      >
                        <button
                          onClick={() =>
                            setTodos((p) =>
                              p.map((x) =>
                                x.id === todo.id
                                  ? { ...x, completed: !x.completed }
                                  : x,
                              ),
                            )
                          }
                          className="shrink-0"
                        >
                          {todo.completed ? (
                            <CheckCircle2 className="size-5 text-emerald-500" />
                          ) : (
                            <Circle className="size-5 text-muted-foreground/60" />
                          )}
                        </button>
                        <span
                          className={`flex-1 text-sm truncate ${todo.completed ? "line-through text-muted-foreground/60" : ""}`}
                        >
                          {todo.text}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={() =>
                            setTodos((p) => p.filter((x) => x.id !== todo.id))
                          }
                        >
                          <Trash2 className="size-3.5 text-destructive/70" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-3">
                      <Input
                        className="h-9 text-sm"
                        placeholder="添加待办..."
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTodo()}
                      />
                      <Button
                        size="sm"
                        className="h-9 shrink-0"
                        onClick={addTodo}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
