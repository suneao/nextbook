"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n";
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
  RotateCw,
  Check,
  Eye,
  Minus,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Project,
  type Chapter,
  type SubChapter,
  type KnowledgePoint,
  type Example,
  type Exercise,
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
import {} from "@/components/ui/accordion";
import { AIChatPanel } from "@/components/ai-chat-panel";
import { Markdown } from "@/components/markdown";
import { extractTextFromPDF } from "@/lib/pdf-service";
import {
  analyzeChapters,
  extractKnowledgePoints,
  regenerateSubChapter,
} from "@/lib/chapter-ai";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getModelConfig } from "@/lib/ai-service";
import { useToast } from "@/components/toast-provider";
import { registerTaskCallbacks, getTaskCallbacks } from "@/lib/task-callbacks";
import {
  saveProject,
  loadAllProjects,
  deleteProjectStorage,
} from "@/lib/storage";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function isTextFile(name: string) {
  return /\.(txt|md|html|htm)$/i.test(name);
}

async function loadProjects(): Promise<Project[]> {
  if (typeof window === "undefined") return defaultProjects;
  return await loadAllProjects();
}

async function saveProjects(projects: Project[]) {
  for (const p of projects) await saveProject(p);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function dataUrlToBlobUrl(dataUrl: string, fileName?: string): string {
  if (!dataUrl.startsWith("data:")) {
    const ext = (fileName || "").split(".").pop()?.toLowerCase() || "txt";
    const mimeMap: Record<string, string> = {
      md: "text/markdown",
      html: "text/html",
      htm: "text/html",
      txt: "text/plain",
    };
    return URL.createObjectURL(
      new Blob([dataUrl], { type: mimeMap[ext] || "text/plain" }),
    );
  }
  try {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return dataUrl;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const isBase64 = parts[0].includes(";base64");
    let bytes;
    if (isBase64) {
      const binary = atob(parts[1]);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(parts[1]));
    }
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return dataUrl;
  }
}

