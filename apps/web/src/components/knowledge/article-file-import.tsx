"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/forms/action-feedback";
import {
  importArticleFromFile,
  mapArticleImportError,
  type ArticleImportResult,
} from "@/lib/knowledge/article-import";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ArticleFileImportProps = {
  disabled?: boolean;
  onImported: (result: ArticleImportResult) => void;
  className?: string;
};

export function ArticleFileImport({ disabled, onImported, className }: ArticleFileImportProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file || pending || disabled) return;
    setPending(true);
    setError(null);
    try {
      const result = await importArticleFromFile(file);
      onImported(result);
    } catch (err) {
      setError(mapArticleImportError(err, t));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    void handleFile(file);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted-bg)]/30 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
          dragging && "border-[var(--accent)] bg-[var(--accent-muted)]/40",
          disabled && "opacity-60"
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("knowledge.importFromFile", "Import from file")}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {t(
              "knowledge.importHint",
              "TXT, Markdown, or DOCX — up to 2 MB. Content is imported as editable draft text."
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={disabled || pending}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || pending}
            loading={pending}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" aria-hidden />
            {t("knowledge.chooseFile", "Choose file")}
          </Button>
        </div>
      </div>
      <ActionFeedback error={error} />
    </div>
  );
}
