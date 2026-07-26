"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Link2, Unlink } from "lucide-react";
import type { DocumentFile, DocumentModule } from "@ierp/shared";
import { DOCUMENTS_PERMISSIONS } from "@ierp/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { SelectField } from "@/components/forms/select-field";
import { EntityAttachments } from "./entity-attachments";
import { EntityEmptyState } from "./entity-empty-state";
import {
  useCreateDocumentLink,
  useDeleteDocumentLink,
  useDocumentFiles,
  useDocumentLinks,
} from "@/lib/hooks/use-documents";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { DOCUMENT_STATUS_LABELS, formatBytes } from "@/components/documents/documents-columns";
import { useEntityLayout } from "./context/entity-layout-context";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query/client";

type LinkedRow = {
  id: string;
  document?: {
    id: string;
    fileNumber: string;
    title: string;
    status: string;
    fileSize: number;
  };
};

export function EntityLinkedAttachments({
  module,
  entityType,
  entityId,
  title,
}: {
  module: DocumentModule;
  entityType: string;
  entityId: string;
  title?: string;
}) {
  const { t } = useI18n();
  const { layout } = useEntityLayout();
  const { has } = usePermissions();
  const { startNavigation } = useNavigation();
  const queryClient = useQueryClient();
  const canWrite = has(DOCUMENTS_PERMISSIONS.WRITE);
  const compact = layout === "compact" || layout === "focus";

  const { data, loading, error, refetch } = useDocumentLinks({
    module,
    entityType,
    entityId,
  });
  const filesQuery = useDocumentFiles({ status: "ACTIVE", page: 1 });
  const createLink = useCreateDocumentLink();
  const deleteLink = useDeleteDocumentLink();

  const [attachOpen, setAttachOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null);

  const items = useMemo(() => (data?.data ?? []) as LinkedRow[], [data?.data]);
  const linkedFileIds = useMemo(
    () => new Set(items.map((row) => row.document?.id).filter(Boolean) as string[]),
    [items]
  );

  const fileOptions = useMemo(() => {
    const files = (filesQuery.data?.data ?? []) as DocumentFile[];
    return files
      .filter((f) => !linkedFileIds.has(f.id))
      .map((f) => ({
        value: f.id,
        label: `${f.fileNumber} — ${f.title}`,
      }));
  }, [filesQuery.data, linkedFileIds]);

  function reconcileEntityTimeline() {
    const key =
      module === "SALES" && entityType === "customer"
        ? queryKeys.sales.customer(entityId)
        : module === "PROCUREMENT" && entityType === "vendor"
          ? queryKeys.procurement.vendor(entityId)
          : module === "OPERATIONS" && entityType === "product"
            ? queryKeys.inventory.product(entityId)
            : module === "OPERATIONS" && entityType === "warehouse"
              ? queryKeys.inventory.warehouse(entityId)
              : module === "HR" && entityType === "employee"
                ? queryKeys.hr.employee(entityId)
                : module === "ACCOUNTING" && entityType === "account"
                  ? queryKeys.accounting.account(entityId)
                  : null;
    if (key) void queryClient.invalidateQueries({ queryKey: key, refetchType: "active" });
  }

  async function handleAttach() {
    if (!selectedFileId || createLink.isPending) return;
    setActionError(null);
    try {
      await createLink.mutateAsync({
        documentFileId: selectedFileId,
        module,
        entityType,
        entityId,
      });
      setAttachOpen(false);
      setSelectedFileId("");
      void refetch();
      reconcileEntityTimeline();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("form.submitFailed")
      );
    }
  }

  async function handleUnlink(linkId: string) {
    if (deleteLink.isPending) return;
    setPendingLinkId(linkId);
    setActionError(null);
    try {
      await deleteLink.mutateAsync({ id: linkId, module, entityType, entityId });
      void refetch();
      reconcileEntityTimeline();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("form.submitFailed")
      );
    } finally {
      setPendingLinkId(null);
    }
  }

  return (
    <>
      <EntityAttachments empty={false} title={title ?? t("documents.linkedDocuments")}>
        <div className="space-y-3">
          <ActionFeedback error={actionError} />
          {loading ? (
            <p className="text-sm text-[var(--muted)]">{t("common.loading")}</p>
          ) : error ? (
            <EntityEmptyState
              variant="error"
              density="compact"
              title={t("entityWorkspace.errorTitle")}
              description={error}
              actionLabel={t("common.retry")}
              onAction={() => void refetch()}
            />
          ) : items.length === 0 ? (
            <EntityEmptyState
              variant="empty"
              density="compact"
              title={t("documents.noLinkedDocuments")}
              actionLabel={canWrite ? t("masterData.attachDocument") : undefined}
              onAction={canWrite ? () => setAttachOpen(true) : undefined}
            />
          ) : (
            <>
              <ul className="space-y-2">
                {items.map((link) => {
                  const doc = link.document;
                  if (!doc) return null;
                  const href = `/dashboard/documents/files/${doc.id}`;
                  return (
                    <li
                      key={link.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2"
                    >
                      <Link
                        href={href}
                        onClick={() => startNavigation(href)}
                        className="ierp-focus-ring min-w-0 flex-1 cursor-pointer"
                      >
                        <p className="truncate text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          <span className="ew-ltr-isolate">{doc.fileNumber}</span>
                          {" · "}
                          {DOCUMENT_STATUS_LABELS[
                            doc.status as keyof typeof DOCUMENT_STATUS_LABELS
                          ] ?? doc.status}
                          {" · "}
                          {formatBytes(doc.fileSize)}
                        </p>
                      </Link>
                      {canWrite ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="shrink-0 cursor-pointer"
                          loading={pendingLinkId === link.id}
                          disabled={pendingLinkId !== null}
                          aria-label={
                            pendingLinkId === link.id
                              ? t("action.updating", "Updating…")
                              : t("masterData.unlinkDocument")
                          }
                          onClick={() => void handleUnlink(link.id)}
                        >
                          <Unlink className="h-4 w-4" aria-hidden />
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {canWrite ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="cursor-pointer gap-1.5"
                    onClick={() => setAttachOpen(true)}
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    {t("masterData.attachDocument")}
                  </Button>
                </div>
              ) : null}
            </>
          )}
          {!compact ? (
            <Link
              href="/dashboard/documents/files"
              onClick={() => startNavigation("/dashboard/documents/files")}
              className="inline-block cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {t("documents.viewAllFiles")} →
            </Link>
          ) : null}
        </div>
      </EntityAttachments>

      <Dialog
        open={attachOpen}
        onOpenChange={(open) => {
          if (createLink.isPending) return;
          setAttachOpen(open);
          if (!open) {
            setSelectedFileId("");
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("masterData.attachDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ActionFeedback error={actionError} />
            <SelectField
              id="attach-doc-file"
              label={t("documents.linkedDocuments")}
              value={selectedFileId}
              onChange={setSelectedFileId}
              options={fileOptions}
              placeholder={t("masterData.selectDocument")}
              required
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                disabled={createLink.isPending}
                onClick={() => setAttachOpen(false)}
              >
                {t("form.cancel")}
              </Button>
              <Button
                type="button"
                className="cursor-pointer"
                loading={createLink.isPending}
                loadingText={t("action.updating", "Updating…")}
                disabled={!selectedFileId || createLink.isPending || fileOptions.length === 0}
                onClick={() => void handleAttach()}
              >
                {t("masterData.attachDocument")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
