import type { AIModel } from "@/lib/study-data-server";
import { getModelConfig } from "./ai-service";

export async function* chatCompletionStream(
  modelId: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
): AsyncGenerator<string, void, unknown> {
  const model = getModelConfig(modelId);
  if (!model) throw new Error(`Model "${modelId}" not configured.`);
  if (!model.apiKey) throw new Error(`API key for "${model.name}" is not set.`);

  const isAnthropic =
    model.apiUrl.includes("anthropic.com") ||
    model.modelId.startsWith("claude");

  if (isAnthropic) {
    yield* anthropicStream(model, messages, options);
  } else {
    yield* openAIStream(model, messages, options);
  }
}

async function* openAIStream(
  model: AIModel,
  messages: { role: string; content: string }[],
  options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
): AsyncGenerator<string, void, unknown> {
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
      max_tokens: options?.maxTokens ?? model.maxOutputTokens ?? 16384,
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.text();
    let msg = err;
    try {
      const parsed = JSON.parse(err);
      msg = parsed?.error?.message || parsed?.message || err;
    } catch {}
    throw new Error(msg.length > 200 ? msg.slice(0, 200) + "..." : msg);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* anthropicStream(
  model: AIModel,
  messages: { role: string; content: string }[],
  options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal },
): AsyncGenerator<string, void, unknown> {
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
      max_tokens: options?.maxTokens ?? model.maxOutputTokens ?? 16384,
      temperature: options?.temperature ?? 0.7,
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const err = await res.text();
    let msg = err;
    try {
      const parsed = JSON.parse(err);
      msg = parsed?.error?.message || parsed?.message || err;
    } catch {}
    throw new Error(msg.length > 200 ? msg.slice(0, 200) + "..." : msg);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          if (json.type === "content_block_delta") {
            const text = json.delta?.text;
            if (text) yield text;
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}
