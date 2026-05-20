"use client";

import type { AIModel } from "@/lib/study-data-server";

const SETTINGS_KEY = "nextbook-settings";

export function getModelConfig(modelId: string): AIModel | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return undefined;
    const settings = JSON.parse(raw);
    return settings.models?.find((m: AIModel) => m.modelId === modelId);
  } catch {
    return undefined;
  }
}

export function getAllModelConfigs(): AIModel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return [];
    const settings = JSON.parse(raw);
    return settings.models || [];
  } catch {
    return [];
  }
}

export async function chatCompletion(
  modelId: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
): Promise<string> {
  const model = getModelConfig(modelId);
  if (!model) throw new Error(`Model "${modelId}" not configured.`);
  if (!model.apiKey) throw new Error(`API key for "${model.name}" is not set.`);

  const isAnthropic =
    model.apiUrl.includes("anthropic.com") ||
    model.modelId.startsWith("claude");

  if (isAnthropic) {
    return anthropicCompletion(model, messages, options);
  }
  return openAICompletion(model, messages, options);
}

// ── OpenAI-compatible API ────────────────────────────────────────────────

async function openAICompletion(
  model: AIModel,
  messages: { role: string; content: string }[],
  options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
): Promise<string> {
  const baseUrl = model.apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${model.apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? model.maxOutputTokens ?? 2048,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  // DeepSeek V4 Flash (and other reasoning models) may return
  // the response in `reasoning_content` while `content` is empty.
  const result = message?.content || message?.reasoning_content || "";

  // Log warning if finish_reason is not "stop" (e.g. "length" = truncated)
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason && finishReason !== "stop") {
    console.warn(
      `[ai-service] Completion finished with reason "${finishReason}". ` +
        `Consider increasing max_tokens. Response length: ${result.length}`,
    );
  }

  return result;
}

// ── Anthropic API ────────────────────────────────────────────────────────

async function anthropicCompletion(
  model: AIModel,
  messages: { role: string; content: string }[],
  options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const baseUrl = model.apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": model.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model.modelId,
      system: systemMsg?.content || "",
      messages: chatMessages,
      max_tokens: options?.maxTokens ?? model.maxOutputTokens ?? 2048,
      temperature: options?.temperature ?? 0.7,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// Legacy streaming functions - stub
export async function chatCompletionStream(
  modelId: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<ReadableStream<Uint8Array>> {
  return new ReadableStream();
}
