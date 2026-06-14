"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Loader2,
  Paperclip,
  File,
} from "lucide-react";
import { chatCompletionStream } from "@/lib/ai-stream";
import { useLocale } from "@/lib/i18n";
import { Markdown } from "@/components/markdown";
import { extractTextFromPDF } from "@/lib/pdf-service";
import type { AppSettings } from "@/lib/study-data-server";

type AttachedFile = { name: string; content: string; type: string };

export function AIChatPanel({
  open,
  onClose,
  chapterTitle,
}: {
  open: boolean;
  onClose: () => void;
  chapterTitle?: string;
}) {
  const { t, locale } = useLocale();
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [panelWidth, setPanelWidth] = useState(380);
  const dragState = useRef({ startX: 0, startW: 0 });

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragState.current = { startX: e.clientX, startW: panelWidth };

      const onMove = (ev: MouseEvent) => {
        const delta = dragState.current.startX - ev.clientX;
        setPanelWidth(
          Math.max(280, Math.min(800, dragState.current.startW + delta)),
        );
      };

      const onEnd = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
    },
    [panelWidth],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl) return;
    const newFiles: AttachedFile[] = [];
    for (const f of Array.from(fl)) {
      try {
        let content = "";
        if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
          content = await extractTextFromPDFFile(f);
        } else {
          content = await f.text();
        }
        newFiles.push({
          name: f.name,
          content: content.slice(0, 8000),
          type: f.type,
        });
      } catch {
        newFiles.push({
          name: f.name,
          content: "[无法读取文件内容]",
          type: f.type,
        });
      }
    }
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || loading) return;
    const userMsg =
      input.trim() || (files.length ? `[上传了 ${files.length} 个文件]` : "");
    if (!userMsg) return;

    const fileContext = files
      .map((f) => `--- 文件: ${f.name} ---\n${f.content}`)
      .join("\n\n");
    const fullContent = fileContext
      ? `${fileContext}\n\n--- 用户问题 ---\n${userMsg}`
      : userMsg;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content:
          userMsg +
          (files.length ? `\n\n📎 已附加 ${files.length} 个文件` : ""),
      },
    ]);
    setInput("");
    setFiles([]);
    setLoading(true);

    try {
      const raw = localStorage.getItem("nextbook-settings");
      if (!raw) {
        setMessages((p) => [
          ...p,
          { role: "assistant", content: t("project.aiNoApiKey") },
        ]);
        setLoading(false);
        return;
      }
      const settings: AppSettings = JSON.parse(raw);
      const model = settings.models.find((m) => m.modelId === settings.qaModel);
      if (!model?.apiKey) {
        setMessages((p) => [
          ...p,
          { role: "assistant", content: t("project.aiNoApiKey") },
        ]);
        setLoading(false);
        return;
      }

      const systemPrompt = locale?.startsWith("en")
        ? `You are a learning assistant. Current chapter: ${chapterTitle || "Unknown"}. Please reply in English using Markdown format, LaTeX for math formulas ($...$ inline, $$...$$ block). If files are uploaded, base your answers on their content.`
        : locale?.startsWith("ja")
          ? `あなたは学習アシスタントです。現在の章: ${chapterTitle || "不明"}。日本語で回答し、Markdown形式とLaTeX数式（行内$...$、ブロック$$...$$）を使用してください。ファイルがアップロードされた場合、その内容に基づいて回答してください。`
          : `你是一个学习助手。当前章节：${chapterTitle || "未知"}。请使用Markdown格式回复，数学公式用LaTeX（行内$...$，块级$$...$$）。如果用户上传了文件内容，请基于文件内容回答问题。`;

      const stream = chatCompletionStream(
        settings.qaModel,
        [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: fullContent },
        ],
        { temperature: 0.7 },
      );

      // Add empty assistant message and stream into it
      setMessages((p) => [...p, { role: "assistant", content: "" }]);
      for await (const chunk of stream) {
        setMessages((p) => {
          const last = p[p.length - 1];
          if (last?.role !== "assistant") return p;
          const updated = [...p];
          updated[updated.length - 1] = {
            ...last,
            content: last.content + chunk,
          };
          return updated;
        });
      }
    } catch (e) {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content:
            t("project.aiError") +
            ": " +
            (e instanceof Error ? e.message : "Unknown"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "border-l bg-card/60 backdrop-blur-md transition-all duration-300 flex flex-col relative",
        "max-md:fixed max-md:z-50 max-md:bottom-16 max-md:left-0 max-md:right-0 max-md:rounded-t-2xl max-md:shadow-2xl max-md:border max-md:border-border/50",
        "md:sticky md:top-14 md:h-[calc(100vh-3.5rem)]",
        open
          ? "max-md:h-[50vh]"
          : "max-md:h-0 max-md:overflow-hidden max-md:border-0 max-md:opacity-0 max-md:pointer-events-none md:w-0 md:overflow-hidden md:border-l-0",
      )}
      style={open ? { width: panelWidth } : undefined}
    >
      {/* Drag handle */}
      {open && (
        <div
          className="absolute -left-1 top-0 w-2 h-full cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-20 hidden md:block"
          onMouseDown={onDragStart}
        />
      )}
      <div className="shrink-0 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            {t("project.aiChat")}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        {chapterTitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {t("project.currentChapter")}: {chapterTitle}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {t("project.aiChatPrompt")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("project.aiChatHint")}
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col gap-1 max-w-[90%] text-sm",
                msg.role === "user" ? "ml-auto items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "rounded-lg px-3 py-2",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {msg.role === "assistant" ? (
                  <Markdown content={msg.content} />
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("project.aiThinking")}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Attached files */}
      {files.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-t space-y-1">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs bg-muted rounded-md px-2 py-1"
            >
              <File className="size-3 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="shrink-0 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 p-3 border-t">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.py,.java,.cpp"
          onChange={handleFileUpload}
        />
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title={t("project.uploadFile")}
          >
            <Paperclip className="size-4" />
          </Button>
          <input
            className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            placeholder={t("project.aiPlaceholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            className="size-9 shrink-0"
            onClick={handleSend}
            disabled={(!input.trim() && files.length === 0) || loading}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

async function extractTextFromPDFFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        resolve(await extractTextFromPDF(reader.result as string));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
