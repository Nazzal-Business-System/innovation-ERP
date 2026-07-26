"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import type { DocumentModule } from "@ierp/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentLinks } from "@/lib/hooks/use-documents";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_STATUS_LABELS, formatBytes } from "./documents-columns";

interface LinkedDocumentsPanelProps {
  module: DocumentModule;
  entityType: string;
  entityId: string;
  /** Skip card chrome when nested inside EntityAttachments / EntitySection. */
  embedded?: boolean;
}

export function LinkedDocumentsPanel({
  module,
  entityType,
  entityId,
  embedded = false,
}: LinkedDocumentsPanelProps) {
  const { t } = useI18n();
  const { startNavigation } = useNavigation();
  const { data, loading, error } = useDocumentLinks({ module, entityType, entityId });

  const body = (() => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    const items = data?.data ?? [];

    return (
      <>
        {error || items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("documents.noLinkedDocuments")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((link) => {
              const doc = (
                link as {
                  document?: {
                    id: string;
                    fileNumber: string;
                    title: string;
                    status: string;
                    fileSize: number;
                  };
                }
              ).document;
              if (!doc) return null;
              const href = `/dashboard/documents/files/${doc.id}`;
              return (
                <li key={link.id}>
                  <Link
                    href={href}
                    onClick={() => startNavigation(href)}
                    className="ierp-focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 transition-colors hover:border-[var(--sidebar-active-border)] hover:bg-[var(--accent-muted)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {doc.fileNumber} ·{" "}
                        {DOCUMENT_STATUS_LABELS[doc.status as keyof typeof DOCUMENT_STATUS_LABELS] ??
                          doc.status}{" "}
                        · {formatBytes(doc.fileSize)}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--accent)]">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href="/dashboard/documents/files"
          onClick={() => startNavigation("/dashboard/documents/files")}
          className="mt-3 inline-block cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
        >
          {t("documents.viewAllFiles")} →
        </Link>
      </>
    );
  })();

  if (embedded) {
    return <div className="space-y-2">{body}</div>;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" aria-hidden />
            {t("documents.linkedDocuments")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" aria-hidden />
          {t("documents.linkedDocuments")}
        </CardTitle>
        <CardDescription>{t("documents.linkedDocumentsDesc")}</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
