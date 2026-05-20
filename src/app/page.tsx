"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  FolderKanban,
  CheckCircle2,
  Circle,
  BarChart3,
  Plus,
  Trash2,
  ArrowRight,
  Layers,
  ListTodo,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  return await loadAllProjects();
}

function projectProgress(p: Project) {
  let done = 0,
    total = 0;
  for (const ch of p.chapters)
    for (const sc of ch.subChapters) {
      total++;
      if (sc.completed) done++;
    }
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export default function DashboardPage() {
  const { t } = useLocale();
  const { setAiPanelOpen } = useLayout();
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [todos, setTodos] = useState<Todo[]>(DEFAULT_TODOS);

  useEffect(() => {
    const raw = localStorage.getItem(TODOS_KEY);
    if (raw) setTodos(JSON.parse(raw)); // eslint-disable-line react-hooks/set-state-in-effect
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
      done = 0,
      total = 0;
    for (const p of projects) {
      ch += p.chapters.length;
      for (const c of p.chapters)
        for (const sc of c.subChapters) {
          total++;
          if (sc.completed) done++;
        }
    }
    return {
      projects: projects.length,
      chapters: ch,
      done,
      total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [projects]);

  const doneTodos = todos.filter((t) => t.completed).length;

  const addTodo = () => {
    const t = newTodo.trim();
    if (!t) return;
    setTodos((p) => [
      ...p,
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        text: t,
        completed: false,
      },
    ]);
    setNewTodo("");
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-gradient-to-b from-background to-muted/20">
      {!pageLoaded ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-8 space-y-8">
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-10 py-8 space-y-8">
          {/* Welcome */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {t("nav.dashboard")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dashboard.welcome")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shadow-sm"
              onClick={() => setAiPanelOpen(true)}
            >
              <Sparkles className="size-4 text-violet-500" />
              {t("dashboard.aiChat")}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                icon: FolderKanban,
                val: stats.projects,
                sub: t("dashboard.units.projects"),

                bg: "bg-blue-500/10 dark:bg-blue-400/10",
                icn: "text-blue-600 dark:text-blue-400",
              },
              {
                icon: Layers,
                val: stats.chapters,
                sub: t("dashboard.units.chapters"),

                bg: "bg-violet-500/10 dark:bg-violet-400/10",
                icn: "text-violet-600 dark:text-violet-400",
              },
              {
                icon: CheckCircle2,
                val: `${stats.done}/${stats.total}`,
                sub: t("dashboard.units.completed"),

                bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
                icn: "text-emerald-600 dark:text-emerald-400",
              },
            ].map((s) => (
              <Card
                key={s.sub}
                className="overflow-hidden border-none shadow-sm"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${s.bg}`}
                  >
                    <s.icon className={`size-5 ${s.icn}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tabular-nums">{s.val}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardContent className="flex flex-col justify-center gap-2.5 p-4 h-full">
                <div className="flex items-center justify-between">
                  <BarChart3 className="size-4 text-orange-500" />
                  <span className="text-xl font-bold tabular-nums">
                    {stats.pct}%
                  </span>
                </div>
                <Progress value={stats.pct} className="h-2.5 rounded-full" />
              </CardContent>
            </Card>
          </div>

          {/* Two columns */}
          <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-5">
            {/* Projects */}
            <section className="lg:col-span-3 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {t("dashboard.recentProjects")}
                </h2>
                <Link href="/projects">
                  <Button variant="ghost" size="sm">
                    {t("dashboard.viewAll")}
                    <ArrowRight className="ml-1 size-4" />
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
                {projects.map((p) => {
                  const { pct, done, total } = projectProgress(p);
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <Card
                        className="group h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer border-l-[3px] overflow-hidden"
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
                    <Card className="border-dashed bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer shadow-none">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background">
                          <a.icon className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.desc}
                          </p>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground/50 shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            {/* Todos */}
            <section className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ListTodo className="size-5" />
                  {t("dashboard.todos")}
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {doneTodos}/{todos.length}
                </Badge>
              </div>
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-1">
                  {todos.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
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
                            p.map((t) =>
                              t.id === todo.id
                                ? { ...t, completed: !t.completed }
                                : t,
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
                          setTodos((p) => p.filter((t) => t.id !== todo.id))
                        }
                      >
                        <Trash2 className="size-3.5 text-destructive/70" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
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
  );
}
