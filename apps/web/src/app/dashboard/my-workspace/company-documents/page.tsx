"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
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
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName } from "@/lib/form-utils";
import {
  downloadAuthorizedPath,
  useSelfCompanyDocuments,
} from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MyCompanyDocumentsPage() {
  const { t, locale } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useSelfCompanyDocuments(search);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDownload(id: string, path: string, title: string) {
    setActionError(null);
    setDownloadingId(id);
    try {
      await downloadAuthorizedPath(path, `${title}.txt`);
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
          title={t("selfService.companyDocsTitle", "Company documents")}
          description={t(
            "selfService.companyDocsDesc",
            "Shared company files available to employees."
          )}
          badge={<Badge variant="secondary">{rows.length}</Badge>}
        />
      </FadeIn>

      <ActionFeedback error={actionError} />

      <FadeIn delay={0.04}>
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 sm:flex-row sm:items-end">
          <FormField
            htmlFor="company-docs-search"
            label={t("selfService.searchFiles", "Search files")}
            className="min-w-0 flex-1"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                id="company-docs-search"
                className={`${inputClassName} ps-9`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSearch(searchInput.trim());
                }}
              />
            </div>
          </FormField>
          <Button type="button" size="sm" onClick={() => setSearch(searchInput.trim())}>
            {t("common.search", "Search")}
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("hr.title", "Title")}</TableHead>
                <TableHead>{t("hr.category", "Category")}</TableHead>
                <TableHead>{t("hr.expiryDate", "Expiry")}</TableHead>
                <TableHead>{t("hr.file", "File")}</TableHead>
                <TableHead className="w-[1%]">{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--muted)]">
                    {t("selfService.noCompanyDocs", "No company documents available.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      <div className="ew-ltr-isolate font-mono text-xs text-[var(--muted)]">
                        {row.fileNumber}
                      </div>
                    </TableCell>
                    <TableCell>{row.category?.name ?? "—"}</TableCell>
                    <TableCell className="ew-ltr-isolate">
                      {formatDisplayDate(row.expiryDate, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--muted)]">
                      {formatFileSize(row.fileSize)}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
