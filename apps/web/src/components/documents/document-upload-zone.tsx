"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/components/documents/documents-columns";
import { parseFileMeta, type ParsedFileMeta } from "@/lib/document-file-utils";
import { useI18n } from "@/lib/i18n";

export interface SelectedUploadFile {
  file: File;
  meta: ParsedFileMeta;
  previewUrl: string | null;
}

interface DocumentUploadZoneProps {
  value: SelectedUploadFile | null;
  onChange: (file: SelectedUploadFile | null) => void;
  disabled?: boolean;
}

export function DocumentUploadZone({ value, onChange, disabled }: DocumentUploadZoneProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      const meta = parseFileMeta(file);
      let previewUrl: string | null = null;
      if (meta.previewKind === "image" || meta.previewKind === "pdf") {
        previewUrl = URL.createObjectURL(file);
      }
      onChange({ file, meta, previewUrl });
    },
    [onChange]
  );

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    void processFile(file);
  }

  function clearFile() {
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (value) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
            {value.meta.previewKind === "image" && value.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.previewUrl} alt="" className="h-full w-full rounded-lg object-cover" />
            ) : value.meta.previewKind === "pdf" ? (
              <FileText className="h-8 w-8 text-[var(--accent)]" aria-hidden />
            ) : (
              <ImageIcon className="h-8 w-8 text-[var(--accent)]" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{value.meta.fileName}</p>
            <p className="text-sm text-[var(--muted)]">
              {value.meta.mimeType} · {formatBytes(value.meta.fileSize)}
              {value.meta.extension ? ` · .${value.meta.extension}` : ""}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{t("documents.uploadReady")}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="cursor-pointer shrink-0"
            onClick={clearFile}
            disabled={disabled}
            aria-label={t("documents.removeFile")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragOver
          ? "border-[var(--accent)] bg-[var(--accent-muted)]"
          : "border-[var(--border-subtle)] bg-[var(--muted-bg)]/30",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-muted)]">
        <Upload className="h-7 w-7 text-[var(--accent)]" aria-hidden />
      </div>
      <p className="text-sm font-medium">{t("documents.dragDropTitle")}</p>
      <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{t("documents.dragDropHint")}</p>
      <Button
        type="button"
        variant="secondary"
        className="mt-4 cursor-pointer"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {t("documents.chooseFromDevice")}
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
    </div>
  );
}
