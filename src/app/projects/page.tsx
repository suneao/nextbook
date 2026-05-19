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
  Pencil,
  Trash2,
  Sparkles,
  FolderKanban,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Project, defaultProjects } from "@/lib/study-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "nextbook-projects";
const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
];
const ICONS = ["📐", "📊", "🧪", "📚", "💻", "🌍", "🔬", "🎓"];

function loadProjects(): Project[] {
  if (typeof window === "undefined") return defaultProjects;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultProjects;
  } catch {
    return defaultProjects;
  }
}
function saveProjects(p: Project[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
function countSubChapters(p: Project) {
  let t = 0,
    c = 0;
  for (const ch of p.chapters)
    for (const sc of ch.subChapters) {
      t++;
      if (sc.completed) c++;
    }
  return { total: t, completed: c };
}

function ProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  edit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (p: Project) => void;
  edit?: Project;
}) {
  const [name, setName] = useState(edit?.name || "");
  const [desc, setDesc] = useState(edit?.description || "");
  const [color, setColor] = useState(edit?.color || COLORS[0]);
  const [icon, setIcon] = useState(edit?.icon || ICONS[0]);

  useEffect(() => {
    if (edit) {
      setName(edit.name);
      setDesc(edit.description);
      setColor(edit.color);
      setIcon(edit.icon);
    }
  }, [edit]);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      id: edit?.id || `proj-${Date.now()}`,
      name: name.trim(),
      description: desc.trim(),
      color,
      icon,
      createdAt: edit?.createdAt || new Date().toISOString(),
      textbooks: edit?.textbooks || [],
      exercises: edit?.exercises || [],
      exams: edit?.exams || [],
      chapters: edit?.chapters || [],
    });
    if (!edit) {
      setName("");
      setDesc("");
      setColor(COLORS[0]);
      setIcon(ICONS[0]);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{edit ? "编辑项目" : "新建项目"}</DialogTitle>
          <DialogDescription>
            {edit ? "修改项目信息" : "创建一个新的学习项目"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">项目名称</label>
            <Input
              placeholder="例如：高等数学"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">描述</label>
            <Textarea
              placeholder="简要描述..."
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">颜色</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "size-8 rounded-full border-2 transition-all",
                    color === c
                      ? "border-foreground scale-110 shadow-md"
                      : "border-transparent hover:scale-110",
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">图标</label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "size-9 flex items-center justify-center rounded-lg text-lg border transition-all",
                    icon === i
                      ? "border-foreground bg-muted shadow-sm"
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
          <Button onClick={submit} disabled={!name.trim()}>
            {edit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | undefined>();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const handleCreate = useCallback(
    (p: Project) => {
      if (editProject) {
        setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
        setEditProject(undefined);
      } else {
        setProjects((prev) => [p, ...prev]);
      }
    },
    [editProject],
  );

  const handleDelete = (id: string) => {
    if (!confirm("确定删除此项目？所有数据将被清除。")) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  if (!mounted) return null;

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-10 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              项目管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理你的学习项目
            </p>
          </div>
          <Button
            className="gap-2 shadow-sm"
            onClick={() => {
              setEditProject(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            新建项目
          </Button>
        </div>

        {/* Content */}
        {projects.length === 0 ? (
          <Card className="border-dashed bg-muted/20 shadow-none">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <FolderKanban className="size-8 text-muted-foreground/40" />
              </div>
              <h2 className="text-lg font-semibold">还没有项目</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                创建你的第一个学习项目开始学习
              </p>
              <Button
                className="gap-2"
                onClick={() => {
                  setEditProject(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                创建项目
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => {
              const { total, completed } = countSubChapters(project);
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div key={project.id} className="relative group/card">
                  <Link href={`/projects/${project.id}`}>
                    <Card
                      className="group h-full transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border-l-[4px] overflow-hidden"
                      style={{ borderLeftColor: project.color }}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xl"
                            style={{ backgroundColor: project.color + "14" }}
                          >
                            {project.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {project.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="size-3.5" />
                            {project.textbooks.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="size-3.5" />
                            {project.exercises.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap className="size-3.5" />
                            {project.exams.length}
                          </span>
                          <span className="flex items-center gap-1 ml-auto">
                            <Calendar className="size-3" />
                            {new Date(project.createdAt).toLocaleDateString(
                              "zh-CN",
                            )}
                          </span>
                        </div>
                        {total > 0 && (
                          <div className="flex items-center gap-3">
                            <Progress
                              value={pct}
                              className="h-2 flex-1 rounded-full"
                            />
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                            >
                              {pct}%
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                  {/* Action menu */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                      <span className="inline-flex items-center justify-center size-8 rounded-lg bg-background/80 backdrop-blur shadow-sm hover:bg-muted transition-colors cursor-pointer" onClick={(e) => e.preventDefault()}><MoreHorizontal className="size-4" /></span>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditProject(project);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(project.id)}
                        >
                          <Trash2 className="size-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        edit={editProject}
      />
    </div>
  );
}
