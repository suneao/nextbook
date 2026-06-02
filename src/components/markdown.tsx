"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";

export function Markdown({
  content,
  inline = false,
}: {
  content: string;
  inline?: boolean;
}) {
  const components: Components = useMemo(
    () => ({
      p: ({ children, ...props }) => (
        <p className="text-sm my-1" {...props}>
          {children}
        </p>
      ),
      del: ({ children, ...props }) => (
        <mark
          className="bg-yellow-200 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-200 rounded px-0.5"
          {...props}
        >
          {children}
        </mark>
      ),
      pre: ({ children, ...props }) => (
        <pre
          className="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs"
          {...props}
        >
          {children}
        </pre>
      ),
      code: ({ children, ...props }) => (
        <code
          className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
          {...props}
        >
          {children}
        </code>
      ),
      table: ({ children, ...props }) => (
        <div className="my-2 overflow-x-auto">
          <table
            className="w-full border-collapse border rounded-lg"
            {...props}
          >
            {children}
          </table>
        </div>
      ),
      th: ({ children, ...props }) => (
        <th
          className="border px-3 py-1.5 text-xs font-semibold bg-muted"
          {...props}
        >
          {children}
        </th>
      ),
      td: ({ children, ...props }) => (
        <td className="border px-3 py-1.5 text-xs" {...props}>
          {children}
        </td>
      ),
      blockquote: ({ children, ...props }) => (
        <blockquote
          className="border-l-4 border-muted-foreground/30 pl-4 my-2 text-sm text-muted-foreground italic"
          {...props}
        >
          {children}
        </blockquote>
      ),
      ul: ({ children, ...props }) => (
        <ul className="my-1 space-y-0.5 list-disc pl-5 text-sm" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol className="my-1 space-y-0.5 list-decimal pl-5 text-sm" {...props}>
          {children}
        </ol>
      ),
      h1: ({ children, ...props }) => (
        <h1 className="text-lg font-bold mt-4 mb-1" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2 className="text-base font-semibold mt-4 mb-1" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 className="text-sm font-semibold mt-4 mb-1" {...props}>
          {children}
        </h3>
      ),
    }),
    [],
  );

  const rendered = useMemo(() => {
    let text = content;
    // Convert literal \n and \r to actual newlines (outside LaTeX commands)
    text = text
      .replace(/\\n(?![a-zA-Z])/g, "\n")
      .replace(/\\r(?![a-zA-Z])/g, "\r");
    // Convert LaTeX delimiters: \(...\) → $...$, \[...\] → $$...$$
    text = text.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
    text = text.replace(/\\\[/g, "$$").replace(/\\\]/g, "$$");
    text = text.replace(/==(.+?)==/g, "~~$1~~");

    // Convert single newlines to double for paragraph breaks (outside math)
    // Protect inline math and block math from newline doubling
    const mathProtected: string[] = [];
    text = text.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
      mathProtected.push(m);
      return `%%MP${mathProtected.length - 1}%%`;
    });
    text = text.replace(/\$[\s\S]+?\$/g, (m) => {
      mathProtected.push(m);
      return `%%MP${mathProtected.length - 1}%%`;
    });
    // Double newlines outside math
    text = text.replace(/\n/g, "\n\n");
    // Restore math
    text = text.replace(/%%MP(\d+)%%/g, (_, i) => {
      return mathProtected[parseInt(i)];
    });
    // Clean up excessive newlines
    text = text.replace(/\n{3,}/g, "\n\n");

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    );
  }, [content, components]);

  if (inline) {
    return <span>{rendered}</span>;
  }
  return <div className="max-w-none">{rendered}</div>;
}
