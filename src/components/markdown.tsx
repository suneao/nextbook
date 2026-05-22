"use client";

import { useMemo } from "react";
import katex from "katex";

function renderMarkdown(text: string): string {
  // Step 1: Extract and protect math formulas BEFORE HTML escaping
  const mathBlocks: string[] = [];
  const mathInlines: string[] = [];

  let html = text;

  // Protect block math: $$...$$ (strip newlines inside formulas)
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    mathBlocks.push(formula.replace(/\n/g, " ").trim());
    return `%%MATHBLOCK${mathBlocks.length - 1}%%`;
  });

  // Protect inline math: $...$ (strip newlines inside formulas)
  html = html.replace(/\$(.+?)\$/g, (_, formula) => {
    mathInlines.push(formula.replace(/\n/g, " ").trim());
    return `%%MATHINLINE${mathInlines.length - 1}%%`;
  });

  // Step 2: HTML escape the non-math content
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Step 3: Code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>',
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>',
  );

  // Bold / Italic / Highlight
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(
    /==(.+?)==/g,
    '<mark class="bg-yellow-200 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-200 rounded px-0.5">$1</mark>',
  );

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

  // Lists
  html = html.replace(
    /^- (.+)$/gm,
    '<li class="ml-4 list-disc text-sm">$1</li>',
  );
  html = html.replace(
    /((?:<li[^>]*>.*?<\/li>\n?)+)/g,
    '<ul class="my-1 space-y-0.5">$1</ul>',
  );
  html = html.replace(
    /^\d+\. (.+)$/gm,
    '<li class="ml-4 list-decimal text-sm">$1</li>',
  );

  // Paragraphs
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const t = block.trim();
      if (
        t.startsWith("<h") ||
        t.startsWith("<pre") ||
        t.startsWith("<ul") ||
        t.startsWith("<li") ||
        t.startsWith('<div class="my-')
      )
        return t;
      if (t) return `<p class="text-sm my-1">${t}</p>`;
      return "";
    })
    .join("\n");

  html = html.replace(/\n/g, "<br>");
  html = html.replace(/<br>\s*(<\/?(?:h[1-3]|pre|ul|li|p|div))/g, "$1");
  html = html.replace(/(<\/?(?:h[1-3]|pre|ul|li|p|div)[^>]*>)\s*<br>/g, "$1");

  // Step 4: Restore math formulas with KaTeX rendering
  html = html.replace(/%%MATHBLOCK(\d+)%%/g, (_, i) => {
    const formula = mathBlocks[parseInt(i)];
    try {
      return `<div class="my-3 flex justify-center overflow-x-auto">${katex.renderToString(formula, { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<div class="my-2 text-sm text-muted-foreground">$${formula}$</div>`;
    }
  });

  html = html.replace(/%%MATHINLINE(\d+)%%/g, (_, i) => {
    const formula = mathInlines[parseInt(i)];
    try {
      return katex.renderToString(formula, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `$${formula}$`;
    }
  });

  return html;
}

export function Markdown({
  content,
  inline = false,
}: {
  content: string;
  inline?: boolean;
}) {
  const html = useMemo(() => {
    let result = renderMarkdown(content);
    if (inline) {
      // Strip wrapping <p> tags for inline usage (e.g. titles, badges)
      result = result.replace(/^<p class="text-sm my-1">/, "");
      result = result.replace(/<\/p>$/, "");
    }
    return result;
  }, [content, inline]);

  if (inline) {
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className="max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
