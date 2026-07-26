"use client";

import { useMemo } from "react";
import {
  FileSpreadsheet,
  FileText,
  FileType,
  ImageIcon,
  FileQuestion,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPreviewKind } from "@/lib/document-file-utils";
import { getDocumentPreview } from "@/lib/document-preview-store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface DocumentPreviewerProps {
  documentId: string;
  fileName: string;
  mimeType: string;
  fileUrl: string;
  title?: string;
  className?: string;
  compact?: boolean;
}

function PlaceholderCard({
  icon: Icon,
  label,
  hint,
  compact,
}: {
  icon: typeof FileText;
  label: string;
  hint: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 text-center",
        compact ? "min-h-[200px] p-6" : "min-h-[420px] p-10"
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
        <Icon className="h-8 w-8 text-[var(--accent)]" aria-hidden />
      </div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 max-w-xs text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}

export function DocumentPreviewer({
  documentId,
  fileName,
  mimeType,
  fileUrl,
  title,
  className,
  compact,
}: DocumentPreviewerProps) {
  const { t } = useI18n();

  const stored = useMemo(() => getDocumentPreview(documentId), [documentId]);
  const previewUrl = stored?.dataUrl || fileUrl;
  const effectiveMime = stored?.mimeType || mimeType;
  const kind = getPreviewKind(effectiveMime, fileName);
  const isLocalPreview = Boolean(stored?.dataUrl);

  if (kind === "image" && (isLocalPreview || previewUrl.startsWith("blob:") || previewUrl.startsWith("data:"))) {
    return (
      <Card className={cn("overflow-hidden border-[var(--border-subtle)]", className)}>
        <CardContent className="p-0">
          <div className={cn("flex items-center justify-center bg-[var(--muted-bg)]/30", compact ? "min-h-[200px]" : "min-h-[420px]")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={title ?? fileName}
              className="max-h-[520px] max-w-full object-contain p-4"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (kind === "pdf" && isLocalPreview) {
    return (
      <Card className={cn("overflow-hidden border-[var(--border-subtle)]", className)}>
        <CardContent className="p-0">
          <iframe
            src={previewUrl}
            title={title ?? fileName}
            className={cn("w-full border-0 bg-white", compact ? "h-[240px]" : "h-[520px]")}
          />
        </CardContent>
      </Card>
    );
  }

  if (kind === "pdf") {
    return (
      <PlaceholderCard
        icon={FileText}
        label={t("documents.previewPdfPlaceholder")}
        hint={t("documents.previewPdfHint")}
        compact={compact}
      />
    );
  }

  if (kind === "word") {
    return (
      <PlaceholderCard
        icon={FileType}
        label={t("documents.previewWordPlaceholder")}
        hint={t("documents.previewOfficeHint")}
        compact={compact}
      />
    );
  }

  if (kind === "excel") {
    return (
      <PlaceholderCard
        icon={FileSpreadsheet}
        label={t("documents.previewExcelPlaceholder")}
        hint={t("documents.previewOfficeHint")}
        compact={compact}
      />
    );
  }

  if (kind === "text") {
    return (
      <PlaceholderCard
        icon={FileText}
        label={t("documents.previewTextPlaceholder")}
        hint={t("documents.previewTextHint")}
        compact={compact}
      />
    );
  }

  if (kind === "image") {
    return (
      <PlaceholderCard
        icon={ImageIcon}
        label={t("documents.previewImagePlaceholder")}
        hint={fileName}
        compact={compact}
      />
    );
  }

  return (
    <PlaceholderCard
      icon={FileQuestion}
      label={t("documents.previewUnknown")}
      hint={effectiveMime}
      compact={compact}
    />
  );
}
