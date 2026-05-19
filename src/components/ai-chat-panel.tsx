"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { chatCompletion } from "@/lib/ai-service";
import type { AppSettings } from "@/lib/study-data-server";

type AIChatPanelProps = {
  open: boolean;
  onClose: () => void;
  chapterTitle?: string;
};

export function AIChatPanel({ open, onClose, chapterTitle }: AIChatPanelProps) {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      // Load settings from localStorage
      const raw = localStorage.getItem("nextbook-settings");
      if (!raw) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "请先在设置中配置 API Key",
          },
        ]);
        setLoading(false);
        return;
      }

      const settings: AppSettings = JSON.parse(raw);
      const qaModelId = settings.qaModel;
      const qaModel = settings.models.find((m) => m.modelId === qaModelId);

      if (!qaModel || !qaModel.apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "请先在设置中配置 API Key",
          },
        ]);
        setLoading(false);
        return;
      }

      // Build messages with system prompt and context
      const systemPrompt = `你是一个学习助手，帮助用户解答关于课程内容的问题。当前章节：${chapterTitle || "未知"}。请用中文回答，简洁明了。`;

      const chatMessages: {
        role: "system" | "user" | "assistant";
        content: string;
      }[] = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: userMsg },
      ];

      const response = await chatCompletion(qaModelId, chatMessages, {
        temperature: 0.7,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `出错了：${error instanceof Error ? error.message : "未知错误"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "sticky top-14 h-[calc(100vh-3.5rem)] border-l bg-card/50 backdrop-blur transition-all duration-300 flex flex-col",
        open ? "w-[340px]" : "w-0 overflow-hidden border-l-0",
      )}
    >
      <Card className="h-full flex flex-col border-0 rounded-none bg-transparent shadow-none">
        {/* Header */}
        <CardHeader className="pb-3 shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-violet-500" />
              AI 答疑
            </CardTitle>
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
              当前：{chapterTitle}
            </p>
          )}
        </CardHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="size-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  有问题？向 AI 提问
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  可以询问知识点、例题或习题
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
                    "rounded-lg px-3 py-2 whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                AI 正在思考...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t shrink-0">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="输入你的问题..."
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
              disabled={!input.trim() || loading}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
