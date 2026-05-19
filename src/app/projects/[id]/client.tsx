"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  MessageCircle,
  X,
  FileQuestion,
  Upload,
  FileText,
  GraduationCap,
  Trash2,
  File,
  Sparkles,
  Loader2,
  Plus,
  Pencil,
  Check,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Project,
  type Chapter,
  type SubChapter,
  type Textbook,
  type ExercisePDF,
  type ExamPDF,
  defaultProjects,
} from "@/lib/study-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { AIChatPanel } from "@/components/ai-chat-panel";
import { Markdown } from "@/components/markdown";
import { extractTextFromPDF } from "@/lib/pdf-service";
import { analyzeChapters, extractKnowledgePoints } from "@/lib/chapter-ai";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getModelConfig } from "@/lib/ai-service";

const STORAGE_KEY = "nextbook-projects";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function loadProjects(): Project[] {
  if (typeof window === "undefined") return defaultProjects;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Project[];
  } catch {
    /* ignore */
  }
  return defaultProjects;
}

function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error("Failed to save projects (file too large?):", e);
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProjectDetailClient() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [selectedSubChapterId, setSelectedSubChapterId] = useState<
    string | null
  >(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [addingSubToChapterId, setAddingSubToChapterId] = useState<
    string | null
  >(null);
  const [newSubChapterTitle, setNewSubChapterTitle] = useState("");

  const textbookInputRef = useRef<HTMLInputElement>(null);
  const exerciseInputRef = useRef<HTMLInputElement>(null);
  const examInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const projects = loadProjects();
    const found = projects.find((p) => p.id === projectId) ?? null;
    const firstScId =
      found &&
      found.chapters.length > 0 &&
      found.chapters[0].subChapters.length > 0
        ? found.chapters[0].subChapters[0].id
        : null;
    startTransition(() => {
      setProject(found);
      setLoaded(true);
      if (firstScId) setSelectedSubChapterId(firstScId);
    });
  }, [projectId]);

  const updateProject = useCallback((updated: Project) => {
    setProject(updated);
    const allProjects = loadProjects();
    const idx = allProjects.findIndex((p) => p.id === updated.id);
    if (idx !== -1) {
      allProjects[idx] = updated;
      saveProjects(allProjects);
    }
  }, []);

  const toggleComplete = useCallback(
    (subChapterId: string) => {
      if (!project) return;
      updateProject({
        ...project,
        chapters: project.chapters.map((ch) => ({
          ...ch,
          subChapters: ch.subChapters.map((sc) =>
            sc.id === subChapterId ? { ...sc, completed: !sc.completed } : sc,
          ),
        })),
      });
    },
    [project, updateProject],
  );

  const handleUpdateSubChapter = useCallback(
    (updated: SubChapter) => {
      if (!project) return;
      updateProject({
        ...project,
        chapters: project.chapters.map((ch) => ({
          ...ch,
          subChapters: ch.subChapters.map((sc) =>
            sc.id === updated.id ? updated : sc,
          ),
        })),
      });
    },
    [project, updateProject],
  );

  const handleFileUpload = useCallback(
    async (type: "textbook" | "exercise" | "exam", file: File) => {
      if (!project) return;
      if (file.size > MAX_FILE_SIZE) {
        alert(`文件过大（最大 50MB）：${file.name}`);
        return;
      }
      setUploading(true);
      try {
        const base64 = await readFileAsBase64(file);
        const newItem = {
          id: `${type}-${Date.now()}`,
          name: file.name,
          fileUrl: "#",
          fileData: base64,
          ...(type === "textbook" ? { totalPages: 0 } : {}),
        };

        const updated = { ...project };
        if (type === "textbook") {
          updated.textbooks = [...updated.textbooks, newItem as Textbook];
        } else if (type === "exercise") {
          updated.exercises = [...updated.exercises, newItem as ExercisePDF];
        } else {
          updated.exams = [
            ...updated.exams,
            { ...newItem, year: "" } as ExamPDF,
          ];
        }
        updateProject(updated);
      } catch (e) {
        console.error("Upload failed:", e);
        alert("上传失败，请重试");
      } finally {
        setUploading(false);
      }
    },
    [project, updateProject],
  );

  const handleRemoveFile = useCallback(
    (type: "textbook" | "exercise" | "exam", id: string) => {
      if (!project) return;
      const updated = { ...project };
      if (type === "textbook") {
        updated.textbooks = updated.textbooks.filter((f) => f.id !== id);
      } else if (type === "exercise") {
        updated.exercises = updated.exercises.filter((f) => f.id !== id);
      } else {
        updated.exams = updated.exams.filter((f) => f.id !== id);
      }
      updateProject(updated);
    },
    [project, updateProject],
  );

  const handleAIAnalyze = useCallback(async () => {
    if (!project || project.textbooks.length === 0) {
      alert("请先上传教材PDF");
      return;
    }
    const settings = JSON.parse(
      localStorage.getItem("nextbook-settings") || "{}",
    );
    const chapterModelId = settings.chapterModel || "gpt-4o";
    const chapterModel = getModelConfig(chapterModelId);
    if (!chapterModel?.apiKey) {
      alert("请先在设置中配置章节划分模型的 API Key");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setAnalyzing(true);
    setAnalysisStatus("正在提取PDF文本...");
    try {
      const tb = project.textbooks[0];
      if (!tb.fileData) {
        alert("PDF数据未找到");
        return;
      }
      const pdfText = await extractTextFromPDF(tb.fileData);
      if (controller.signal.aborted) return;
      setAnalysisStatus("AI正在分析章节结构...");
      const chapters = await analyzeChapters(pdfText, chapterModelId);
      if (controller.signal.aborted) return;
      updateProject({ ...project, chapters });
      for (let ci = 0; ci < chapters.length; ci++) {
        for (let si = 0; si < chapters[ci].subChapters.length; si++) {
          if (controller.signal.aborted) {
            setAnalysisStatus("已停止");
            return;
          }
          const sc = chapters[ci].subChapters[si];
          setAnalysisStatus(
            "正在提取 (" +
              (ci + 1) +
              "/" +
              chapters.length +
              "章): " +
              sc.title +
              "...",
          );
          try {
            const knowledge = await extractKnowledgePoints(
              pdfText,
              sc.title,
              chapterModelId,
            );
            if (controller.signal.aborted) return;
            sc.knowledgePoints = knowledge.knowledgePoints;
            sc.examples = knowledge.examples;
            sc.exercises = knowledge.exercises;
            updateProject({ ...project, chapters: [...chapters] });
          } catch {
            /* continue */
          }
        }
      }
      setAnalysisStatus("");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : String(e);
      alert("分析失败: " + msg);
    } finally {
      setAnalyzing(false);
      setAnalysisStatus("");
      abortRef.current = null;
    }
  }, [project, updateProject]);

  const handleStopAnalysis = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleRegenerateChapter = useCallback(
    async (chapterId: string) => {
      if (!project || project.textbooks.length === 0) return;
      const settings = JSON.parse(
        localStorage.getItem("nextbook-settings") || "{}",
      );
      const modelId = settings.chapterModel || "gpt-4o";
      const model = getModelConfig(modelId);
      if (!model?.apiKey) {
        alert("请先配置API Key");
        return;
      }

      const tb = project.textbooks[0];
      if (!tb.fileData) return;

      const chapter = project.chapters.find((ch) => ch.id === chapterId);
      if (!chapter) return;

      setAnalyzing(true);
      try {
        const pdfText = await extractTextFromPDF(tb.fileData);
        for (const sc of chapter.subChapters) {
          setAnalysisStatus("重新生成: " + sc.title + "...");
          try {
            const knowledge = await extractKnowledgePoints(
              pdfText,
              sc.title,
              modelId,
            );
            sc.knowledgePoints = knowledge.knowledgePoints;
            sc.examples = knowledge.examples;
            sc.exercises = knowledge.exercises;
          } catch {}
        }
        updateProject({ ...project, chapters: [...project.chapters] });
      } catch (e) {
        alert("重新生成失败: " + (e instanceof Error ? e.message : String(e)));
      } finally {
        setAnalyzing(false);
        setAnalysisStatus("");
      }
    },
    [project, updateProject],
  );

  const handleAddChapter = () => {
    if (!newChapterTitle.trim() || !project) return;
    const newCh: Chapter = {
      id: `ch-${Date.now()}`,
      title: newChapterTitle.trim(),
      order: project.chapters.length,
      type: "custom",
      subChapters: [],
    };
    updateProject({ ...project, chapters: [...project.chapters, newCh] });
    setNewChapterTitle("");
    setAddingChapter(false);
  };

  const handleAddSubChapter = (chapterId: string) => {
    if (!newSubChapterTitle.trim() || !project) return;
    updateProject({
      ...project,
      chapters: project.chapters.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              subChapters: [
                ...ch.subChapters,
                {
                  id: `sc-${Date.now()}`,
                  title: newSubChapterTitle.trim(),
                  order: ch.subChapters.length,
                  completed: false,
                  knowledgePoints: [],
                  examples: [],
                  exercises: [],
                },
              ],
            }
          : ch,
      ),
    });
    setNewSubChapterTitle("");
    setAddingSubToChapterId(null);
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!project || !confirm("确定删除此章节？")) return;
    updateProject({
      ...project,
      chapters: project.chapters.filter((ch) => ch.id !== chapterId),
    });
  };

  const selectedSubChapter =
    project?.chapters
      .flatMap((ch) => ch.subChapters)
      .find((sc) => sc.id === selectedSubChapterId) ?? null;
  const selectedChapter =
    project?.chapters.find((ch) =>
      ch.subChapters.some((sc) => sc.id === selectedSubChapterId),
    ) ?? null;

  if (!loaded) return null;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-lg font-semibold mb-2">项目未找到</h2>
        <p className="text-sm text-muted-foreground mb-6">
          该学习项目不存在或已被删除
        </p>
        <Button onClick={() => router.push("/projects")}>
          <ChevronLeft className="size-4" />
          返回项目列表
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Hidden file inputs */}
      <input
        ref={textbookInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload("textbook", f);
          e.target.value = "";
        }}
      />
      <input
        ref={exerciseInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload("exercise", f);
          e.target.value = "";
        }}
      />
      <input
        ref={examInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload("exam", f);
          e.target.value = "";
        }}
      />

      {/* Left Sidebar */}
      <div
        className={cn(
          "border-r bg-card/30 transition-all duration-300 flex flex-col shrink-0",
          sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden border-r-0",
        )}
      >
        <div className="shrink-0 px-3 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg">{project.icon}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">{project.name}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-3">
            {/* Chapter Tree */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  章节目录
                </p>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 hover:bg-muted"
                    onClick={() => setAddingChapter(true)}
                    title="添加章节"
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 hover:bg-muted text-violet-500"
                    onClick={handleAIAnalyze}
                    disabled={analyzing || project.textbooks.length === 0}
                    title="AI分析教材分章"
                  >
                    {analyzing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
              {analyzing && analysisStatus && (
                <p className="text-xs text-violet-500 px-2 py-1">
                  {analysisStatus}
                </p>
              )}
              {addingChapter && (
                <div className="flex gap-1 px-2 py-1">
                  <Input
                    className="h-6 text-xs"
                    placeholder="章节标题..."
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddChapter()}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={handleAddChapter}
                  >
                    <CheckCircle2 className="size-3" />
                  </Button>
                </div>
              )}
              <div className="space-y-0.5">
                {project.chapters.map((chapter) => (
                  <ChapterTreeNode
                    key={chapter.id}
                    chapter={chapter}
                    selectedSubChapterId={selectedSubChapterId}
                    onSelect={(scId) => setSelectedSubChapterId(scId)}
                    addingSubToChapterId={addingSubToChapterId}
                    newSubChapterTitle={newSubChapterTitle}
                    onNewSubChapterTitleChange={setNewSubChapterTitle}
                    onAddSubChapter={(chId) => setAddingSubToChapterId(chId)}
                    onConfirmAddSubChapter={handleAddSubChapter}
                    onCancelAddSubChapter={() => {
                      setAddingSubToChapterId(null);
                      setNewSubChapterTitle("");
                    }}
                    onDeleteChapter={handleDeleteChapter}
                    onRegenerateChapter={handleRegenerateChapter}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Materials Section */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                学习材料
              </p>

              {/* Textbooks */}
              <MaterialSection
                icon={BookOpen}
                label="教材"
                color="text-blue-500"
                files={project.textbooks}
                onUpload={() => textbookInputRef.current?.click()}
                onRemove={(id) => handleRemoveFile("textbook", id)}
                uploading={uploading}
              />

              {/* Exercises */}
              <MaterialSection
                icon={FileText}
                label="习题"
                color="text-amber-500"
                files={project.exercises}
                onUpload={() => exerciseInputRef.current?.click()}
                onRemove={(id) => handleRemoveFile("exercise", id)}
                uploading={uploading}
              />

              {/* Exams */}
              <MaterialSection
                icon={GraduationCap}
                label="试卷"
                color="text-violet-500"
                files={project.exams}
                onUpload={() => examInputRef.current?.click()}
                onRemove={(id) => handleRemoveFile("exam", id)}
                uploading={uploading}
              />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Center: Study Viewer */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b bg-card/30">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setSidebarOpen(true)}
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/projects")}
          >
            <ChevronLeft className="size-4" />
            返回
          </Button>
          <Separator orientation="vertical" className="h-4" />
          {selectedChapter && (
            <span className="text-xs text-muted-foreground">
              {selectedChapter.title}
            </span>
          )}
        </div>
        <ScrollArea className="flex-1 h-full">
          {selectedSubChapter ? (
            <StudyUnitViewer
              subChapter={selectedSubChapter}
              onToggleComplete={toggleComplete}
              onUpdate={handleUpdateSubChapter}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BookOpen className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                从左侧目录树选择一个章节开始学习
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                也可以在下方学习材料区域上传教材PDF
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      <AIChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        chapterTitle={selectedSubChapter?.title}
      />
      {!chatOpen && (
        <button
          className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/80 transition-colors"
          onClick={() => setChatOpen(true)}
          aria-label="打开 AI 答疑"
        >
          <MessageCircle className="size-5" />
        </button>
      )}
    </div>
  );
}

// ── Material Section ────────────────────────────────────────────────────

function MaterialSection({
  icon: Icon,
  label,
  color,
  files,
  onUpload,
  onRemove,
  uploading,
}: {
  icon: typeof BookOpen;
  label: string;
  color: string;
  files: (Textbook | ExercisePDF | ExamPDF)[];
  onUpload: () => void;
  onRemove: (id: string) => void;
  uploading: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Icon className={cn("size-4", color)} />
          {label}
          {files.length > 0 && (
            <Badge variant="secondary" className="text-xs h-4 px-1">
              {files.length}
            </Badge>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 hover:bg-muted"
          onClick={onUpload}
          disabled={uploading}
          title={`上传${label}`}
          aria-label={`上传${label}`}
        >
          <Upload className="size-4" />
        </Button>
      </div>
      {files.length > 0 ? (
        <div className="space-y-0.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 group"
            >
              <File className="size-4 text-muted-foreground shrink-0" />
              <span
                className="truncate flex-1 cursor-pointer hover:text-primary"
                onClick={() => {
                  if ((f as any).fileData) {
                    const w = window.open("", "_blank");
                    if (w)
                      w.document.write(
                        '<iframe src="' +
                          (f as any).fileData +
                          '" width="100%" height="100%" style="border:none"></iframe>',
                      );
                  }
                }}
                title="点击预览"
              >
                {f.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => onRemove(f.id)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground px-2">暂无{label}</p>
      )}
    </div>
  );
}

// ── Chapter Tree Node ───────────────────────────────────────────────────

function ChapterTreeNode({
  chapter,
  selectedSubChapterId,
  onSelect,
  addingSubToChapterId,
  newSubChapterTitle,
  onNewSubChapterTitleChange,
  onAddSubChapter,
  onConfirmAddSubChapter,
  onCancelAddSubChapter,
  onDeleteChapter,
  onRegenerateChapter,
}: {
  chapter: Chapter;
  selectedSubChapterId: string | null;
  onSelect: (scId: string) => void;
  addingSubToChapterId: string | null;
  newSubChapterTitle: string;
  onNewSubChapterTitleChange: (v: string) => void;
  onAddSubChapter: (chId: string) => void;
  onConfirmAddSubChapter: (chId: string) => void;
  onCancelAddSubChapter: () => void;
  onDeleteChapter: (chId: string) => void;
  onRegenerateChapter?: (chId: string) => void;
}) {
  const completedCount = chapter.subChapters.filter(
    (sc) => sc.completed,
  ).length;
  const totalCount = chapter.subChapters.length;

  const isNative = chapter.type === "native";

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center gap-0.5 rounded-md px-2 py-1 group hover:bg-muted/50 transition-colors">
        <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 text-sm font-medium min-w-0">
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          <span
            className="shrink-0"
            title={isNative ? "教材原生章节" : "自定义章节"}
          >
            {isNative ? "📖" : "✏️"}
          </span>
          <span className="flex-1 text-left truncate">{chapter.title}</span>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs h-4 px-1 font-normal",
              isNative
                ? "border-blue-300 text-blue-600"
                : "border-gray-300 text-gray-500",
            )}
          >
            {isNative ? "原生" : "自定义"}
          </Badge>
        </CollapsibleTrigger>
        {isNative && onRegenerateChapter && (
          <button
            type="button"
            className="size-5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onRegenerateChapter(chapter.id);
            }}
            title="重新生成"
          >
            <RotateCw className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          className="size-5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onAddSubChapter(chapter.id);
          }}
          title="添加小节"
        >
          <Plus className="size-3.5" />
        </button>
        <button
          type="button"
          className="size-5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteChapter(chapter.id);
          }}
          title="删除章节"
        >
          <Trash2 className="size-3.5 text-destructive" />
        </button>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">
            {completedCount}/{totalCount}
          </span>
        )}
      </div>
      <CollapsibleContent>
        <div className="ml-4 space-y-0.5 mt-0.5">
          {chapter.subChapters.map((sc) => (
            <button
              key={sc.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                selectedSubChapterId === sc.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/50 text-muted-foreground",
              )}
              onClick={() => onSelect(sc.id)}
            >
              {sc.completed ? (
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="size-4 shrink-0" />
              )}
              <span className="truncate">{sc.title}</span>
              {sc.completed && (
                <Badge
                  variant="outline"
                  className="ml-auto shrink-0 text-xs h-5 px-1"
                >
                  已完成
                </Badge>
              )}
            </button>
          ))}
          {addingSubToChapterId === chapter.id && (
            <div className="flex gap-1 ml-4 mt-1">
              <Input
                className="h-6 text-xs"
                placeholder="小节标题..."
                value={newSubChapterTitle}
                onChange={(e) => onNewSubChapterTitleChange(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && onConfirmAddSubChapter(chapter.id)
                }
                autoFocus
              />
              <Button
                size="icon"
                className="size-6 shrink-0"
                onClick={() => onConfirmAddSubChapter(chapter.id)}
              >
                <CheckCircle2 className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={onCancelAddSubChapter}
              >
                <X className="size-3" />
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Study Unit Viewer ───────────────────────────────────────────────────

function StudyUnitViewer({
  subChapter,
  onToggleComplete,
  onUpdate,
}: {
  subChapter: SubChapter;
  onToggleComplete: (id: string) => void;
  onUpdate: (updated: SubChapter) => void;
}) {
  const [editingKpId, setEditingKpId] = useState<string | null>(null);
  const [editingExampleId, setEditingExampleId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(
    null,
  );

  const [editKpTitle, setEditKpTitle] = useState("");
  const [editKpContent, setEditKpContent] = useState("");
  const [editExampleQuestion, setEditExampleQuestion] = useState("");
  const [editExampleSolution, setEditExampleSolution] = useState("");
  const [editExerciseQuestion, setEditExerciseQuestion] = useState("");
  const [editExerciseSolution, setEditExerciseSolution] = useState("");

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{subChapter.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {subChapter.knowledgePoints.length} 个知识点 ·{" "}
            {subChapter.examples.length} 道例题 · {subChapter.exercises.length}{" "}
            道习题
          </p>
        </div>
        <Button
          variant={subChapter.completed ? "secondary" : "default"}
          size="sm"
          onClick={() => onToggleComplete(subChapter.id)}
          className="shrink-0"
        >
          <CheckCircle2 className="size-5" />
          {subChapter.completed ? "已完成" : "✓ 完成学习"}
        </Button>
      </div>
      <Separator />
      {subChapter.knowledgePoints.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            知识点
          </h2>
          <div className="space-y-6">
            {subChapter.knowledgePoints.map((kp) => (
              <div key={kp.id} className="rounded-lg border bg-card p-5 group">
                {editingKpId === kp.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editKpTitle}
                      onChange={(e) => setEditKpTitle(e.target.value)}
                      placeholder="标题"
                      className="text-sm"
                    />
                    <Textarea
                      value={editKpContent}
                      onChange={(e) => setEditKpContent(e.target.value)}
                      placeholder="内容（支持Markdown和LaTeX公式）"
                      className="text-sm min-h-[120px]"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => {
                          const updated = {
                            ...subChapter,
                            knowledgePoints: subChapter.knowledgePoints.map(
                              (k) =>
                                k.id === kp.id
                                  ? {
                                      ...k,
                                      title: editKpTitle,
                                      content: editKpContent,
                                    }
                                  : k,
                            ),
                          };
                          onUpdate(updated);
                          setEditingKpId(null);
                        }}
                        title="保存"
                      >
                        <Check className="size-3.5 text-emerald-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => setEditingKpId(null)}
                        title="取消"
                      >
                        <X className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold">{kp.title}</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          setEditKpTitle(kp.title);
                          setEditKpContent(kp.content);
                          setEditingKpId(kp.id);
                        }}
                        title="编辑"
                      >
                        <Pencil className="size-3" />
                      </Button>
                    </div>
                    <Markdown content={kp.content} />
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {subChapter.examples.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileQuestion className="size-5 text-amber-500" />
            例题
          </h2>
          <div className="space-y-3">
            {subChapter.examples.map((ex) => (
              <Collapsible key={ex.id}>
                <div className="rounded-md border bg-card p-3 group">
                  {editingExampleId === ex.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editExampleQuestion}
                        onChange={(e) => setEditExampleQuestion(e.target.value)}
                        placeholder="题目"
                        className="text-sm min-h-[60px]"
                      />
                      <Textarea
                        value={editExampleSolution}
                        onChange={(e) => setEditExampleSolution(e.target.value)}
                        placeholder="解答"
                        className="text-sm min-h-[60px]"
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => {
                            const updated = {
                              ...subChapter,
                              examples: subChapter.examples.map((e) =>
                                e.id === ex.id
                                  ? {
                                      ...e,
                                      question: editExampleQuestion,
                                      solution: editExampleSolution,
                                    }
                                  : e,
                              ),
                            };
                            onUpdate(updated);
                            setEditingExampleId(null);
                          }}
                          title="保存"
                        >
                          <Check className="size-3.5 text-emerald-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => setEditingExampleId(null)}
                          title="取消"
                        >
                          <X className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex w-full items-start gap-2 text-left">
                        <CollapsibleTrigger className="flex flex-1 items-start gap-2 group/trigger">
                          <span className="flex-1 text-base font-medium">
                            {ex.question}
                          </span>
                          <ChevronDown className="size-5 text-muted-foreground shrink-0 mt-0.5 transition-transform group-aria-expanded/trigger:rotate-180" />
                        </CollapsibleTrigger>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditExampleQuestion(ex.question);
                            setEditExampleSolution(ex.solution);
                            setEditingExampleId(ex.id);
                          }}
                          title="编辑"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                      <CollapsibleContent>
                        <Separator className="my-2" />
                        <Markdown content={ex.solution} />
                      </CollapsibleContent>
                    </>
                  )}
                </div>
              </Collapsible>
            ))}
          </div>
        </section>
      )}
      {subChapter.exercises.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileQuestion className="size-5 text-emerald-500" />
            课后习题
          </h2>
          <div className="space-y-3">
            {subChapter.exercises.map((ex, idx) => (
              <Collapsible key={ex.id}>
                <div className="rounded-md border bg-card p-3 group">
                  {editingExerciseId === ex.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editExerciseQuestion}
                        onChange={(e) =>
                          setEditExerciseQuestion(e.target.value)
                        }
                        placeholder="题目"
                        className="text-sm min-h-[60px]"
                      />
                      <Textarea
                        value={editExerciseSolution}
                        onChange={(e) =>
                          setEditExerciseSolution(e.target.value)
                        }
                        placeholder="解答"
                        className="text-sm min-h-[60px]"
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => {
                            const updated = {
                              ...subChapter,
                              exercises: subChapter.exercises.map((e) =>
                                e.id === ex.id
                                  ? {
                                      ...e,
                                      question: editExerciseQuestion,
                                      solution: editExerciseSolution,
                                    }
                                  : e,
                              ),
                            };
                            onUpdate(updated);
                            setEditingExerciseId(null);
                          }}
                          title="保存"
                        >
                          <Check className="size-3.5 text-emerald-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => setEditingExerciseId(null)}
                          title="取消"
                        >
                          <X className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex w-full items-start gap-2 text-left">
                        <CollapsibleTrigger className="flex flex-1 items-start gap-2 group/trigger">
                          <span className="text-sm font-medium text-muted-foreground shrink-0 mt-0.5">
                            {idx + 1}.
                          </span>
                          <span className="flex-1 text-base font-medium">
                            {ex.question}
                          </span>
                          <ChevronDown className="size-5 text-muted-foreground shrink-0 mt-0.5 transition-transform group-aria-expanded/trigger:rotate-180" />
                        </CollapsibleTrigger>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditExerciseQuestion(ex.question);
                            setEditExerciseSolution(ex.solution);
                            setEditingExerciseId(ex.id);
                          }}
                          title="编辑"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                      <CollapsibleContent>
                        <Separator className="my-2" />
                        <Markdown content={ex.solution} />
                      </CollapsibleContent>
                    </>
                  )}
                </div>
              </Collapsible>
            ))}
          </div>
        </section>
      )}
      <div className="h-16" />
    </div>
  );
}
