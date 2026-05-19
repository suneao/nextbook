"use client";

import { useMemo, useEffect, useRef } from "react";
import katex from "katex";

// ── Markdown Renderer ────────────────────────────────────────────────────

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Block math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="my-3 flex justify-center overflow-x-auto">${rendered}</div>`;
    } catch {
      return `<div class="my-2 text-sm text-muted-foreground">$${formula.trim()}$</div>`;
    }
  });

  // Inline math: $...$
  html = html.replace(/\$(.+?)\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `$${formula.trim()}$`;
    }
  });

  // Code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>',
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>',
  );

  // Bold / Italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Headers
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="text-sm font-semibold mt-4 mb-1">$1</h3>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="text-base font-semibold mt-4 mb-1">$1</h2>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="text-lg font-bold mt-4 mb-1">$1</h1>',
  );

  // Unordered lists
  html = html.replace(
    /^- (.+)$/gm,
    '<li class="ml-4 list-disc text-sm">$1</li>',
  );
  html = html.replace(
    /((?:<li[^>]*>.*?<\/li>\n?)+)/g,
    '<ul class="my-1 space-y-0.5">$1</ul>',
  );

  // Ordered lists
  html = html.replace(
    /^\d+\. (.+)$/gm,
    '<li class="ml-4 list-decimal text-sm">$1</li>',
  );

  // Paragraphs
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith('<div class="my-')
      ) {
        return trimmed;
      }
      if (trimmed) return `<p class="text-sm my-1">${trimmed}</p>`;
      return "";
    })
    .join("\n");

  html = html.replace(/\n/g, "<br>");
  html = html.replace(/<br>\s*(<\/?(?:h[1-3]|pre|ul|li|p|div))/g, "$1");
  html = html.replace(/(<\/?(?:h[1-3]|pre|ul|li|p|div)[^>]*>)\s*<br>/g, "$1");

  return html;
}

// ── Component ────────────────────────────────────────────────────────────

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div className="max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