export default function ProjectDetailClient() {
  const { t } = useLocale();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  type GenTask = {
    id: string;
    title: string;
    progress: string;
    controller: AbortController;
  };

  const [project, setProject] = useState<Project | null>(null);
  const [activeTasks, setActiveTasks] = useState<GenTask[]>([]);
  const [panelMinimized, setPanelMinimized] = useState(true);
  const [panelLeaving, setPanelLeaving] = useState(false);
  const panelTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panelMinimizedRef = useRef(true);
  useEffect(() => {
    panelMinimizedRef.current = panelMinimized;
  }, [panelMinimized]);

  const showPanel = useCallback(() => {
    getTaskCallbacks().closeDropdown?.();
    clearTimeout(panelTimerRef.current);
    setPanelMinimized(false);
    setPanelLeaving(false);
  }, []);
  const hidePanel = useCallback(() => {
    if (panelMinimizedRef.current) return;
    setPanelLeaving(true);
    clearTimeout(panelTimerRef.current);
    panelTimerRef.current = setTimeout(() => {
      setPanelMinimized(true);
      setPanelLeaving(false);
    }, 200);
  }, []);
  const [selectedSubChapterId, setSelectedSubChapterId] = useState<
    string | null
  >(null);
  // Scroll to top when sub-chapter changes
  useEffect(() => {
    document
      .querySelector('[data-slot="scroll-area-viewport"]')
      ?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedSubChapterId]);
  const { toast } = useToast();
  const { setActiveTaskCount, setActiveTaskList } = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<{
    data: string;
    name: string;
    blobUrl?: string;
    isText?: boolean;
  } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, w: 280 });
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close sidebar helper (used on mobile after selection)
  const closeSidebarIfMobile = useCallback(() => {
    if (window.innerWidth < 768) setSidebarWidth(0);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (clientX: number) => {
      const delta = clientX - dragStart.current.mx;
      const maxW = isMobile ? window.innerWidth * 0.9 : 500;
      const w = Math.max(200, Math.min(maxW, dragStart.current.w + delta));
      setSidebarWidth(w);
    };
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const handleEnd = () => setDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, isMobile]);

  const toggleSidebar = () => {
    setSidebarWidth((w) => (w === 0 ? 280 : 0));
  };

  // ── Task management ──────────────────────────────────────────
  const addTask = useCallback((title: string, controller: AbortController) => {
    const id =
      "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const task: GenTask = { id, title, progress: "准备中...", controller };
    setActiveTasks((prev) => [...prev, task]);
    setPanelMinimized(false);
    return id;
  }, []);

  const updateTask = useCallback((id: string, progress: string) => {
    setActiveTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, progress } : t)),
    );
  }, []);

  const removeTask = useCallback((id: string) => {
    setActiveTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const cancelTask = useCallback((id: string) => {
    setActiveTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task) task.controller.abort();
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const stopAllTasks = useCallback(() => {
    setActiveTasks((prev) => {
      for (const t of prev) t.controller.abort();
      return [];
    });
  }, []);

  const analyzing = activeTasks.length > 0;

  // Sync task count and list to toast context
  useEffect(() => {
    setActiveTaskCount(activeTasks.length);
    setActiveTaskList(
      activeTasks.map(({ id, title, progress }) => ({ id, title, progress })),
    );
  }, [activeTasks, setActiveTaskCount, setActiveTaskList]);

  // Register callbacks for NotificationBell
  useEffect(() => {
    registerTaskCallbacks({
      onExpandTasks: showPanel,
      onCancelTask: cancelTask,
      onClosePanel: hidePanel,
      closeDropdown: null,
    });
    return () =>
      registerTaskCallbacks({
        onExpandTasks: () => {},
        onCancelTask: () => {},
        onClosePanel: null,
        closeDropdown: null,
      });
  }, [showPanel, cancelTask, hidePanel]);

  const [uploading, setUploading] = useState(false);
  const [regenScId, setRegenScId] = useState(null);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);

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
    loadProjects().then((projects) => {
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
    });
  }, [projectId]);

  const updateProject = useCallback(async (updated: Project) => {
    setProject(updated);
    await saveProject(updated);
  }, []);
  const handleRegenerateSubChapter = useCallback(
    async (scId: string) => {
      if (!project || project.textbooks.length === 0) return;
      const settings = (() => {
        try {
          return JSON.parse(localStorage.getItem("nextbook-settings") || "{}");
        } catch {
          return {};
        }
      })();
      const modelId = settings.chapterModel || "gpt-4o";
      const language = settings.language || "zh-CN";
      const model = getModelConfig(modelId);
      if (!model?.apiKey) {
        toast("Please configure API Key first", "warning");
        return;
      }
      const validTextbooks = project.textbooks.filter((tb) => tb.fileData);
      if (validTextbooks.length === 0) {
        toast("PDF data not found", "error");
        return;
      }
      setRegenLoading(true);
      try {
        const sc = project.chapters
          .flatMap((ch) => ch.subChapters)
          .find((s) => s.id === scId);
        if (!sc) return;
        const pdfTexts = await Promise.all(
          validTextbooks.map((tb) => extractTextFromPDF(tb.fileData!)),
        );
        const fullText = validTextbooks
          .map((tb, i) => {
            const label =
              language === "en-US"
                ? `Textbook ${i + 1}: ${tb.name}`
                : language === "ja-JP"
                  ? `教科書${i + 1}：${tb.name}`
                  : `教材${i + 1}：${tb.name}`;
            return `\n\n【${label}】\n\n${pdfTexts[i]}`;
          })
          .join("");
        const PAD = 2000;
        let pdfText = fullText;
        if (sc.textStart != null) {
          const start = Math.max(0, sc.textStart - PAD);
          const end =
            sc.textEnd != null && sc.textEnd > sc.textStart
              ? Math.min(fullText.length, sc.textEnd + PAD)
              : Math.min(fullText.length, sc.textStart + 50000);
          pdfText = fullText.slice(start, end);
        } else {
          const skip = Math.floor(fullText.length * 0.05);
          pdfText = fullText.slice(
            skip,
            Math.min(fullText.length, skip + 50000),
          );
        }
        const knowledge = await regenerateSubChapter(
          pdfText,
          sc.title,
          modelId,
          regenInstructions,
          undefined,
          language,
        );
        updateProject({
          ...project,
          chapters: project.chapters.map((ch) => ({
            ...ch,
            subChapters: ch.subChapters.map((s) =>
              s.id === scId
                ? {
                    ...s,
                    knowledgePoints: knowledge.knowledgePoints,
                    examples: knowledge.examples,
                    exercises: knowledge.exercises,
                  }
                : s,
            ),
          })),
        });
        setRegenScId(null);
        setRegenInstructions("");
      } catch (e) {
        toast(
          "Regeneration failed: " +
            (e instanceof Error ? e.message : String(e)),
          "error",
        );
      } finally {
        setRegenLoading(false);
      }
    },
    [project, updateProject, regenInstructions],
  );

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
        toast(`File too large (max 50MB): ${file.name}`, "error");
        return;
      }
      setUploading(true);
      try {
        let fileData: string;
        if (isTextFile(file.name)) {
          fileData = await readFileAsText(file);
        } else {
          fileData = await readFileAsBase64(file);
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const newItem = {
          id: `${type}-${Date.now()}`,
          name: file.name,
          fileUrl: "#",
          fileData,
          fileSize: file.size,
          fileType: ext,
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
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Upload failed:", e);
        toast("Upload failed: " + (msg || "unknown error"), "error");
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

  function getModelContextTokens(modelId: string): number {
    const id = modelId.toLowerCase();
    if (id.includes("deepseek-v4") || id.includes("deepseek-r1"))
      return 1000000;
    if (id.includes("deepseek")) return 128000;
    if (id.includes("claude-3.5") || id.includes("claude-3-5")) return 200000;
    if (id.includes("claude-3")) return 200000;
    if (id.includes("claude")) return 100000;
    if (id.includes("gpt-4o") || id.includes("gpt-4-turbo")) return 128000;
    if (id.includes("gpt-4")) return 8192;
    if (id.includes("gpt-3.5")) return 16385;
    if (id.includes("gemini-2") || id.includes("gemini-1.5")) return 1000000;
    if (id.includes("gemini")) return 32000;
    return 128000;
  }

  const handleAIAnalyze = useCallback(async () => {
    if (!project || project.textbooks.length === 0) {
      toast("Please upload a textbook PDF first", "warning");
      return;
    }
    const settings = JSON.parse(
      localStorage.getItem("nextbook-settings") || "{}",
    );
    const chapterModelId = settings.chapterModel || "gpt-4o";
    const chapterModel = getModelConfig(chapterModelId);
    if (!chapterModel?.apiKey) {
      toast(
        "Please configure the chapter analysis model API Key in Settings",
        "warning",
      );
      return;
    }
    const initialProject = project;
    const controller = new AbortController();
    const taskId = addTask("AI分析", controller);
    // Collect results to avoid race conditions
    const results = new Map<
      string,
      {
        knowledgePoints: KnowledgePoint[];
        examples: Example[];
        exercises: Exercise[];
      }
    >();
    let chapters: Chapter[] = [];
    try {
      const validTextbooks = initialProject.textbooks.filter(
        (tb) => tb.fileData,
      );
      if (validTextbooks.length === 0) {
        toast("PDF data not found", "error");
        return;
      }
      const pdfTexts = await Promise.all(
        validTextbooks.map((tb) => extractTextFromPDF(tb.fileData!)),
      );
      const pdfText = validTextbooks
        .map((tb, i) => {
          const label =
            settings.language === "en-US"
              ? `Textbook ${i + 1}: ${tb.name}`
              : settings.language === "ja-JP"
                ? `教科書${i + 1}：${tb.name}`
                : `教材${i + 1}：${tb.name}`;
          return `\n\n【${label}】\n\n${pdfTexts[i]}`;
        })
        .join("");
      if (controller.signal.aborted) return;

      const modelContext = getModelContextTokens(chapterModelId);
      const maxInputTokens = Math.floor(modelContext * 0.5);
      const MARKER_INTERVAL = 10000;
      const SEGMENT_SIZE = Math.min(
        maxInputTokens * 3,
        1000000,
        pdfText.length,
      );
      const totalSegments = Math.ceil(pdfText.length / SEGMENT_SIZE);

      updateTask(taskId, t("project.analyzingStructure"));

      let chapters: Chapter[] = [];

      for (let seg = 0; seg < totalSegments; seg++) {
        if (controller.signal.aborted) return;
        if (totalSegments > 1) {
          updateTask(
            taskId,
            t("project.analyzingStructure") + ` (${seg + 1}/${totalSegments})`,
          );
        }
        const segStart = seg * SEGMENT_SIZE;
        const segText = pdfText.slice(
          segStart,
          Math.min(segStart + SEGMENT_SIZE, pdfText.length),
        );
        let segMarked = "";
        for (let p = 0; p < segText.length; p += MARKER_INTERVAL) {
          const posLabel = String(segStart + p).padStart(6, "0");
          segMarked += "【POS_" + posLabel + "】";
          segMarked += segText.slice(
            p,
            Math.min(p + MARKER_INTERVAL, segText.length),
          );
        }
        const segChapters = await analyzeChapters(
          segMarked,
          chapterModelId,
          controller.signal,
          settings.language,
          seg > 0 ? chapters.map((c) => c.title) : undefined,
        );
        if (controller.signal.aborted) return;
        for (const ch of segChapters) {
          const newFirstSC = ch.subChapters[0];
          const dup = chapters.find((existing) => {
            const existingLastSC =
              existing.subChapters[existing.subChapters.length - 1];
            const titleMatch =
              existing.title === ch.title ||
              (existingLastSC &&
                newFirstSC &&
                existingLastSC.title === newFirstSC.title);
            if (!titleMatch) return false;
            if (
              existingLastSC?.posMarker != null &&
              newFirstSC?.posMarker != null
            ) {
              const lastRaw = String(existingLastSC.posMarker);
              const newRaw = String(newFirstSC.posMarker);
              const lastMatch =
                lastRaw.match(/POS_(\d+)/) || lastRaw.match(/(\d+)/);
              const newMatch =
                newRaw.match(/POS_(\d+)/) || newRaw.match(/(\d+)/);
              const lastPos = parseInt(lastMatch?.[1] ?? "0", 10);
              const newPos = parseInt(newMatch?.[1] ?? "0", 10);
              if (Math.abs(newPos - lastPos) > SEGMENT_SIZE * 2) {
                console.warn(
                  `[chapter-ai] Chapter "${ch.title}" titles match but posMarkers are too far apart ` +
                    `(existing: ${lastPos}, new: ${newPos}, max: ${SEGMENT_SIZE * 2}). ` +
                    `Creating as separate chapter — this may indicate AI misidentified the chapter boundary.`,
                );
                return false;
              }
            }
            return true;
          });
          if (dup) {
            // Deduplicate: remove subchapters from the new chapter that
            // already exist in the existing chapter (by title). This handles
            // cases where the AI returns the full chapter in both segments.
            const existingTitles = new Set(
              dup.subChapters.map((sc) => sc.title),
            );
            const newSubs = ch.subChapters.filter(
              (sc) => !existingTitles.has(sc.title),
            );
            if (newSubs.length === 0) {
              console.log(
                `[chapter-ai] All subchapters of "${ch.title}" already exist, skipping merge.`,
              );
              continue;
            }
            console.log(
              `[chapter-ai] Merging ${newSubs.length} new subchapter(s) into existing chapter "${ch.title}" (skipped ${ch.subChapters.length - newSubs.length} duplicate(s)).`,
            );
            for (const sc of newSubs) {
              dup.subChapters.push(sc);
            }
          } else {
            ch.order = chapters.length;
            chapters.push(ch);
          }
        }
      }

      if (controller.signal.aborted) return;

      const allSCsFlat = chapters.flatMap((ch) => ch.subChapters);
      for (const sc of allSCsFlat) {
        if (sc.posMarker != null) {
          const raw = String(sc.posMarker);
          const m = raw.match(/POS_(\d+)/) || raw.match(/(\d+)/);
          if (m) sc.textStart = parseInt(m[1], 10);
        }
        sc.textEnd = undefined;
      }
      for (let i = 0; i < allSCsFlat.length - 1; i++) {
        if (allSCsFlat[i + 1].textStart != null) {
          allSCsFlat[i].textEnd = allSCsFlat[i + 1].textStart!;
        }
      }

      // Validate: check for non-monotonic textStart values (backward jumps
      // indicate duplicate or misordered subchapters from segment merging).
      let prevTextStart = -1;
      for (const sc of allSCsFlat) {
        if (sc.textStart != null) {
          if (sc.textStart < prevTextStart) {
            console.warn(
              `[chapter-ai] Non-monotonic textStart detected: subchapter "${sc.title}" ` +
                `has textStart=${sc.textStart} but previous was ${prevTextStart}. ` +
                `This likely means duplicate subchapters from segment merging corrupted the position order.`,
            );
          }
          prevTextStart = sc.textStart;
        }
      }

      for (const sc of allSCsFlat) {
        if (sc.textStart == null)
          sc.textStart = Math.floor(pdfText.length * 0.05);
        if (sc.textEnd == null)
          sc.textEnd = Math.min(pdfText.length, (sc.textStart ?? 0) + 50000);
      }

      setProject({ ...initialProject, chapters });
      // Persist chapter structure immediately
      await saveProject({ ...initialProject, chapters });

      // Flatten all sub-chapters for parallel processing
      const flatTasks: { sc: SubChapter }[] = [];
      for (let ci = 0; ci < chapters.length; ci++) {
        for (let si = 0; si < chapters[ci].subChapters.length; si++) {
          flatTasks.push({ sc: chapters[ci].subChapters[si] });
        }
      }
      const totalTasks = flatTasks.length;

      let failedCount = 0;
      let completedCount = 0;

      const updateProgress = () => {
        const done = completedCount + failedCount;
        updateTask(
          taskId,
          t("project.extracting") + ` (${done}/${totalTasks})`,
        );
      };
      updateProgress();

      // Process in parallel with concurrency limit of 3
      const CONCURRENCY = 3;
      const taskFns = flatTasks.map(({ sc }) => async () => {
        if (controller.signal.aborted) return;
        try {
          const textStart = sc.textStart ?? Math.floor(pdfText.length * 0.05);
          const textEnd = sc.textEnd ?? pdfText.length;
          const sliceStart = Math.max(0, textStart - 500);
          const sliceEnd = Math.min(
            pdfText.length,
            Math.max(textEnd + 500, textStart + 50000),
          );
          const chapterText = pdfText.slice(sliceStart, sliceEnd);

          let finalChapterText = chapterText;

          // Validate: check if the subchapter title appears in the extracted text.
          // If not, the posMarker likely points to the wrong area of the PDF.
          // Attempt to find the correct position by searching the full PDF text.
          const titleInText = chapterText.includes(sc.title);
          if (!titleInText) {
            const shortTitle = sc.title.replace(/^[\d.]+\s*/, "").trim();
            const shortMatch =
              shortTitle.length > 4 && chapterText.includes(shortTitle);
            if (!shortMatch) {
              const foundIdx = pdfText.indexOf(sc.title);
              if (foundIdx >= 0) {
                console.warn(
                  `[chapter-ai] Subchapter "${sc.title}" not in posMarker range ` +
                    `(${sliceStart}-${sliceEnd}), but found at ${foundIdx}. Using corrected position.`,
                );
                finalChapterText = pdfText.slice(
                  Math.max(0, foundIdx - 500),
                  Math.min(pdfText.length, foundIdx + 50000),
                );
              } else {
                console.warn(
                  `[chapter-ai] Subchapter "${sc.title}" not found anywhere in PDF. ` +
                    `AI may have hallucinated this title. Text prefix: ${chapterText.slice(0, 150).replace(/\n/g, " ")}`,
                );
              }
            }
          }

          const knowledge = await extractKnowledgePoints(
            finalChapterText,
            sc.title,
            chapterModelId,
            controller.signal,
            settings.language,
          );
          if (controller.signal.aborted) return;
          results.set(sc.id, knowledge);
          completedCount++;
          updateProgress();
        } catch (e) {
          if (controller.signal.aborted) return;
          failedCount++;
          updateProgress();
          console.warn(
            "[chapter-ai] Failed to extract knowledge for subchapter:",
            sc.title,
            e,
          );
        }
      });

      for (let i = 0; i < taskFns.length; i += CONCURRENCY) {
        const batch = taskFns.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((t) => t()));
        if (controller.signal.aborted) break;
        // Save partial progress after each batch
        const partial = {
          ...initialProject,
          chapters: chapters.map((ch) => ({
            ...ch,
            subChapters: ch.subChapters.map((sc) => {
              const r = results.get(sc.id);
              if (!r) return sc;
              return {
                ...sc,
                knowledgePoints: r.knowledgePoints,
                examples: r.examples,
                exercises: r.exercises,
              };
            }),
          })),
        };
        await saveProject(partial);
      }

      // Merge all results into latest state atomically
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: prev.chapters.map((ch) => ({
            ...ch,
            subChapters: ch.subChapters.map((sc) => {
              const r = results.get(sc.id);
              if (!r) return sc;
              return {
                ...sc,
                knowledgePoints: r.knowledgePoints,
                examples: r.examples,
                exercises: r.exercises,
              };
            }),
          })),
        };
      });

      // Merge local chapters for save
      chapters = chapters.map((ch) => ({
        ...ch,
        subChapters: ch.subChapters.map((sc) => {
          const r = results.get(sc.id);
          if (!r) return sc;
          return {
            ...sc,
            knowledgePoints: r.knowledgePoints,
            examples: r.examples,
            exercises: r.exercises,
          };
        }),
      }));
      setProject((prev) => (prev ? { ...prev, chapters } : prev));

      if (!controller.signal.aborted) {
        await saveProject({ ...initialProject, chapters });
        const totalSCs = chapters.reduce(
          (a, ch) => a + ch.subChapters.length,
          0,
        );
        if (chapters.length === 0) {
          toast("No chapters were detected in the textbook", "warning");
        } else {
          toast(
            `${chapters.length} chapters, ${totalSCs} sections generated`,
            "success",
          );
        }
      }
      if (failedCount > 0) {
        toast(
          failedCount + t("project.sectionsFailedExtract") ||
            failedCount + " section(s) failed to extract.",
          "warning",
        );
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // Save partial progress using the analyzed chapters (not initialProject)
        const merged = {
          ...initialProject,
          chapters: chapters.map((ch) => ({
            ...ch,
            subChapters: ch.subChapters.map((sc) => {
              const r = results.get(sc.id);
              if (!r) return sc;
              return {
                ...sc,
                knowledgePoints: r.knowledgePoints,
                examples: r.examples,
                exercises: r.exercises,
              };
            }),
          })),
        };
        setProject(merged);
        await saveProject(merged);
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      toast("Analysis failed: " + msg, "error");
    } finally {
      removeTask(taskId);
    }
  }, [project, updateProject]);

  // Regenerate a single subchapter
  const handleRegenerateSingleSubChapter = useCallback(
    async (scId: string) => {
      if (!project || project.textbooks.length === 0) return;
      const settings = (() => {
        try {
          return JSON.parse(localStorage.getItem("nextbook-settings") || "{}");
        } catch {
          return {};
        }
      })();
      const modelId = settings.chapterModel || "gpt-4o";
      const model = getModelConfig(modelId);
      if (!model?.apiKey) return;
      const sc = project.chapters
        .flatMap((ch) => ch.subChapters)
        .find((s) => s.id === scId);
      if (!sc) return;

      const validTextbooks = project.textbooks.filter((tb) => tb.fileData);
      if (validTextbooks.length === 0) return;

      const controller = new AbortController();
      const taskId = addTask(sc.title, controller);
      try {
        const pdfTexts = await Promise.all(
          validTextbooks.map((tb) => extractTextFromPDF(tb.fileData!)),
        );
        const fullText = validTextbooks
          .map((tb, i) => `\n\n【${tb.name}】\n\n${pdfTexts[i]}`)
          .join("");
        if (controller.signal.aborted) return;

        const PAD = 2000;
        let pdfText = fullText;
        if (sc.textStart != null) {
          const start = Math.max(0, sc.textStart - PAD);
          const end =
            sc.textEnd != null && sc.textEnd > sc.textStart
              ? Math.min(fullText.length, sc.textEnd + PAD)
              : Math.min(fullText.length, sc.textStart + 50000);
          pdfText = fullText.slice(start, end);
        } else {
          const skip = Math.floor(fullText.length * 0.05);
          pdfText = fullText.slice(
            skip,
            Math.min(fullText.length, skip + 50000),
          );
        }

        updateTask(taskId, "生成中...");
        const knowledge = await extractKnowledgePoints(
          pdfText,
          sc.title,
          modelId,
          controller.signal,
          settings.language,
        );
        if (controller.signal.aborted) return;

        const updated = {
          ...project,
          chapters: project.chapters.map((ch) => ({
            ...ch,
            subChapters: ch.subChapters.map((s) =>
              s.id === scId
                ? {
                    ...s,
                    knowledgePoints: knowledge.knowledgePoints,
                    examples: knowledge.examples,
                    exercises: knowledge.exercises,
                  }
                : s,
            ),
          })),
        };
        setProject(updated);
        await saveProject(updated);
        updateTask(taskId, "完成");
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        toast(
          "生成失败: " + (e instanceof Error ? e.message : String(e)),
          "error",
        );
      } finally {
        removeTask(taskId);
      }
    },
    [project, updateProject, addTask, updateTask, removeTask],
  );

  const handleReAnalyze = useCallback(async () => {
    if (!project || project.textbooks.length === 0) {
      toast("Please upload a textbook PDF first", "warning");
      return;
    }
    const settings = JSON.parse(
      localStorage.getItem("nextbook-settings") || "{}",
    );
    const chapterModelId = settings.chapterModel || "gpt-4o";
    const chapterModel = getModelConfig(chapterModelId);
    if (!chapterModel?.apiKey) {
      toast(
        "Please configure the chapter analysis model API Key in Settings",
        "warning",
      );
      return;
    }
    const initialProject = project;
    const controller = new AbortController();
    const taskId = addTask("重新分章", controller);
    try {
      const validTextbooks = initialProject.textbooks.filter(
        (tb) => tb.fileData,
      );
      if (validTextbooks.length === 0) {
        toast("PDF data not found", "error");
        return;
      }
      const pdfTexts = await Promise.all(
        validTextbooks.map((tb) => extractTextFromPDF(tb.fileData!)),
      );
      const pdfText = validTextbooks
        .map((tb, i) => {
          const label =
            settings.language === "en-US"
              ? `Textbook ${i + 1}: ${tb.name}`
              : settings.language === "ja-JP"
                ? `教科書${i + 1}：${tb.name}`
                : `教材${i + 1}：${tb.name}`;
          return `\n\n【${label}】\n\n${pdfTexts[i]}`;
        })
        .join("");
      if (controller.signal.aborted) return;

      const modelContext = getModelContextTokens(chapterModelId);
      const maxInputTokens = Math.floor(modelContext * 0.5);
      const MARKER_INTERVAL = 10000;
      const SEGMENT_SIZE = Math.min(
        maxInputTokens * 3,
        1000000,
        pdfText.length,
      );
      const totalSegments = Math.ceil(pdfText.length / SEGMENT_SIZE);

      const chapters: Chapter[] = [];
      for (let seg = 0; seg < totalSegments; seg++) {
        if (controller.signal.aborted) return;
        if (totalSegments > 1) {
          updateTask(
            taskId,
            t("project.analyzingStructure") + ` (${seg + 1}/${totalSegments})`,
          );
        }
        const segStart = seg * SEGMENT_SIZE;
        const segText = pdfText.slice(
          segStart,
          Math.min(segStart + SEGMENT_SIZE, pdfText.length),
        );
        let segMarked = "";
        for (let p = 0; p < segText.length; p += MARKER_INTERVAL) {
          const posLabel = String(segStart + p).padStart(6, "0");
          segMarked += "【POS_" + posLabel + "】";
          segMarked += segText.slice(
            p,
            Math.min(p + MARKER_INTERVAL, segText.length),
          );
        }
        const segChapters = await analyzeChapters(
          segMarked,
          chapterModelId,
          controller.signal,
          settings.language,
          seg > 0 ? chapters.map((c) => c.title) : undefined,
        );
        if (controller.signal.aborted) return;
        for (const ch of segChapters) {
          const newFirstSC = ch.subChapters[0];
          const dup = chapters.find((existing) => {
            const existingLastSC =
              existing.subChapters[existing.subChapters.length - 1];
            const titleMatch =
              existing.title === ch.title ||
              (existingLastSC &&
                newFirstSC &&
                existingLastSC.title === newFirstSC.title);
            if (!titleMatch) return false;
            if (
              existingLastSC?.posMarker != null &&
              newFirstSC?.posMarker != null
            ) {
              const lastRaw = String(existingLastSC.posMarker);
              const newRaw = String(newFirstSC.posMarker);
              const lastMatch =
                lastRaw.match(/POS_(\d+)/) || lastRaw.match(/(\d+)/);
              const newMatch =
                newRaw.match(/POS_(\d+)/) || newRaw.match(/(\d+)/);
              const lastPos = parseInt(lastMatch?.[1] ?? "0", 10);
              const newPos = parseInt(newMatch?.[1] ?? "0", 10);
              if (Math.abs(newPos - lastPos) > SEGMENT_SIZE * 2) {
                console.warn(
                  `[chapter-ai] Chapter "${ch.title}" titles match but posMarkers are too far apart ` +
                    `(existing: ${lastPos}, new: ${newPos}, max: ${SEGMENT_SIZE * 2}). ` +
                    `Creating as separate chapter — this may indicate AI misidentified the chapter boundary.`,
                );
                return false;
              }
            }
            return true;
          });
          if (dup) {
            // Deduplicate: remove subchapters from the new chapter that
            // already exist in the existing chapter (by title). This handles
            // cases where the AI returns the full chapter in both segments.
            const existingTitles = new Set(
              dup.subChapters.map((sc) => sc.title),
            );
            const newSubs = ch.subChapters.filter(
              (sc) => !existingTitles.has(sc.title),
            );
            if (newSubs.length > 0) {
              console.log(
                `[chapter-ai] Merging ${newSubs.length} new subchapter(s) into existing chapter "${ch.title}" (skipped ${ch.subChapters.length - newSubs.length} duplicate(s)).`,
              );
              for (const sc of newSubs) {
                dup.subChapters.push(sc);
              }
            }
          } else {
            ch.order = chapters.length;
            chapters.push(ch);
          }
        }
      }
      if (controller.signal.aborted) return;

      const allSCsFlat = chapters.flatMap((ch) => ch.subChapters);
      for (const sc of allSCsFlat) {
        if (sc.posMarker != null) {
          const raw = String(sc.posMarker);
          const m = raw.match(/POS_(\d+)/) || raw.match(/(\d+)/);
          if (m) sc.textStart = parseInt(m[1], 10);
        }
        sc.textEnd = undefined;
      }
      for (let i = 0; i < allSCsFlat.length - 1; i++) {
        if (allSCsFlat[i + 1].textStart != null) {
          allSCsFlat[i].textEnd = allSCsFlat[i + 1].textStart!;
        }
      }
      for (const sc of allSCsFlat) {
        if (sc.textStart == null)
          sc.textStart = Math.floor(pdfText.length * 0.05);
        if (sc.textEnd == null)
          sc.textEnd = Math.min(pdfText.length, (sc.textStart ?? 0) + 50000);
      }

      await saveProject({ ...initialProject, chapters });
      setProject({ ...initialProject, chapters });
      const totalSCs = chapters.reduce((a, ch) => a + ch.subChapters.length, 0);
      toast(
        `${chapters.length} chapters, ${totalSCs} sections detected`,
        "success",
      );
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      toast(
        "Analysis failed: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    } finally {
      removeTask(taskId);
    }
  }, [project, updateProject]);

  const handleRegenerateChapter = useCallback(
    async (chapterId: string) => {
      if (!project || project.textbooks.length === 0) return;
      const settings = (() => {
        try {
          return JSON.parse(localStorage.getItem("nextbook-settings") || "{}");
        } catch {
          return {};
        }
      })();
      const modelId = settings.chapterModel || "gpt-4o";
      const model = getModelConfig(modelId);
      if (!model?.apiKey) {
        toast("Please configure API Key first", "warning");
        return;
      }

      const validTextbooks = project.textbooks.filter((tb) => tb.fileData);
      if (validTextbooks.length === 0) return;

      const chapterIndex = project.chapters.findIndex(
        (ch) => ch.id === chapterId,
      );
      if (chapterIndex === -1) return;

      const initialProject = project;
      const controller = new AbortController();
      const taskId = addTask(
        "重新生成: " + (project.chapters[chapterIndex]?.title || ""),
        controller,
      );
      const language = settings.language || "zh-CN";
      // Collect results in a fixed array to avoid race conditions
      const results: ({
        knowledgePoints: KnowledgePoint[];
        examples: Example[];
        exercises: Exercise[];
      } | null)[] = new Array(
        initialProject.chapters[chapterIndex]?.subChapters.length || 0,
      ).fill(null);
      try {
        const pdfTexts = await Promise.all(
          validTextbooks.map((tb) => extractTextFromPDF(tb.fileData!)),
        );
        const pdfText = validTextbooks
          .map((tb, i) => {
            const label =
              language === "en-US"
                ? `Textbook ${i + 1}: ${tb.name}`
                : language === "ja-JP"
                  ? `教科書${i + 1}：${tb.name}`
                  : `教材${i + 1}：${tb.name}`;
            return `\n\n【${label}】\n\n${pdfTexts[i]}`;
          })
          .join("");
        if (controller.signal.aborted) return;

        let completedCount = 0;
        let failedCount = 0;
        const subChapters = initialProject.chapters[chapterIndex].subChapters;
        const total = subChapters.length;

        const updateProgress = () => {
          const done = completedCount + failedCount;
          updateTask(taskId, `(${done}/${total})`);
        };
        updateProgress();

        // Process in parallel with concurrency limit of 3
        const CONCURRENCY = 3;
        const tasks = subChapters.map((sc, si) => async () => {
          if (controller.signal.aborted) return;
          try {
            const textStart = sc.textStart ?? Math.floor(pdfText.length * 0.05);
            const textEnd = sc.textEnd ?? pdfText.length;
            let chapterText = pdfText.slice(
              Math.max(0, textStart - 500),
              Math.min(
                pdfText.length,
                Math.max(textEnd + 500, textStart + 50000),
              ),
            );

            // Auto-correct if the title is not in the posMarker range
            if (!chapterText.includes(sc.title)) {
              const foundIdx = pdfText.indexOf(sc.title);
              if (foundIdx >= 0) {
                console.warn(
                  `[chapter-ai] Regenerate: title not at posMarker, found at ${foundIdx}. Correcting.`,
                );
                chapterText = pdfText.slice(
                  Math.max(0, foundIdx - 500),
                  Math.min(pdfText.length, foundIdx + 50000),
                );
              }
            }

            const knowledge = await extractKnowledgePoints(
              chapterText,
              sc.title,
              modelId,
              controller.signal,
              settings.language,
            );
            if (controller.signal.aborted) return;
            results[si] = knowledge;
            completedCount++;
            updateProgress();
          } catch (e) {
            if (controller.signal.aborted) return;
            failedCount++;
            updateProgress();
            console.warn(
              "[chapter-ai] Failed to regenerate subchapter:",
              sc.title,
              e,
            );
          }
        });

        // Run with concurrency limit
        for (let i = 0; i < tasks.length; i += CONCURRENCY) {
          const batch = tasks.slice(i, i + CONCURRENCY);
          await Promise.all(batch.map((t) => t()));
          if (controller.signal.aborted) break;
        }

        if (failedCount > 0) {
          toast(failedCount + " section(s) failed to regenerate.", "warning");
        }
        if (!controller.signal.aborted) {
          // Race-condition-safe save via functional setProject
          let mergedChapter: Chapter | null = null;
          setProject((prev) => {
            if (!prev) return prev;
            const latest = prev.chapters[chapterIndex];
            if (!latest) return prev;
            mergedChapter = {
              ...latest,
              subChapters: latest.subChapters.map((sc, i) => {
                const r = results[i];
                if (!r) return sc;
                return {
                  ...sc,
                  knowledgePoints: r.knowledgePoints,
                  examples: r.examples,
                  exercises: r.exercises,
                };
              }),
            };
            const newChapters = [...prev.chapters];
            newChapters[chapterIndex] = mergedChapter;
            return { ...prev, chapters: newChapters };
          });
          if (mergedChapter) {
            const toSave = { ...initialProject };
            toSave.chapters = [...initialProject.chapters];
            toSave.chapters[chapterIndex] = mergedChapter;
            await saveProject(toSave);
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          // Save partial progress before aborting
          const merged = [
            ...initialProject.chapters.slice(0, chapterIndex),
            {
              ...initialProject.chapters[chapterIndex],
              subChapters: initialProject.chapters[
                chapterIndex
              ].subChapters.map((sc, i) => {
                const r = results[i];
                if (!r) return sc;
                return {
                  ...sc,
                  knowledgePoints: r.knowledgePoints,
                  examples: r.examples,
                  exercises: r.exercises,
                };
              }),
            },
            ...initialProject.chapters.slice(chapterIndex + 1),
          ];
          setProject({ ...initialProject, chapters: merged });
          await saveProject({ ...initialProject, chapters: merged });
          return;
        }
        toast(
          "Regeneration failed: " +
            (e instanceof Error ? e.message : String(e)),
          "error",
        );
      } finally {
        removeTask(taskId);
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
    if (!project || !confirm(t("dialog.deleteChapter"))) return;
    updateProject({
      ...project,
      chapters: project.chapters.filter((ch) => ch.id !== chapterId),
    });
  };

  const handleDeleteSubChapter = (scId: string) => {
    if (!project || !confirm(t("dialog.deleteSubChapter"))) return;
    updateProject({
      ...project,
      chapters: project.chapters.map((ch) => ({
        ...ch,
        subChapters: ch.subChapters.filter((sc) => sc.id !== scId),
      })),
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

  const allSubs = project?.chapters.flatMap((ch) => ch.subChapters) ?? [];
  const currentIndex = allSubs.findIndex(
    (sc) => sc.id === selectedSubChapterId,
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allSubs.length - 1;
  const prevId = hasPrev ? allSubs[currentIndex - 1].id : null;
  const nextId = hasNext ? allSubs[currentIndex + 1].id : null;

  if (!loaded)
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="space-y-4 w-full max-w-2xl px-6">
          <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
          <div className="flex gap-4">
            <div className="h-[60vh] w-[280px] bg-muted rounded-xl animate-pulse shrink-0" />
            <div className="flex-1 h-[60vh] bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-lg font-semibold mb-2">{t("project.notFound")}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("project.notFoundDesc")}
        </p>
        <Button onClick={() => router.push("/projects")}>
          <ChevronLeft className="size-4" />
          {t("project.backToList")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <input
        ref={textbookInputRef}
        type="file"
        accept=".pdf,.txt,.md,.html,.htm,.docx,.pptx,.xlsx,.doc,.ppt,.xls"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files) {
            for (const f of Array.from(files)) handleFileUpload("textbook", f);
          }
          e.target.value = "";
        }}
      />
      <input
        ref={exerciseInputRef}
        type="file"
        accept=".pdf,.txt,.md,.html,.htm,.docx,.pptx,.xlsx,.doc,.ppt,.xls"
        className="hidden"
        onChange={(e) => {
          for (const f of e.target.files ? Array.from(e.target.files) : [])
            handleFileUpload("exercise", f);
          e.target.value = "";
        }}
      />
      <input
        ref={examInputRef}
        type="file"
        accept=".pdf,.txt,.md,.html,.htm,.docx,.pptx,.xlsx,.doc,.ppt,.xls"
        className="hidden"
        onChange={(e) => {
          for (const f of e.target.files ? Array.from(e.target.files) : [])
            handleFileUpload("exam", f);
          e.target.value = "";
        }}
      />

      {/* Mobile backdrop overlay with fade animation */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-40",
          "transition-opacity duration-300 ease-in-out",
          sidebarWidth > 0
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => setSidebarWidth(0)}
      />
      <div
        className={cn(
          "border-r backdrop-blur-xl md:bg-transparent md:backdrop-blur-none flex flex-col shrink-0",
          "max-md:rounded-r-2xl",
          sidebarWidth === 0 && !isMobile && "overflow-hidden border-r-0",
          "fixed top-14 left-0 bottom-0 z-50 md:static",
          dragging
            ? "transition-none"
            : "transition-all duration-300 ease-in-out md:transition-[width] md:duration-200",
          isMobile ? "w-[85vw]" : "md:w-auto",
          sidebarWidth > 0
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        )}
        style={{
          width: isMobile
            ? sidebarWidth > 0
              ? sidebarWidth
              : undefined
            : sidebarWidth,
          minWidth: isMobile ? 200 : 0,
          maxWidth: isMobile ? "90vw" : "85vw",
        }}
      >
        {sidebarWidth > 0 && (
          <div
            className="absolute top-0 -right-2 w-2 h-full cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-20 touch-none"
            onMouseDown={(e) => {
              e.preventDefault();
              dragStart.current = { mx: e.clientX, w: sidebarWidth };
              setDragging(true);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              dragStart.current = { mx: e.touches[0].clientX, w: sidebarWidth };
              setDragging(true);
            }}
          />
        )}
        <div className="shrink-0 px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{project.icon}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">{project.name}</h2>
              {(() => {
                const totalSubs = project.chapters.reduce(
                  (s, ch) => s + ch.subChapters.length,
                  0,
                );
                const completedSubs = project.chapters.reduce(
                  (s, ch) =>
                    s + ch.subChapters.filter((sc) => sc.completed).length,
                  0,
                );
                return totalSubs > 0 ? (
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all rounded-full"
                      style={{
                        width: `${Math.round((completedSubs / totalSubs) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null;
              })()}
            </div>
            <button
              type="button"
              className={cn(
                "flex items-center justify-center shrink-0",
                "size-7 rounded-md",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted/60",
                "active:scale-95 transition-all duration-200",
              )}
              onClick={() => toggleSidebar()}
              title={t("common.close") || "关闭"}
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-2">
            <div>
              <div className="flex items-center justify-between px-3 mb-2 mt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("project.chapters")}
                </p>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 hover:bg-muted"
                    onClick={() => setAddingChapter(true)}
                    title={t("project.addChapter")}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 hover:bg-muted text-violet-500"
                    onClick={handleAIAnalyze}
                    disabled={analyzing || project.textbooks.length === 0}
                    title={t("project.aiAnalyze")}
                  >
                    {analyzing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 hover:bg-muted text-violet-500"
                    onClick={handleReAnalyze}
                    disabled={analyzing || project.chapters.length === 0}
                    title="重新分章"
                  >
                    <RotateCw className="size-4" />
                  </Button>
                </div>
              </div>
              {addingChapter && (
                <div className="flex gap-1 px-2 py-1">
                  <Input
                    className="h-6 text-xs"
                    placeholder={t("project.chapterPlaceholder")}
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
              <div className="space-y-1">
                {project.chapters.map((chapter) => (
                  <ChapterTreeNode
                    key={chapter.id}
                    chapter={chapter}
                    selectedSubChapterId={selectedSubChapterId}
                    onSelect={(scId) => {
                      setSelectedSubChapterId(scId);
                      closeSidebarIfMobile();
                    }}
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
                    onDeleteSubChapter={handleDeleteSubChapter}
                    onRegenerateSubChapter={handleRegenerateSingleSubChapter}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="shrink-0 overflow-y-auto max-h-[45%]">
          <div className="p-2 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
              {t("project.materials")}
            </p>

            <MaterialSection
              icon={BookOpen}
              label={t("project.textbooks")}
              color="text-blue-500"
              files={project.textbooks}
              onUpload={() => textbookInputRef.current?.click()}
              onRemove={(id) => handleRemoveFile("textbook", id)}
              uploading={uploading}
              onPreviewFile={(data, name) =>
                setFilePreview(
                  data
                    ? {
                        data,
                        name,
                        blobUrl: dataUrlToBlobUrl(data, name),
                        isText: !data.startsWith("data:"),
                      }
                    : null,
                )
              }
            />

            <MaterialSection
              icon={FileText}
              label={t("project.exercises")}
              color="text-amber-500"
              files={project.exercises}
              onUpload={() => exerciseInputRef.current?.click()}
              onRemove={(id) => handleRemoveFile("exercise", id)}
              uploading={uploading}
              onPreviewFile={(data, name) =>
                setFilePreview(
                  data
                    ? {
                        data,
                        name,
                        blobUrl: dataUrlToBlobUrl(data, name),
                        isText: !data.startsWith("data:"),
                      }
                    : null,
                )
              }
            />

            <MaterialSection
              icon={GraduationCap}
              label={t("project.exams")}
              color="text-violet-500"
              files={project.exams}
              onUpload={() => examInputRef.current?.click()}
              onRemove={(id) => handleRemoveFile("exam", id)}
              uploading={uploading}
              onPreviewFile={(data, name) =>
                setFilePreview(
                  data
                    ? {
                        data,
                        name,
                        blobUrl: dataUrlToBlobUrl(data, name),
                        isText: !data.startsWith("data:"),
                      }
                    : null,
                )
              }
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b bg-card/40 backdrop-blur-md min-h-[41px]">
          {sidebarWidth === 0 && (
            <button
              type="button"
              className={cn(
                "flex items-center justify-center shrink-0",
                "size-8 rounded-md",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted/60",
                "active:scale-95 transition-all duration-200",
              )}
              onClick={() => toggleSidebar()}
              title={t("common.expand") || "展开"}
            >
              <ChevronRight className="size-4" />
            </button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/projects")}
          >
            <ChevronLeft className="size-4" />
            {t("common.back")}
          </Button>
          <Separator orientation="vertical" className="h-4" />
          {selectedChapter && (
            <span className="text-xs text-muted-foreground">
              {selectedChapter.title}
            </span>
          )}
        </div>
        {filePreview ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b bg-card/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (filePreview && filePreview.blobUrl)
                    URL.revokeObjectURL(filePreview.blobUrl);
                  setFilePreview(null);
                }}
              >
                <ChevronLeft className="size-4" />
                {t("common.back")}
              </Button>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-medium truncate">
                {filePreview.name}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              {filePreview.isText ? (
                <pre className="w-full h-full overflow-auto p-4 text-sm font-mono whitespace-pre-wrap">
                  {filePreview.data}
                </pre>
              ) : (
                <iframe
                  src={filePreview.blobUrl || filePreview.data}
                  className="w-full h-full border-0"
                  title={filePreview.name}
                />
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 h-full">
            {selectedSubChapter ? (
              <>
                <StudyUnitViewer
                  subChapter={selectedSubChapter}
                  onToggleComplete={toggleComplete}
                  onUpdate={handleUpdateSubChapter}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  onPrev={
                    prevId ? () => setSelectedSubChapterId(prevId) : undefined
                  }
                  onNext={
                    nextId ? () => setSelectedSubChapterId(nextId) : undefined
                  }
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <BookOpen className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("project.selectChapter")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("project.uploadHint")}
                </p>
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {activeTasks.length > 0 && (
        <GenerationPanel
          tasks={activeTasks}
          minimized={panelMinimized}
          leaving={panelLeaving}
          onToggle={hidePanel}
          onCancel={cancelTask}
          onStopAll={stopAllTasks}
        />
      )}

      <AIChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        chapterTitle={selectedSubChapter?.title}
      />

      {!chatOpen && (
        <button
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 size-11 md:size-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/80 transition-colors"
          onClick={() => setChatOpen(true)}
          aria-label={t("project.openAiChat")}
        >
          <MessageCircle className="size-5" />
        </button>
      )}
    </div>
  );
}

function MaterialSection({
  icon: Icon,
  label,
  color,
  files,
  onUpload,
  onRemove,
  uploading,
  onPreviewFile,
}: {
  icon: typeof BookOpen;
  label: string;
  color: string;
  files: (Textbook | ExercisePDF | ExamPDF)[];
  onUpload: () => void;
  onRemove: (id: string) => void;
  uploading: boolean;
  onPreviewFile: (data: string | null, name: string) => void;
}) {
  const { t: mt } = useLocale();
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
          title={`${mt("material.upload")}${label}`}
          aria-label={`${mt("material.upload")}${label}`}
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
                onClick={() =>
                  onPreviewFile((f as Textbook).fileData || null, f.name)
                }
                title={mt("material.preview")}
              >
                {f.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => {
                  const fd = (f as Textbook).fileData;
                  if (!fd) return;
                  const a = document.createElement("a");
                  a.href = fd;
                  a.download = f.name;
                  a.click();
                }}
                title={mt("material.download") || "下载"}
              >
                <Download className="size-3.5" />
              </Button>
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
        <p className="text-xs text-muted-foreground px-2">
          {mt("material.empty")}
          {label}
        </p>
      )}
    </div>
  );
}

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
  onDeleteSubChapter,
  onRegenerateSubChapter,
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
  onDeleteSubChapter?: (scId: string) => void;
  onRegenerateSubChapter?: (scId: string) => void;
}) {
  const completedCount = chapter.subChapters.filter(
    (sc) => sc.completed,
  ).length;
  const totalCount = chapter.subChapters.length;

  const isNative = chapter.type === "native";
  const { t: ct } = useLocale();

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center gap-0.5 rounded-lg px-2 py-1.5 group hover:bg-muted/30 hover:backdrop-blur-md transition-all">
        <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 text-sm font-semibold min-w-0">
          <ChevronDown className="size-4 text-muted-foreground shrink-0 transition-transform group-aria-expanded:rotate-180" />
          <span className="flex-1 text-left truncate">{chapter.title}</span>
        </CollapsibleTrigger>
        <div className="relative shrink-0 flex items-center">
          <div className="flex items-center gap-1 group-hover:opacity-0 transition-opacity max-md:hidden">
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-xs h-4 px-1 font-normal",
                isNative
                  ? "border-blue-300 text-blue-600"
                  : "border-gray-300 text-gray-500",
              )}
            >
              {isNative ? ct("project.native") : ct("project.custom")}
            </Badge>
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">
                {completedCount}/{totalCount}
              </span>
            )}
          </div>
          <div className="absolute inset-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 max-md:opacity-100 max-md:relative max-md:inset-auto transition-opacity">
            {isNative && onRegenerateChapter && (
              <button
                type="button"
                className="size-5 flex items-center justify-center rounded hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerateChapter(chapter.id);
                }}
                title={ct("project.regenerateTitle")}
              >
                <RotateCw className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              className="size-5 flex items-center justify-center rounded hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                onAddSubChapter(chapter.id);
              }}
              title={ct("project.addSubChapterTitle")}
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              className="size-5 flex items-center justify-center rounded hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChapter(chapter.id);
              }}
              title={ct("project.deleteChapterTitle")}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </button>
          </div>
        </div>
      </div>
      {totalCount > 0 && (
        <div className="mx-2 mt-0.5 h-0.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all rounded-full"
            style={{
              width: `${Math.round((completedCount / totalCount) * 100)}%`,
            }}
          />
        </div>
      )}
      <CollapsibleContent>
        <div className="mt-0.5">
          <div className="border-l border-border/60 ml-5 pl-1 space-y-0.5">
            {chapter.subChapters.map((sc) => (
              <button
                key={sc.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-[13px] transition-all text-left group/sc",
                  selectedSubChapterId === sc.id
                    ? "backdrop-blur-md text-primary font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted/30 hover:backdrop-blur-md hover:text-foreground",
                )}
                onClick={() => onSelect(sc.id)}
              >
                {sc.completed ? (
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                )}
                <span className="truncate flex-1">{sc.title}</span>
                {onRegenerateSubChapter && (
                  <span
                    className="size-5 flex items-center justify-center rounded hover:bg-muted shrink-0 opacity-0 group-hover/sc:opacity-100 max-md:opacity-100 transition-opacity"
                    title={ct("project.regenerateTitle") || "重新生成"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegenerateSubChapter(sc.id);
                    }}
                  >
                    <RotateCw className="size-3" />
                  </span>
                )}
                {onDeleteSubChapter && (
                  <span
                    className="size-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/20 shrink-0 opacity-0 group-hover/sc:opacity-100 max-md:opacity-100 transition-opacity ml-1"
                    title={
                      ct("project.deleteSubChapterTitle") || "Delete section"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSubChapter(sc.id);
                    }}
                  >
                    <X className="size-3 text-destructive" />
                  </span>
                )}
              </button>
            ))}
          </div>
          {addingSubToChapterId === chapter.id && (
            <div className="flex gap-1 ml-5 mt-1">
              <Input
                className="h-6 text-xs"
                placeholder={ct("project.subChapterPlaceholder")}
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

function StudyUnitViewer({
  subChapter,
  onToggleComplete,
  onUpdate,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  subChapter: SubChapter;
  onToggleComplete: (id: string) => void;
  onUpdate: (updated: SubChapter) => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const { t: tv } = useLocale();
  const [editMode, setEditMode] = useState(false);
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
  const [addingType, setAddingType] = useState<
    "kp" | "example" | "exercise" | null
  >(null);

  const [newKpTitle, setNewKpTitle] = useState("");
  const [newKpContent, setNewKpContent] = useState("");
  const [newExampleQuestion, setNewExampleQuestion] = useState("");
  const [newExampleSolution, setNewExampleSolution] = useState("");
  const [newExerciseQuestion, setNewExerciseQuestion] = useState("");
  const [newExerciseSolution, setNewExerciseSolution] = useState("");

  const handleAddKp = () => {
    if (!newKpTitle.trim()) return;
    const updated = {
      ...subChapter,
      knowledgePoints: [
        ...subChapter.knowledgePoints,
        {
          id: `kp-${Date.now()}`,
          title: newKpTitle.trim(),
          content: newKpContent.trim(),
        },
      ],
    };
    onUpdate(updated);
    setNewKpTitle("");
    setNewKpContent("");
    setAddingType(null);
  };

  const handleAddExample = () => {
    if (!newExampleQuestion.trim()) return;
    const updated = {
      ...subChapter,
      examples: [
        ...subChapter.examples,
        {
          id: `ex-${Date.now()}`,
          question: newExampleQuestion.trim(),
          solution: newExampleSolution.trim(),
        },
      ],
    };
    onUpdate(updated);
    setNewExampleQuestion("");
    setNewExampleSolution("");
    setAddingType(null);
  };

  const handleAddExercise = () => {
    if (!newExerciseQuestion.trim()) return;
    const updated = {
      ...subChapter,
      exercises: [
        ...subChapter.exercises,
        {
          id: `exr-${Date.now()}`,
          question: newExerciseQuestion.trim(),
          solution: newExerciseSolution.trim(),
        },
      ],
    };
    onUpdate(updated);
    setNewExerciseQuestion("");
    setNewExerciseSolution("");
    setAddingType(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-8 md:space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-snug">
            <Markdown content={subChapter.title} inline />
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5" />
              {subChapter.knowledgePoints.length}{" "}
              {tv("project.knowledgePoints")}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <FileQuestion className="size-3.5" />
              {subChapter.examples.length} {tv("project.examples")}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <GraduationCap className="size-3.5" />
              {subChapter.exercises.length} {tv("project.exercisesSection")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="gap-1"
          >
            {editMode ? (
              <>
                <Eye className="size-4" />
                {tv("common.readMode")}
              </>
            ) : (
              <>
                <Pencil className="size-4" />
                {tv("common.editMode")}
              </>
            )}
          </Button>
          <Button
            variant={subChapter.completed ? "secondary" : "default"}
            size="sm"
            onClick={() => onToggleComplete(subChapter.id)}
          >
            {subChapter.completed
              ? tv("project.markDone")
              : tv("project.markUndone")}
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="size-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">
            {tv("project.knowledgePoints")}
          </h2>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="space-y-4">
          {subChapter.knowledgePoints.map((kp, kpIdx) => (
            <div
              key={kp.id}
              className="group rounded-xl border bg-card/70 shadow-sm overflow-hidden backdrop-blur-md"
            >
              {editingKpId === kp.id ? (
                <div className="p-5 space-y-3">
                  <Input
                    value={editKpTitle}
                    onChange={(e) => setEditKpTitle(e.target.value)}
                    placeholder={tv("project.kpTitle")}
                    className="text-sm"
                  />
                  <Textarea
                    value={editKpContent}
                    onChange={(e) => setEditKpContent(e.target.value)}
                    placeholder={tv("project.kpContentPlaceholder")}
                    className="text-sm min-h-30"
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
                      title={tv("common.save")}
                    >
                      <Check className="size-3.5 text-emerald-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => setEditingKpId(null)}
                      title={tv("common.cancel")}
                    >
                      <X className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 px-5 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {kpIdx + 1}
                      </span>
                      <h3 className="text-base font-semibold truncate">
                        <Markdown content={kp.title} inline />
                      </h3>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`size-6 shrink-0 transition-opacity ${editMode ? "opacity-100" : "hidden"}`}
                      onClick={() => {
                        setEditKpTitle(kp.title);
                        setEditKpContent(kp.content);
                        setEditingKpId(kp.id);
                      }}
                      title={tv("common.edit")}
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </div>
                  <div className="px-5 py-4 text-base leading-relaxed">
                    <Markdown content={kp.content} />
                  </div>
                </>
              )}
            </div>
          ))}
          {addingType === "kp" ? (
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 space-y-3">
              <Input
                value={newKpTitle}
                onChange={(e) => setNewKpTitle(e.target.value)}
                placeholder={tv("project.newKpPlaceholder")}
                className="text-sm"
                autoFocus
              />
              <Textarea
                value={newKpContent}
                onChange={(e) => setNewKpContent(e.target.value)}
                placeholder={tv("project.kpContentPlaceholder")}
                className="text-sm min-h-30"
              />
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={handleAddKp}
                  title={tv("common.save")}
                >
                  <Check className="size-3.5 text-emerald-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => {
                    setNewKpTitle("");
                    setNewKpContent("");
                    setAddingType(null);
                  }}
                  title={tv("common.cancel")}
                >
                  <X className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            editMode && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setAddingType("kp")}
              >
                <Plus className="size-3.5" />
                {tv("project.addKp")}
              </Button>
            )
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <FileQuestion className="size-4 text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold">{tv("project.examples")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="space-y-3">
          {subChapter.examples.map((ex, exIdx) => (
            <Collapsible key={ex.id}>
              <div className="group rounded-xl border bg-card/70 shadow-sm overflow-hidden backdrop-blur-md">
                {editingExampleId === ex.id ? (
                  <div className="p-4 space-y-3">
                    <Textarea
                      value={editExampleQuestion}
                      onChange={(e) => setEditExampleQuestion(e.target.value)}
                      placeholder={tv("project.exampleQuestion")}
                      className="text-sm min-h-15"
                    />
                    <Textarea
                      value={editExampleSolution}
                      onChange={(e) => setEditExampleSolution(e.target.value)}
                      placeholder={tv("project.exampleSolution")}
                      className="text-sm min-h-15"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => {
                          const u = {
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
                          onUpdate(u);
                          setEditingExampleId(null);
                        }}
                        title={tv("common.save")}
                      >
                        <Check className="size-3.5 text-emerald-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => setEditingExampleId(null)}
                        title={tv("common.cancel")}
                      >
                        <X className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-0 border-b border-border/50 group/trigger">
                      <span className="shrink-0 w-9 pt-4 text-center text-sm font-bold text-amber-500/80">
                        Q{exIdx + 1}
                      </span>
                      <CollapsibleTrigger className="flex flex-1 items-start gap-2 px-3 py-3.5 text-left">
                        <span className="flex-1 text-base leading-relaxed">
                          <Markdown content={ex.question} />
                        </span>
                        <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform group-aria-expanded/trigger:rotate-180" />
                      </CollapsibleTrigger>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`size-7 shrink-0 mt-1 mr-1 transition-opacity ${editMode ? "opacity-100" : "hidden"}`}
                        onClick={() => {
                          setEditExampleQuestion(ex.question);
                          setEditExampleSolution(ex.solution);
                          setEditingExampleId(ex.id);
                        }}
                        title={tv("common.edit")}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                    <CollapsibleContent>
                      <div className="flex items-start gap-0 bg-amber-500/5">
                        <span className="shrink-0 w-8 pt-3.5 text-center text-xs font-bold text-amber-600/60">
                          A
                        </span>
                        <div className="flex-1 px-3 py-3.5 text-base leading-relaxed border-l border-amber-500/20">
                          <Markdown content={ex.solution} />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </>
                )}
              </div>
            </Collapsible>
          ))}
          {addingType === "example" ? (
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
              <Textarea
                value={newExampleQuestion}
                onChange={(e) => setNewExampleQuestion(e.target.value)}
                placeholder={tv("project.newExampleQuestion")}
                className="text-sm min-h-15"
                autoFocus
              />
              <Textarea
                value={newExampleSolution}
                onChange={(e) => setNewExampleSolution(e.target.value)}
                placeholder={tv("project.exampleSolution")}
                className="text-sm min-h-15"
              />
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={handleAddExample}
                  title={tv("common.save")}
                >
                  <Check className="size-3.5 text-emerald-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => {
                    setNewExampleQuestion("");
                    setNewExampleSolution("");
                    setAddingType(null);
                  }}
                  title={tv("common.cancel")}
                >
                  <X className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            editMode && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setAddingType("example")}
              >
                <Plus className="size-3.5" />
                {tv("project.addExample")}
              </Button>
            )
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <GraduationCap className="size-4 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold">
            {tv("project.exercisesSection")}
          </h2>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="space-y-3">
          {subChapter.exercises.map((ex, idx) => (
            <Collapsible key={ex.id}>
              <div className="group rounded-xl border bg-card/70 shadow-sm overflow-hidden backdrop-blur-md">
                {editingExerciseId === ex.id ? (
                  <div className="p-4 space-y-3">
                    <Textarea
                      value={editExerciseQuestion}
                      onChange={(e) => setEditExerciseQuestion(e.target.value)}
                      placeholder={tv("project.exampleQuestion")}
                      className="text-sm min-h-15"
                    />
                    <Textarea
                      value={editExerciseSolution}
                      onChange={(e) => setEditExerciseSolution(e.target.value)}
                      placeholder={tv("project.exampleSolution")}
                      className="text-sm min-h-15"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => {
                          const u = {
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
                          onUpdate(u);
                          setEditingExerciseId(null);
                        }}
                        title={tv("common.save")}
                      >
                        <Check className="size-3.5 text-emerald-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => setEditingExerciseId(null)}
                        title={tv("common.cancel")}
                      >
                        <X className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-0 border-b border-border/50 group/trigger">
                      <span className="shrink-0 w-9 pt-4 text-center text-sm font-bold text-emerald-600/80">
                        {idx + 1}
                      </span>
                      <CollapsibleTrigger className="flex flex-1 items-start gap-2 px-3 py-3.5 text-left">
                        <span className="flex-1 text-base leading-relaxed">
                          <Markdown content={ex.question} />
                        </span>
                        <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform group-aria-expanded/trigger:rotate-180" />
                      </CollapsibleTrigger>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`size-7 shrink-0 mt-1 mr-1 transition-opacity ${editMode ? "opacity-100" : "hidden"}`}
                        onClick={() => {
                          setEditExerciseQuestion(ex.question);
                          setEditExerciseSolution(ex.solution);
                          setEditingExerciseId(ex.id);
                        }}
                        title={tv("common.edit")}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                    <CollapsibleContent>
                      <div className="flex items-start gap-0 bg-emerald-500/5">
                        <span className="shrink-0 w-8 pt-3.5 text-center text-xs font-bold text-emerald-600/60">
                          解
                        </span>
                        <div className="flex-1 px-3 py-3.5 text-base leading-relaxed border-l border-emerald-500/20">
                          <Markdown content={ex.solution} />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </>
                )}
              </div>
            </Collapsible>
          ))}
          {addingType === "exercise" ? (
            <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
              <Textarea
                value={newExerciseQuestion}
                onChange={(e) => setNewExerciseQuestion(e.target.value)}
                placeholder={tv("project.newExerciseQuestion")}
                className="text-sm min-h-15"
                autoFocus
              />
              <Textarea
                value={newExerciseSolution}
                onChange={(e) => setNewExerciseSolution(e.target.value)}
                placeholder={tv("project.exampleSolution")}
                className="text-sm min-h-15"
              />
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={handleAddExercise}
                  title={tv("common.save")}
                >
                  <Check className="size-3.5 text-emerald-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => {
                    setNewExerciseQuestion("");
                    setNewExerciseSolution("");
                    setAddingType(null);
                  }}
                  title={tv("common.cancel")}
                >
                  <X className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            editMode && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setAddingType("exercise")}
              >
                <Plus className="size-3.5" />
                {tv("project.addExercise")}
              </Button>
            )
          )}
        </div>
      </section>
      <div className="flex items-center justify-center gap-4 pt-2 pb-24 md:pb-10">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={onPrev}
          className="gap-1 bg-background/40 backdrop-blur-md"
        >
          <ChevronLeft className="size-4" />
          {tv("common.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={onNext}
          className="gap-1 bg-background/40 backdrop-blur-md"
        >
          {tv("common.next")}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function GenerationPanel({
  tasks,
  minimized,
  leaving,
  onToggle,
  onCancel,
  onStopAll,
}: {
  tasks: { id: string; title: string; progress: string }[];
  minimized: boolean;
  leaving: boolean;
  onToggle: () => void;
  onCancel: (id: string) => void;
  onStopAll: () => void;
}) {
  const { t: pt } = useLocale();
  if (minimized && !leaving) return null;

  return (
    <div
      className={`fixed top-16 right-6 z-[60] animate-in fade-in slide-in-from-right-4 duration-200 ${
        leaving
          ? "animate-out fade-out slide-out-to-right-4 fill-mode-forwards"
          : ""
      }`}
    >
      <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 overflow-hidden w-72">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-violet-500 text-white">
          <span className="text-sm font-medium">
            {pt("notification.generating").replace(
              "{count}",
              String(tasks.length),
            )}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onStopAll}
              className="size-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
              title={pt("notification.stopAll")}
            >
              <X className="size-3.5" />
            </button>
            <button
              onClick={onToggle}
              className="size-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
              title={pt("notification.minimize")}
            >
              <Minus className="size-4" />
            </button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30"
            >
              <Loader2 className="size-4 animate-spin text-violet-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.progress}</p>
              </div>
              <button
                onClick={() => onCancel(task.id)}
                className="size-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/20 shrink-0 transition-colors"
                title={pt("common.cancel")}
              >
                <X className="size-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
