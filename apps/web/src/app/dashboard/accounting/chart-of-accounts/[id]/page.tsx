"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Power, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/data-display/data-table";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { AccountingNavLinks } from "@/components/accounting/accounting-gate";
import { accountLineColumns } from "@/components/accounting/accounting-columns";
import { AccountingDetailSkeleton } from "@/components/accounting/accounting-page-skeleton";
import {
  AccountTypeBadge,
  NORMAL_BALANCE_LABELS,
} from "@/components/accounting/je-status-badge";
import {
  EntityActionBar,
  EntityAudit,
  EntityEmptyState,
  EntityFieldGrid,
  EntityHeader,
  EntityLinkedAttachments,
  EntityMetrics,
  EntityNotesEditor,
  EntitySection,
  EntityStatus,
  EntityTableSection,
  EntityTimeline,
  EntityTitle,
  MasterDataWorkspace,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import {
  useAccountingAccount,
  useSetAccountLifecycle,
  useUpdateAccount,
} from "@/lib/hooks/use-accounting";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { ApiError } from "@/lib/api-client";
import {
  mapMasterDataAudit,
  mapMasterDataTimeline,
} from "@/lib/entity-workspace/master-data-lifecycle";
import { ACCOUNTING_PERMISSIONS } from "@ierp/shared";
import type { AccountingAccountDetail } from "@ierp/shared";

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(ACCOUNTING_PERMISSIONS.WRITE);
  const { data: account, loading, error, refetch } = useAccountingAccount(id);
  const updateMutation = useUpdateAccount();
  const lifecycleMutation = useSetAccountLifecycle();

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function seedEditForm(entity: AccountingAccountDetail) {
    setEditName(entity.name);
    setEditNotes(entity.notes ?? "");
    setEditErrors({});
    setEditError(null);
  }

  function openEditDialog() {
    if (!account) return;
    seedEditForm(account);
    setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (editSubmitting) return;
    setEditOpen(open);
    if (!open) {
      setEditErrors({});
      setEditError(null);
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!account || editSubmitting) return;

    const errors: Record<string, string> = {};
    if (!editName.trim()) errors.name = t("masterData.nameRequired");

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      setEditError(null);
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    setEditErrors({});
    try {
      await updateMutation.mutateAsync({
        id,
        input: {
          name: editName.trim(),
          notes: editNotes.trim() || null,
        },
      });
      setEditOpen(false);
      setActionSuccess(t("masterData.saved"));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("form.submitFailed");
      setEditError(message);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleLifecycleChange(active: boolean) {
    if (lifecycleMutation.isPending) return;
    setLifecycleError(null);
    setActionSuccess(null);
    try {
      await lifecycleMutation.mutateAsync({ id, active });
      setActionSuccess(
        active
          ? t("masterData.reactivateSuccess", "Account reactivated")
          : t("masterData.deactivateSuccess", "Account deactivated")
      );
    } catch (err) {
      setLifecycleError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("form.submitFailed", "Action failed")
      );
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <AccountingDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !account) {
    return (
      <ModuleLayout maxWidth="lg">
        <MasterDataWorkspace
          entityType="account"
          entityId={id}
          error={error ?? t("masterData.accountNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const headerActions: EntityAction[] = [
    {
      id: "edit",
      label: t("entityWorkspace.action.edit"),
      icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
      onSelect: openEditDialog,
      kind: "primary",
      capability: "edit",
    },
    ...(canWrite && (!account.isActive || !account.isProtected)
      ? [
          {
            id: account.isActive ? "deactivate" : "reactivate",
            label: account.isActive
              ? t("masterData.deactivate", "Deactivate")
              : t("masterData.reactivate", "Reactivate"),
            icon: account.isActive ? (
              <Power className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            ),
            onSelect: () => void handleLifecycleChange(!account.isActive),
            kind: account.isActive ? "destructive" : "secondary",
            capability: account.isActive ? "archive" : "restore",
            pending: lifecycleMutation.isPending,
            confirm: account.isActive ? "hard" : "soft",
            confirmTitle: `${account.isActive ? t("masterData.deactivate", "Deactivate") : t("masterData.reactivate", "Reactivate")} — ${account.name}`,
            confirmDescription: account.isActive
              ? t(
                  "masterData.accountDeactivateConsequence",
                  "This account will not be selectable for new entries. Ledger history remains available."
                )
              : t(
                  "masterData.accountReactivateConsequence",
                  "This account will be selectable for new entries again."
                ),
          } satisfies EntityAction,
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/accounting/chart-of-accounts">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("masterData.backToAccounts")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={lifecycleError} />
      <AccountingNavLinks />

      <MasterDataWorkspace
        entityType="account"
        entityId={account.id}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.chartOfAccounts"),
                href: "/dashboard/accounting/chart-of-accounts",
              },
              { label: account.code },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={account.name}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="ew-ltr-isolate font-mono text-xs">{account.code}</span>
                      <span>
                        · {NORMAL_BALANCE_LABELS[account.normalBalance]}{" "}
                        {t("masterData.normalBalance").toLowerCase()}
                      </span>
                    </span>
                  }
                  trailing={
                    <div className="flex flex-wrap items-center gap-2">
                      <AccountTypeBadge type={account.type} />
                      <EntityStatus
                        label={
                          account.isProtected
                            ? t("masterData.protected", "Protected")
                            : account.isActive
                              ? t("common.active")
                              : t("common.inactive")
                        }
                        variant={account.isProtected ? "warning" : account.isActive ? "success" : "secondary"}
                      />
                    </div>
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={
                  canWrite
                    ? [
                        "edit",
                        ...(!account.isActive || !account.isProtected
                          ? [account.isActive ? "archive" : "restore"]
                          : []),
                      ]
                    : []
                }
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "code",
                label: t("masterData.accountCode"),
                value: <span className="ew-ltr-isolate font-mono">{account.code}</span>,
              },
              {
                id: "balance",
                label: t("masterData.currentBalance"),
                value: account.balance ?? "JOD 0.00",
              },
              {
                id: "normal",
                label: t("masterData.normalBalance"),
                value: NORMAL_BALANCE_LABELS[account.normalBalance],
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="core-info" title={t("masterData.coreInfo")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "type",
                    label: t("masterData.accountType"),
                    value: account.type.replace(/_/g, " "),
                    span: "sm",
                  },
                  {
                    id: "parent",
                    label: t("masterData.parentAccount"),
                    value: account.parentId
                      ? t("masterData.subAccount")
                      : t("masterData.topLevel"),
                    span: "sm",
                  },
                  {
                    id: "normal",
                    label: t("masterData.normalBalance"),
                    value: NORMAL_BALANCE_LABELS[account.normalBalance],
                    span: "sm",
                  },
                  {
                    id: "code",
                    label: t("masterData.accountCode"),
                    value: account.code,
                    mono: true,
                    span: "sm",
                  },
                ]}
              />
            </EntitySection>

            <EntityTableSection id="lines" title={t("masterData.recentJournalLines")}>
              {account.recentLines.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState
                    variant="empty"
                    title={t("masterData.noJournalLines")}
                    description={t("masterData.noJournalLinesDesc")}
                  />
                </div>
              ) : (
                <DataTable
                  columns={accountLineColumns}
                  data={account.recentLines}
                  emptyTitle={t("masterData.noJournalLines")}
                  emptyDescription={t("masterData.noJournalLinesDesc")}
                  pageSize={15}
                />
              )}
            </EntityTableSection>

            <EntityNotesEditor
              value={account.notes}
              canEdit={canWrite}
              onSave={async (notes) => {
                await updateMutation.mutateAsync({ id, input: { notes } });
              }}
            />

            <EntityLinkedAttachments module="ACCOUNTING" entityType="account" entityId={account.id} />

            <EntityTimeline events={mapMasterDataTimeline(account.timeline, locale, t)} />
          </>
        }
        footer={<EntityAudit meta={mapMasterDataAudit(account.id, account.audit, locale)} />}
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("masterData.editAccount")}</DialogTitle>
          </DialogHeader>
          <form
            id="account-edit-form"
            onSubmit={(e) => void handleEditSubmit(e)}
            className="space-y-4"
            noValidate
          >
            <ActionFeedback error={editError} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t("masterData.accountCode")}
                htmlFor="edit-account-code"
                hint={t("masterData.accountCodeLocked")}
              >
                <input
                  id="edit-account-code"
                  className={inputClassName}
                  value={account.code}
                  disabled
                  readOnly
                />
              </FormField>
              <FormField
                label={t("masterData.accountType")}
                htmlFor="edit-account-type"
                hint={t("masterData.accountTypeLocked")}
              >
                <input
                  id="edit-account-type"
                  className={inputClassName}
                  value={`${account.type.replace(/_/g, " ")} · ${NORMAL_BALANCE_LABELS[account.normalBalance]}`}
                  disabled
                  readOnly
                />
              </FormField>
            </div>

            <FormField label={t("masterData.name")} htmlFor="edit-account-name" required error={editErrors.name}>
              <input
                id="edit-account-name"
                className={inputClassName}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={editSubmitting}
              />
            </FormField>

            <FormField label={t("form.notes")} htmlFor="edit-account-notes">
              <textarea
                id="edit-account-notes"
                className={textareaClassName}
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>

            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("masterData.saveChanges")}
              loading={editSubmitting}
              disabled={editSubmitting}
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
