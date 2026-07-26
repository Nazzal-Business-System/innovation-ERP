"use client";

import { useCallback, useRef, type KeyboardEvent, type ReactNode } from "react";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  minHeightClassName?: string;
  className?: string;
  placeholder?: string;
  toolbarExtra?: ReactNode;
};

type WrapOptions = {
  prefix: string;
  suffix?: string;
  block?: boolean;
  placeholder?: string;
};

function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  options: WrapOptions
): { next: string; selectionStart: number; selectionEnd: number } {
  const { prefix, suffix = prefix, block = false, placeholder = "text" } = options;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const before = value.slice(0, start);
  const after = value.slice(end);

  if (block) {
    const needsLeadingNewline = before.length > 0 && !before.endsWith("\n");
    const needsTrailingNewline = after.length > 0 && !after.startsWith("\n");
    const inserted = `${needsLeadingNewline ? "\n" : ""}${prefix}${selected}${suffix}${needsTrailingNewline ? "\n" : ""}`;
    const next = `${before}${inserted}${after}`;
    const selectionStart = before.length + (needsLeadingNewline ? 1 : 0) + prefix.length;
    return {
      next,
      selectionStart,
      selectionEnd: selectionStart + selected.length,
    };
  }

  const next = `${before}${prefix}${selected}${suffix}${after}`;
  return {
    next,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selected.length,
  };
}

function prefixLines(
  textarea: HTMLTextAreaElement,
  value: string,
  linePrefix: string
): { next: string; selectionStart: number; selectionEnd: number } {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split("\n")
    .map((line) => (line.startsWith(linePrefix) ? line : `${linePrefix}${line || "item"}`))
    .join("\n");
  const next = `${value.slice(0, lineStart)}${prefixed}${value.slice(lineEnd)}`;
  return {
    next,
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length,
  };
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  disabled,
  required,
  minHeightClassName = "min-h-[18rem]",
  className,
  placeholder,
  toolbarExtra,
}: MarkdownEditorProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyEdit = useCallback(
    (result: { next: string; selectionStart: number; selectionEnd: number }) => {
      onChange(result.next);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [onChange]
  );

  const runWrap = useCallback(
    (options: WrapOptions) => {
      const el = textareaRef.current;
      if (!el || disabled) return;
      applyEdit(wrapSelection(el, value, options));
    },
    [applyEdit, disabled, value]
  );

  const runPrefix = useCallback(
    (linePrefix: string) => {
      const el = textareaRef.current;
      if (!el || disabled) return;
      applyEdit(prefixLines(el, value, linePrefix));
    },
    [applyEdit, disabled, value]
  );

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (disabled) return;
    const meta = event.metaKey || event.ctrlKey;
    if (!meta) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      runWrap({ prefix: "**", suffix: "**", placeholder: "bold" });
    } else if (key === "i") {
      event.preventDefault();
      runWrap({ prefix: "_", suffix: "_", placeholder: "italic" });
    } else if (key === "k") {
      event.preventDefault();
      runWrap({ prefix: "[", suffix: "](https://)", placeholder: "link text" });
    }
  }

  const tools = [
    {
      id: "h1",
      label: t("markdown.heading1", "Heading 1"),
      icon: Heading1,
      onClick: () => runPrefix("# "),
    },
    {
      id: "h2",
      label: t("markdown.heading2", "Heading 2"),
      icon: Heading2,
      onClick: () => runPrefix("## "),
    },
    {
      id: "bold",
      label: t("markdown.bold", "Bold"),
      icon: Bold,
      onClick: () => runWrap({ prefix: "**", suffix: "**", placeholder: "bold" }),
    },
    {
      id: "italic",
      label: t("markdown.italic", "Italic"),
      icon: Italic,
      onClick: () => runWrap({ prefix: "_", suffix: "_", placeholder: "italic" }),
    },
    {
      id: "ul",
      label: t("markdown.bulletList", "Bullet list"),
      icon: List,
      onClick: () => runPrefix("- "),
    },
    {
      id: "ol",
      label: t("markdown.numberedList", "Numbered list"),
      icon: ListOrdered,
      onClick: () => runPrefix("1. "),
    },
    {
      id: "link",
      label: t("markdown.link", "Link"),
      icon: Link2,
      onClick: () => runWrap({ prefix: "[", suffix: "](https://)", placeholder: "link text" }),
    },
    {
      id: "code",
      label: t("markdown.codeBlock", "Code block"),
      icon: Code2,
      onClick: () =>
        runWrap({ prefix: "```\n", suffix: "\n```", block: true, placeholder: "code" }),
    },
    {
      id: "quote",
      label: t("markdown.quote", "Quote"),
      icon: Quote,
      onClick: () => runPrefix("> "),
    },
    {
      id: "hr",
      label: t("markdown.horizontalRule", "Horizontal rule"),
      icon: Minus,
      onClick: () => runWrap({ prefix: "\n---\n", suffix: "", block: true, placeholder: "" }),
    },
  ] as const;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--card)]", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 px-2 py-1.5">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={disabled}
            onClick={tool.onClick}
            aria-label={tool.label}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" aria-hidden />
          </Button>
        ))}
        {toolbarExtra ? <div className="ms-auto flex items-center gap-2">{toolbarExtra}</div> : null}
      </div>

      <Tabs defaultValue="write" className="gap-0">
        <div className="border-b border-[var(--border-subtle)] px-3 pt-2">
          <TabsList className="h-8">
            <TabsTrigger value="write" className="h-7 px-3 text-xs">
              {t("markdown.write", "Write")}
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-7 px-3 text-xs">
              {t("markdown.preview", "Preview")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write" className="mt-0">
          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            required={required}
            placeholder={placeholder ?? t("markdown.placeholder", "Write Markdown content…")}
            className={cn(
              textareaClassName,
              "rounded-none border-0 shadow-none focus-visible:ring-0",
              minHeightClassName
            )}
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-0">
          <div className={cn("overflow-auto p-4", minHeightClassName)}>
            <MarkdownPreview
              content={value}
              emptyLabel={t("markdown.emptyPreview", "Nothing to preview yet.")}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
