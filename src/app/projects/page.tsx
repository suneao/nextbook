"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  BookOpen,
  FileText,
  GraduationCap,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Project, defaultProjects } from "@/lib/study-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Constants ──────────────────────────────────────────────────────────

const STORAGE_KEY = "nextbook-projects";

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
];

const PRESET_ICONS = ["📐", "📊", "🧪", "📚", "💻", "🌍", "🔬", "🎓"];

// ── Helpers ────────────────────────────────────────────────────────────

function loadProjects(): Project[] {
  if (typeof window === "undefined") return defaultProjects;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Project[];
  } catch {
    /* ignore */
  }
  saveProjects(defaultProjects);
  return defaultProjects;
}

function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function countSubChapters(project: Project): {
  total: number;
  completed: number;
} {
  let total = 0;
  let completed = 0;
  for (const ch of project.chapters) {
    for (const sc of ch.subChapters) {
      total++;
      if (sc.completed) completed++;
    }
  }
  return { total, completed };
}

// ── New Project Dialog ─────────────────────────────────────────────────

function NewProjectDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (project: Project) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState(PRESET_ICONS[0]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const project: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
      createdAt: new Date().toISOString(),
      textbooks: [],
      exercises: [],
      exams: [],
      chapters: [],
    };
    onSubmit(project);
    setName("");
    setDescription("");
    setColor(PRESET_COLORS[0]);
    setIcon(PRESET_ICONS[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>
            创建一个新的学习项目，管理你的教材、习题和考试内容。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              项目名称
            </label>
            <Input
              placeholder="例如：高等数学"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">描述</label>
            <Textarea
              placeholder="简要描述这个项目..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {/* Color picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">颜色</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "size-7 rounded-full border-2 transition-all",
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          {/* Icon picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">图标</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "size-8 flex items-center justify-center rounded-md text-lg border transition-all",
                    icon === i
                      ? "border-foreground bg-muted scale-110"
                      : "border-transparent hover:bg-muted",
                  )}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            创建项目
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Project Card ───────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const { total, completed } = countSubChapters(project);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Link href={`/projects/${project.id}`} className="relative block">
      <Card className="group cursor-pointer transition-all hover:ring-2 hover:ring-primary/30 overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: project.color }}
        />
        <CardHeader className="pl-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{project.icon}</span>
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate text-lg">{project.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardHeader>
        <CardContent className="pl-5 space-y-3">
          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5" />
              {project.textbooks.length} 本教材
            </span>
            <span className="flex items-center gap-1">
              <FileText className="size-3.5" />
              {project.exercises.length} 本习题
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="size-3.5" />
              {project.exams.length} 套试卷
            </span>
          </div>
          {/* Progress */}
          {total > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Progress value={pct} />
              </div>
              <Badge variant="secondary" className="shrink-0">
                {pct}%
              </Badge>
            </div>
          )}
          {/* Date */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {new Date(project.createdAt).toLocaleDateString("zh-CN")}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Empty State ────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-4">📚</div>
      <h2 className="text-lg font-semibold mb-2">还没有项目</h2>
      <p className="text-sm text-muted-foreground mb-6">
        点击上方按钮创建第一个项目
      </p>
      <Button onClick={onCreate}>
        <Plus className="size-4" />
        新建项目
      </Button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const handleCreate = useCallback((project: Project) => {
    setProjects((prev) => [project, ...prev]);
  }, []);

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">项目管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            管理你的学习项目
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          新建项目
        </Button>
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <EmptyState onCreate={() => setDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {/* New project dialog */}
      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
