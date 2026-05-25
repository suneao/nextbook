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
import {
  saveProject,
  loadAllProjects,
  deleteProjectStorage,
} from "@/lib/storage";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
  // Handle plain text content (not a data URL)
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

  const [project, setProject] = useState<Project | null>(null);
  const [selectedSubChapterId, setSelectedSubChapterId] = useState<
    string | null
  >(null);
  const { toast } = useToast();
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
  const [generatingToast, setGeneratingToast] = useState(false);
  const dragStart = useRef({ mx: 0, w: 280 });
  const [materialsHeight, setMaterialsHeight] = useState(200);
  const [draggingMaterials, setDraggingMaterials] = useState(false);
  const materialsDragStart = useRef({ my: 0, h: 200 });
  const [loaded, setLoaded] = useState(false);
  // Sidebar resize via drag
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStart.current.mx;
      const w = Math.max(200, Math.min(500, dragStart.current.w + delta));
      setSidebarWidth(w);
    };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  // Materials divider resize via drag
  useEffect(() => {
    if (!draggingMaterials) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = materialsDragStart.current.my - e.clientY;
      const h = Math.max(
        80,
        Math.min(600, materialsDragStart.current.h + delta),
      );
      setMaterialsHeight(h);
    };
    const handleMouseUp = () => setDraggingMaterials(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingMaterials]);

  const toggleSidebar = () => {
    setSidebarWidth((w) => (w === 0 ? 280 : 0));
  };
  const [uploading, setUploading] = useState(false);
  const [regenScId, setRegenScId] = useState(null);
  const [regenInstructions, setRegenInstructions] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
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
    // 只重置目录宽度，保留旧内容避免骨架屏闪屏
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarWidth(280);
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
      setGeneratingToast(true);
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
        // Slice relevant portion to avoid context overflow across textbooks
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
          // Fallback: skip first 5% (TOC/preface) then take a window
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
        setGeneratingToast(false);
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

  // Returns the model's max context window in tokens for dynamic segment sizing.
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
    // Snapshot the project once — used for all saves during this run
    const initialProject = project;
    const controller = new AbortController();
    abortRef.current = controller;
    setAnalyzing(true);
    setGeneratingToast(true);
    setAnalysisStatus(t("project.analyzingPdf"));
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

      // Dynamically compute segment size
      const modelContext = getModelContextTokens(chapterModelId);
      const maxInputTokens = Math.floor(modelContext * 0.5);
      const MARKER_INTERVAL = 10000;
      const SEGMENT_SIZE = Math.min(
        maxInputTokens * 3,
        1000000,
        pdfText.length,
      );
      const totalSegments = Math.ceil(pdfText.length / SEGMENT_SIZE);

      setAnalysisStatus(t("project.analyzingStructure"));

      // Analyze chapters in segments to stay under token limits
      let chapters: Chapter[] = [];

      for (let seg = 0; seg < totalSegments; seg++) {
        if (controller.signal.aborted) return;
        if (totalSegments > 1) {
          setAnalysisStatus(
            t("project.analyzingStructure") +
              " (" +
              (seg + 1) +
              "/" +
              totalSegments +
              ")",
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
        // Merge: check for overlapping chapters between segments.
        // Only merge if positionally adjacent — avoid conflating same-named
        // chapters from different textbooks.
        for (const ch of segChapters) {
          const newFirstSC = ch.subChapters[0];
          const dup = chapters.find((existing) => {
            const existingLastSC =
              existing.subChapters[existing.subChapters.length - 1];
            // Title-based match
            const titleMatch =
              existing.title === ch.title ||
              (existingLastSC &&
                newFirstSC &&
                existingLastSC.title === newFirstSC.title);
            if (!titleMatch) return false;
            // Position-based check: only merge if chapters are physically adjacent
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
              // Allow up to 2× SEGMENT_SIZE gap for cross-segment continuity
              if (Math.abs(newPos - lastPos) > SEGMENT_SIZE * 2) return false;
            }
            return true;
          });
          if (dup) {
            // Merge subchapters, avoiding duplicates at the boundary
            const existingLast = dup.subChapters[dup.subChapters.length - 1];
            const newFirst = ch.subChapters[0];
            if (
              existingLast &&
              newFirst &&
              existingLast.title === newFirst.title
            ) {
              // Overlapping boundary subchapter — skip the duplicate
              ch.subChapters.shift();
            }
            for (const sc of ch.subChapters) {
              dup.subChapters.push(sc);
            }
          } else {
            ch.order = chapters.length;
            chapters.push(ch);
          }
        }
      }

      if (controller.signal.aborted) return;

      // Use posMarker values directly as textStart, link textEnd from next
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

      setProject({ ...initialProject, chapters });

      let failedCount = 0;
      for (let ci = 0; ci < chapters.length; ci++) {
        for (let si = 0; si < chapters[ci].subChapters.length; si++) {
          if (controller.signal.aborted) {
            setAnalysisStatus(t("project.stopped"));
            return;
          }
          const sc = chapters[ci].subChapters[si];
          const textStart = sc.textStart ?? Math.floor(pdfText.length * 0.05);
          const textEnd = sc.textEnd ?? pdfText.length;
          const sliceStart = Math.max(0, textStart - 500);
          const sliceEnd = Math.min(
            pdfText.length,
            Math.max(textEnd + 500, textStart + 50000),
          );
          const chapterText = pdfText.slice(sliceStart, sliceEnd);
          setAnalysisStatus(
            t("project.extracting") +
              " (" +
              (ci + 1) +
              "/" +
              chapters.length +
              t("project.chapterOf") +
              ": " +
              sc.title +
              "...",
          );
          try {
            const knowledge = await extractKnowledgePoints(
              chapterText,
              sc.title,
              chapterModelId,
              controller.signal,
              settings.language,
            );
            if (controller.signal.aborted) return;
            // Immutable update — build a new chapters array
            const updatedSubChapter = {
              ...sc,
              knowledgePoints: knowledge.knowledgePoints,
              examples: knowledge.examples,
              exercises: knowledge.exercises,
            };
            const updatedSubChapters = [...chapters[ci].subChapters];
            updatedSubChapters[si] = updatedSubChapter;
            const updatedChapter = {
              ...chapters[ci],
              subChapters: updatedSubChapters,
            };
            const updatedChapters = [...chapters];
            updatedChapters[ci] = updatedChapter;
            chapters = updatedChapters;
            // Update UI state after each subchapter so user sees progress
            setProject({ ...initialProject, chapters });
          } catch (e) {
            if (controller.signal.aborted) return;
            failedCount++;
            console.warn(
              "[chapter-ai] Failed to extract knowledge for subchapter:",
              sc.title,
              e,
            );
          }
        }
      }
      // Single final save to disk with fully-populated chapters
      if (!controller.signal.aborted) {
        await saveProject({ ...initialProject, chapters });
        // Success notification and JSON download
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
          // Download chapters as JSON
          const exportData = chapters.map((ch) => ({
            chapter: ch.title,
            subChapters: ch.subChapters.map((sc) => ({
              title: sc.title,
              posMarker: sc.posMarker,
              endPosMarker: sc.endPosMarker,
              knowledgePoints: sc.knowledgePoints.map((kp) => ({
                title: kp.title,
                content: kp.content,
              })),
              examples: sc.examples.map((ex) => ({
                question: ex.question,
                solution: ex.solution,
              })),
              exercises: sc.exercises.map((hw) => ({
                question: hw.question,
                solution: hw.solution,
              })),
            })),
          }));
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${initialProject.name}_chapters.json`;
          a.click();
          URL.revokeObjectURL(url);
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
      if (e instanceof Error && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : String(e);
      toast("Analysis failed: " + msg, "error");
    } finally {
      setAnalyzing(false);
      setGeneratingToast(false);
      if (!controller.signal.aborted) {
        setAnalysisStatus("");
      }
      abortRef.current = null;
    }
  }, [project, updateProject]);

  const handleStopAnalysis = useCallback(() => {
    abortRef.current?.abort();
    setGeneratingToast(false);
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
        toast("Please configure API Key first", "warning");
        return;
      }

      const validTextbooks = project.textbooks.filter((tb) => tb.fileData);
      if (validTextbooks.length === 0) return;

      const chapterIndex = project.chapters.findIndex(
        (ch) => ch.id === chapterId,
      );
      if (chapterIndex === -1) return;

      // Snapshot project once
      const initialProject = project;
      const controller = new AbortController();
      abortRef.current = controller;
      const settings_lang: string =
        JSON.parse(localStorage.getItem("nextbook-settings") || "{}")
          .language || "zh-CN";
      setAnalyzing(true);
      try {
        const pdfTexts = await Promise.all(
          validTextbooks.map((tb) => extractTextFromPDF(tb.fileData!)),
        );
        const pdfText = validTextbooks
          .map((tb, i) => {
            const label =
              settings_lang === "en-US"
                ? `Textbook ${i + 1}: ${tb.name}`
                : settings_lang === "ja-JP"
                  ? `教科書${i + 1}：${tb.name}`
                  : `教材${i + 1}：${tb.name}`;
            return `\n\n【${label}】\n\n${pdfTexts[i]}`;
          })
          .join("");
        if (controller.signal.aborted) return;

        // Build a new chapters array immutably
        let chapters = initialProject.chapters;
        let failedCount = 0;
        const subChapters = chapters[chapterIndex].subChapters;

        for (let si = 0; si < subChapters.length; si++) {
          if (controller.signal.aborted) {
            setAnalysisStatus(t("project.stopped"));
            return;
          }
          const sc = subChapters[si];
          setAnalysisStatus(
            t("project.regenerateTitle") + ": " + sc.title + "...",
          );
          try {
            const textStart = sc.textStart ?? Math.floor(pdfText.length * 0.05);
            const textEnd = sc.textEnd ?? pdfText.length;
            const chapterText = pdfText.slice(
              Math.max(0, textStart - 500),
              Math.min(
                pdfText.length,
                Math.max(textEnd + 500, textStart + 50000),
              ),
            );
            const knowledge = await extractKnowledgePoints(
              chapterText,
              sc.title,
              modelId,
              controller.signal,
              settings.language,
            );
            if (controller.signal.aborted) return;
            // Immutable update
            const updatedSubChapters = [...chapters[chapterIndex].subChapters];
            updatedSubChapters[si] = {
              ...sc,
              knowledgePoints: knowledge.knowledgePoints,
              examples: knowledge.examples,
              exercises: knowledge.exercises,
            };
            const updatedChapters = [...chapters];
            updatedChapters[chapterIndex] = {
              ...chapters[chapterIndex],
              subChapters: updatedSubChapters,
            };
            chapters = updatedChapters;
            setProject({ ...initialProject, chapters });
          } catch (e) {
            if (controller.signal.aborted) return;
            failedCount++;
            console.warn(
              "[chapter-ai] Failed to regenerate subchapter:",
              sc.title,
              e,
            );
          }
        }
        if (failedCount > 0) {
          toast(failedCount + " section(s) failed to regenerate.", "warning");
        }
        if (!controller.signal.aborted) {
          await saveProject({ ...initialProject, chapters });
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        toast(
          "Regeneration failed: " +
            (e instanceof Error ? e.message : String(e)),
          "error",
        );
      } finally {
        setAnalyzing(false);
        if (!controller.signal.aborted) {
          setAnalysisStatus("");
        }
        abortRef.current = null;
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

  // Navigation: prev/next subchapter
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
      <div className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden">
        <div className="w-[280px] shrink-0 border-r bg-card/40 p-4 space-y-4">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="shrink-0 h-[41px] border-b bg-card/40" />
          <div className="flex-1" />
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
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden">
      {/* Hidden file inputs */}
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

      {/* Left Sidebar - toggle visibility on desktop, overlay on mobile */}
      {/* Mobile overlay */}
      {sidebarWidth > 0 && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setSidebarWidth(0)}
        />
      )}
      <div
        className={cn(
          "border-r bg-card/40 md:bg-transparent backdrop-blur-md md:backdrop-blur-none flex flex-col shrink-0",
          "max-md:rounded-r-2xl",
          sidebarWidth === 0 && "overflow-hidden border-r-0",
          "fixed top-14 left-0 bottom-0 z-50 md:static",
          "w-[85vw] md:w-auto",
          sidebarWidth > 0
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        )}
        style={{
          width: sidebarWidth,
          minWidth: 0,
          maxWidth: "85vw",
        }}
      >
        {/* Resize handle */}
        {sidebarWidth > 0 && (
          <div
            className="absolute top-0 -right-1.5 w-3 h-full cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-20"
            onMouseDown={(e) => {
              e.preventDefault();
              dragStart.current = { mx: e.clientX, w: sidebarWidth };
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
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => toggleSidebar()}
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-2">
            {/* Chapter Tree */}
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
                </div>
              </div>
              {analyzing && analysisStatus && (
                <div className="flex items-center gap-1 px-2 py-1">
                  <p className="text-xs text-violet-500 flex-1">
                    {analysisStatus}
                  </p>
                  <button
                    onClick={handleStopAnalysis}
                    className="size-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/20 shrink-0"
                    title={t("project.stopGenerate")}
                  >
                    <X className="size-3 text-red-500" />
                  </button>
                </div>
              )}
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
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Draggable divider between chapters and materials */}
        <div
          className="relative shrink-0 h-2 cursor-row-resize group hover:bg-primary/20 active:bg-primary/30 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            materialsDragStart.current = { my: e.clientY, h: materialsHeight };
            setDraggingMaterials(true);
          }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-0.5 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
        </div>

        {/* Materials Section with own scroll */}
        <div
          className="shrink-0 overflow-y-auto"
          style={{ height: materialsHeight }}
        >
          <div className="p-2 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
              {t("project.materials")}
            </p>

            {/* Textbooks */}
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

            {/* Exercises */}
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

            {/* Exams */}
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

      {/* Center: Study Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b bg-card/40 backdrop-blur-md min-h-[41px]">
          {sidebarWidth === 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => toggleSidebar()}
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

      {/* Generating Toast */}
      {generatingToast && (
        <GeneratingToast
          message={t("project.generating")}
          hint={t("project.generatingHint")}
          onClose={() => setGeneratingToast(false)}
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

// ── Material Section ────────────────────────────────────────────────────

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
  onDeleteSubChapter,
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
        {/* Right-side area: badge+count ↔ action buttons swap on hover */}
        <div className="relative shrink-0 flex items-center">
          {/* Badge + Count — visible by default, hidden on hover */}
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
          {/* Action buttons — hidden by default, visible on hover (overlays the same spot) */}
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
                    ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/20 backdrop-blur-md"
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

// ── Study Unit Viewer ───────────────────────────────────────────────────

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
      {/* ── Header ── */}
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

      {/* ── Knowledge Points ── */}
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
                  {/* Card header */}
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
                  {/* Card body */}
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
                className={`w-full border-dashed gap-1.5 text-muted-foreground hover:text-foreground transition-opacity ${editMode ? "opacity-100" : "hidden"}`}
                onClick={() => setAddingType("kp")}
              >
                <Plus className="size-3.5" />
                {tv("project.addKp")}
              </Button>
            )
          )}
        </div>
      </section>

      {/* ── Examples ── */}
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
                    {/* Question row */}
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
                    {/* Solution row */}
                    <CollapsibleContent>
                      <div className="flex items-start gap-0 bg-amber-500/5">
                        <span className="shrink-0 w-8 pt-3.5 text-center text-xs font-bold text-amber-600/60">
                          A
                        </span>
                        <div className="flex-1 px-3 py-3.5 text-base leading-relaxed border-l border-amber-500/20">
                          <Markdown content={ex.solution} />
                          {ex.relatedKnowledgePoints &&
                            ex.relatedKnowledgePoints.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-amber-500/20">
                                <span className="text-xs text-muted-foreground">
                                  关联知识点：
                                </span>
                                {ex.relatedKnowledgePoints.map((kp, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600"
                                  >
                                    {kp}
                                  </span>
                                ))}
                              </div>
                            )}
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
                className={`w-full border-dashed gap-1.5 text-muted-foreground hover:text-foreground transition-opacity ${editMode ? "opacity-100" : "hidden"}`}
                onClick={() => setAddingType("example")}
              >
                <Plus className="size-3.5" />
                {tv("project.addExample")}
              </Button>
            )
          )}
        </div>
      </section>

      {/* ── Exercises ── */}
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
                    {/* Question row */}
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
                    {/* Solution row */}
                    <CollapsibleContent>
                      <div className="flex items-start gap-0 bg-emerald-500/5">
                        <span className="shrink-0 w-8 pt-3.5 text-center text-xs font-bold text-emerald-600/60">
                          解
                        </span>
                        <div className="flex-1 px-3 py-3.5 text-base leading-relaxed border-l border-emerald-500/20">
                          <Markdown content={ex.solution} />
                          {ex.relatedKnowledgePoints &&
                            ex.relatedKnowledgePoints.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-emerald-500/20">
                                <span className="text-xs text-muted-foreground">
                                  关联知识点：
                                </span>
                                {ex.relatedKnowledgePoints.map((kp, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600"
                                  >
                                    {kp}
                                  </span>
                                ))}
                              </div>
                            )}
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
                className={`w-full border-dashed gap-1.5 text-muted-foreground hover:text-foreground transition-opacity ${editMode ? "opacity-100" : "hidden"}`}
                onClick={() => setAddingType("exercise")}
              >
                <Plus className="size-3.5" />
                {tv("project.addExercise")}
              </Button>
            )
          )}
        </div>
      </section>
      {/* Prev/Next navigation */}
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

// ── Generating Toast ──────────────────────────────────────────────────

function GeneratingToast({
  message,
  hint,
  onClose,
}: {
  message: string;
  hint: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-16 right-6 z-50 motion-preset-slide-down motion-duration-300">
      <div className="flex items-center gap-3 bg-amber-500 text-white px-5 py-3 rounded-xl shadow-2xl">
        <span className="relative flex size-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full size-3 bg-white"></span>
        </span>
        <div>
          <p className="text-sm font-semibold">{message}</p>
          <p className="text-xs text-amber-100">{hint}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 opacity-70 hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
