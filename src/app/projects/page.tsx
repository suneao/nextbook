"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  BookOpen,
  FileText,
  GraduationCap,
  Calendar,
  Pencil,
  Trash2,
  FolderKanban,
  MoreHorizontal,
  Download,
  Upload,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Project, defaultProjects } from "@/lib/study-data";
import { useLocale } from "@/lib/i18n";
import {
  saveProject,
  loadAllProjects,
  deleteProjectStorage,
} from "@/lib/storage";
import JSZip from "jszip";
import { useToast } from "@/components/toast-provider";
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

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
];
const ICONS = ["📐", "📊", "🧪", "📚", "💻", "🌍", "🔬", "🎓"];

async function loadProjects(): Promise<Project[]> {
  if (typeof window === "undefined") return defaultProjects;
  return await loadAllProjects();
}
async function saveProjects(projs: Project[]) {
  for (const p of projs) await saveProject(p);
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
  const { t } = useLocale();
  const [name, setName] = useState(edit?.name || "");
  const [desc, setDesc] = useState(edit?.description || "");
  const [color, setColor] = useState(edit?.color || COLORS[0]);
  const [icon, setIcon] = useState(edit?.icon || ICONS[0]);

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
          <DialogTitle>
            {edit ? t("projects.editProject") : t("projects.newProject")}
          </DialogTitle>
          <DialogDescription>
            {edit ? t("projects.editInfo") : t("projects.createInfo")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("projects.projectName")}
            </label>
            <Input
              placeholder={t("projects.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              {t("projects.description")}
            </label>
            <Textarea
              placeholder={t("projects.descPlaceholder")}
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t("projects.color")}</label>
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
            <label className="text-xs font-medium">{t("projects.icon")}</label>
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
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {edit ? t("common.save") : t("projects.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const { t } = useLocale();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProjects().then((data) => {
      setProjects(data);
      setLoaded(true);
    });
  }, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | undefined>();
  const [search, setSearch] = useState("");

  const filtered = projects.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (loaded) saveProjects(projects);
  }, [projects, loaded]);

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

  const handleDelete = async (id: string) => {
    if (!confirm(t("dialog.deleteProject"))) return;
    await deleteProjectStorage(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleExportProject = async (project: Project) => {
    try {
      const zip = new JSZip();
      // Add all files to a files/ folder in the ZIP
      const filesFolder = zip.folder("files");
      const allFiles = [
        ...project.textbooks.map((f) => ({ ...f, _type: "textbook" as const })),
        ...project.exercises.map((f) => ({ ...f, _type: "exercise" as const })),
        ...project.exams.map((f) => ({ ...f, _type: "exam" as const })),
      ];
      // Create a clean project JSON without fileData (files stored separately)
      const cleanProject = {
        ...project,
        textbooks: project.textbooks.map((t) => {
          const { fileData: _fd, ...rest } = t;
          void _fd as unknown;
          void _fd;
          return { ...rest, _fileRef: t.id };
        }),
        exercises: project.exercises.map((e) => {
          const { fileData: _fd, ...rest } = e;
          void _fd as unknown;
          void _fd;
          return { ...rest, _fileRef: e.id };
        }),
        exams: project.exams.map((e) => {
          const { fileData, ...rest } = e;
          return { ...rest, _fileRef: e.id };
        }),
      };
      zip.file("project.json", JSON.stringify(cleanProject, null, 2));
      // Add each file's data as a separate entry
      for (const f of allFiles) {
        if (f.fileData) {
          const ext =
            (f as { fileType?: string; name?: string }).fileType ||
            f.name?.split(".").pop() ||
            "bin";
          if (f.fileData.startsWith("data:")) {
            filesFolder?.file(f.id + "." + ext + ".b64", f.fileData);
          } else {
            filesFolder?.file(f.id + "." + ext + ".txt", f.fileData);
          }
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name || "project"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(
        "Export failed: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    }
  };

  const handleImportProject = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const zip = await JSZip.loadAsync(file);
        const jsonFile = zip.file("project.json");
        if (!jsonFile) {
          toast("Invalid project file: project.json not found", "error");
          return;
        }
        const project: Project = JSON.parse(await jsonFile.async("string"));
        project.id = `proj-${Date.now()}`;
        // Restore fileData from separate files in the ZIP
        const restoreFiles = async (arr: Record<string, unknown>[]) => {
          for (const item of arr) {
            const ref = (item._fileRef as string) || item.id;
            // Search for file with any extension pattern: {id}.{ext}.b64 or {id}.{ext}.txt
            const filesList = Object.keys(zip.files);
            const b64Entry = filesList.find(
              (k) => k.startsWith("files/" + ref + ".") && k.endsWith(".b64"),
            );
            const txtEntry = filesList.find(
              (k) => k.startsWith("files/" + ref + ".") && k.endsWith(".txt"),
            );
            if (b64Entry) {
              item.fileData = await zip.file(b64Entry)!.async("string");
            } else if (txtEntry) {
              item.fileData = await zip.file(txtEntry)!.async("string");
            } else {
              // Fallback to old naming pattern for backwards compatibility
              let fileEntry = zip.file("files/" + ref + ".b64");
              if (fileEntry) {
                item.fileData = await fileEntry.async("string");
              } else {
                fileEntry = zip.file("files/" + ref + ".txt");
                if (fileEntry) {
                  item.fileData = await fileEntry.async("string");
                }
              }
            }
            delete item._fileRef;
          }
        };
        await Promise.all([
          restoreFiles(
            project.textbooks as unknown as Record<string, unknown>[],
          ),
          restoreFiles(
            project.exercises as unknown as Record<string, unknown>[],
          ),
          restoreFiles(project.exams as unknown as Record<string, unknown>[]),
        ]);
        await saveProject(project);
        setProjects((prev) => [project, ...prev]);
        toast(`Project "${project.name}" imported successfully!`, "success");
      } catch (e) {
        toast(
          "Import failed: " + (e instanceof Error ? e.message : String(e)),
          "error",
        );
      }
    };
    input.click();
  };

  return (
    <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-0 sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("projects.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("projects.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9 w-40 text-sm"
                placeholder={t("projects.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleImportProject}>
              <Download className="size-4" />
              {t("projects.import")}
            </Button>
            <Button
              className="gap-2 shadow-sm"
              onClick={() => {
                setEditProject(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("projects.new")}
            </Button>
          </div>
        </div>

        {/* Content */}
        {!loaded ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed bg-muted/20 shadow-none">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <FolderKanban className="size-8 text-muted-foreground/40" />
              </div>
              <h2 className="text-lg font-semibold">{t("projects.empty")}</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                {t("projects.emptyHint")}
              </p>
              <Button
                className="gap-2"
                onClick={() => {
                  setEditProject(undefined);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                {t("projects.create")}
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">没有找到匹配的项目</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filtered.map((project) => {
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
                      <DropdownMenuTrigger className="inline-flex items-center justify-center size-8 rounded-lg bg-background border shadow-sm hover:bg-muted transition-colors">
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditProject(project);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                          {t("projects.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExportProject(project)}
                        >
                          <Upload className="size-4" />
                          {t("projects.export")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(project.id)}
                        >
                          <Trash2 className="size-4" />
                          {t("projects.delete")}
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
        key={editProject?.id || "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        edit={editProject}
      />
    </div>
  );
}
