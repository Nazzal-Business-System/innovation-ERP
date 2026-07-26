"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  emptyLabel?: string;
}

export function MarkdownPreview({ content, className, emptyLabel }: MarkdownPreviewProps) {
  const trimmed = content.trim();

  if (!trimmed) {
    return emptyLabel ? (
      <p className="text-sm text-[var(--muted)]">{emptyLabel}</p>
    ) : null;
  }

  return (
    <div className={cn("ierp-markdown", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            const isBlock = codeClass?.includes("language-");
            if (isBlock) {
              return (
                <code className={cn("block font-mono text-[0.85em]", codeClass)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--foreground)]"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
