"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentStatusBadge, ExpiryWarningBadge } from "@/components/hr/hr-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDisplayDate } from "@/lib/date";
import { getDocumentExpiryWarningLabel } from "@/lib/hr/document-expiry";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  downloadSelfDocument,
  useSelfDocuments,
} from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";

export default function MyDocumentsPage() {
  const { t, locale } = useI18n();
  const { data, loading, error, refetch } = useSelfDocuments();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDownload(id: string, path: string, title: string) {
    setActionError(null);
    setDownloadingId(id);
    try {
      await downloadSelfDocument(path, `${title}.txt`);
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </ModuleLayout>
    );
  }

  if (error && !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("selfService.loadFailed", "Unable to load workspace")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const rows = data?.data ?? [];

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.documentsTitle", "My Documents")}
          description={t(
            "selfService.documentsDesc",
            "Documents attached to your employee record only."
          )}
          badge={<Badge variant="secondary">{rows.length}</Badge>}
        />
      </FadeIn>

      <ActionFeedback error={actionError} />

      <FadeIn delay={0.04}>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("hr.title", "Title")}</TableHead>
                <TableHead>{t("hr.documentType", "Type")}</TableHead>
                <TableHead>{t("hr.expiryDate", "Expiry")}</TableHead>
                <TableHead>{t("hr.status", "Status")}</TableHead>
                <TableHead className="w-[1%]">{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--muted)]">
                    {t("selfService.noDocuments", "No documents on file.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const warning = getDocumentExpiryWarningLabel(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.title}</TableCell>
                      <TableCell>{row.documentType}</TableCell>
                      <TableCell className="ew-ltr-isolate">
                        <span className="inline-flex items-center gap-2">
                          {formatDisplayDate(row.expiryDate, locale)}
                          {warning ? <ExpiryWarningBadge label={warning} /> : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        {row.canDownload ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            loading={downloadingId === row.id}
                            disabled={downloadingId !== null}
                            onClick={() =>
                              void handleDownload(row.id, row.downloadPath, row.title)
                            }
                          >
                            {t("selfService.download", "Download")}
                          </Button>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            {t("selfService.downloadUnavailable", "Unavailable")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
