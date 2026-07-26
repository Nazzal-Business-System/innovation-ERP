"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { ProcurementNavLinks } from "@/components/procurement/procurement-gate";
import { ProcurementPageSkeleton } from "@/components/procurement/procurement-page-skeleton";
import { purchaseOrderColumns } from "@/components/procurement/procurement-columns";
import {
  EntityActionBar,
  EntityAudit,
  EntityContactProfile,
  EntityEmptyState,
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
  useProcurementVendor,
  useSetVendorLifecycle,
  useUpdateVendor,
} from "@/lib/hooks/use-procurement";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { ApiError } from "@/lib/api-client";
import {
  mapMasterDataAudit,
  mapMasterDataTimeline,
} from "@/lib/entity-workspace/master-data-lifecycle";
import { PROCUREMENT_PERMISSIONS } from "@ierp/shared";
import type { ProcurementVendorDetail } from "@ierp/shared";

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(PROCUREMENT_PERMISSIONS.WRITE);
  const { data: vendor, loading, error, refetch } = useProcurementVendor(id);
  const updateMutation = useUpdateVendor();
  const lifecycleMutation = useSetVendorLifecycle();

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPaymentTerms, setEditPaymentTerms] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function seedEditForm(entity: ProcurementVendorDetail) {
    setEditName(entity.name);
    setEditContactName(entity.contactName ?? "");
    setEditEmail(entity.email ?? "");
    setEditPhone(entity.phone ?? "");
    setEditCity(entity.city);
    setEditPaymentTerms(entity.paymentTerms);
    setEditNotes(entity.notes ?? "");
    setEditErrors({});
    setEditError(null);
  }

  function openEditDialog() {
    if (!vendor) return;
    seedEditForm(vendor);
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
    if (!vendor || editSubmitting) return;

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
          contactName: editContactName.trim() || null,
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          city: editCity.trim(),
          paymentTerms: editPaymentTerms.trim(),
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
          ? t("masterData.restoreSuccess", "Vendor restored")
          : t("masterData.archiveSuccess", "Vendor archived")
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
        <ProcurementPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !vendor) {
    return (
      <ModuleLayout maxWidth="lg">
        <MasterDataWorkspace
          entityType="vendor"
          entityId={id}
          error={error ?? t("masterData.vendorNotFound")}
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
    ...(canWrite
      ? [
          {
            id: vendor.isActive ? "archive" : "restore",
            label: vendor.isActive
              ? t("masterData.archive", "Archive")
              : t("masterData.restore", "Restore"),
            icon: vendor.isActive ? (
              <Archive className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
            ),
            onSelect: () => void handleLifecycleChange(!vendor.isActive),
            kind: vendor.isActive ? "destructive" : "secondary",
            capability: vendor.isActive ? "archive" : "restore",
            pending: lifecycleMutation.isPending,
            confirm: vendor.isActive ? "hard" : "soft",
            confirmTitle: `${vendor.isActive ? t("masterData.archive", "Archive") : t("masterData.restore", "Restore")} — ${vendor.name}`,
            confirmDescription: vendor.isActive
              ? t(
                  "masterData.vendorArchiveConsequence",
                  "This vendor cannot be used for new purchases."
                )
              : t("masterData.vendorRestoreConsequence", "This vendor can be used for new purchases again."),
          } satisfies EntityAction,
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/procurement/vendors">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("masterData.backToVendors")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={lifecycleError} />
      <ProcurementNavLinks />

      <MasterDataWorkspace
        entityType="vendor"
        entityId={vendor.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("nav.vendors"), href: "/dashboard/procurement/vendors" },
              { label: vendor.code },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={vendor.name}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="ew-ltr-isolate font-mono text-xs">{vendor.code}</span>
                      <span>· {vendor.city}</span>
                    </span>
                  }
                  trailing={
                    <div className="flex flex-wrap items-center gap-2">
                      <EntityStatus
                        label={vendor.isActive ? t("common.active") : t("masterData.archived", "Archived")}
                        variant={vendor.isActive ? "success" : "secondary"}
                      />
                      {(vendor.openPurchaseOrders ?? 0) > 0 ? (
                        <Badge variant="warning">
                          {vendor.openPurchaseOrders} {t("masterData.openPurchaseOrders")}
                        </Badge>
                      ) : null}
                    </div>
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["edit", vendor.isActive ? "archive" : "restore"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "open",
                label: t("masterData.openPurchaseOrders"),
                value: String(vendor.openPurchaseOrders ?? 0),
              },
              {
                id: "recent",
                label: t("masterData.recentOrders"),
                value: String(vendor.recentPurchaseOrders.length),
              },
              ...(vendor.totalSpend
                ? [{ id: "spend", label: t("entityWorkspace.summary"), value: vendor.totalSpend }]
                : []),
            ]}
          />
        }
        main={
          <>
            <EntitySection id="core-info" title={t("masterData.contactInfo")} defaultOpen>
              <EntityContactProfile
                contactName={vendor.contactName}
                code={vendor.code}
                methods={[
                  {
                    id: "email",
                    kind: "email",
                    label: t("masterData.email"),
                    value: vendor.email,
                    href: vendor.email ? `mailto:${vendor.email}` : undefined,
                  },
                  {
                    id: "phone",
                    kind: "phone",
                    label: t("masterData.phone"),
                    value: vendor.phone,
                    href: vendor.phone ? `tel:${vendor.phone}` : undefined,
                  },
                  {
                    id: "city",
                    kind: "location",
                    label: t("masterData.city"),
                    value: vendor.city,
                  },
                ]}
                terms={[{ id: "terms", label: t("masterData.paymentTerms"), value: vendor.paymentTerms }]}
              />
            </EntitySection>

            <EntityTableSection id="recent-pos" title={t("masterData.recentPurchaseOrders")}>
              {vendor.recentPurchaseOrders.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState variant="empty" title={t("common.noData")} />
                </div>
              ) : (
                <DataTable
                  columns={purchaseOrderColumns}
                  data={vendor.recentPurchaseOrders}
                  pageSize={10}
                />
              )}
            </EntityTableSection>

            <EntityNotesEditor
              value={vendor.notes}
              canEdit={canWrite}
              onSave={async (notes) => {
                await updateMutation.mutateAsync({ id, input: { notes } });
              }}
            />

            <EntityLinkedAttachments module="PROCUREMENT" entityType="vendor" entityId={vendor.id} />

            <EntityTimeline events={mapMasterDataTimeline(vendor.timeline, locale, t)} />
          </>
        }
        footer={<EntityAudit meta={mapMasterDataAudit(vendor.id, vendor.audit, locale)} />}
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("masterData.editVendor")}</DialogTitle>
          </DialogHeader>
          <form
            id="vendor-edit-form"
            onSubmit={(e) => void handleEditSubmit(e)}
            className="space-y-4"
            noValidate
          >
            <ActionFeedback error={editError} />

            <FormField label={t("masterData.name")} htmlFor="edit-vendor-name" required error={editErrors.name}>
              <input
                id="edit-vendor-name"
                className={inputClassName}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={editSubmitting}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("masterData.contactName")} htmlFor="edit-vendor-contact">
                <input
                  id="edit-vendor-contact"
                  className={inputClassName}
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.email")} htmlFor="edit-vendor-email">
                <input
                  id="edit-vendor-email"
                  type="email"
                  className={inputClassName}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.phone")} htmlFor="edit-vendor-phone">
                <input
                  id="edit-vendor-phone"
                  className={inputClassName}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.city")} htmlFor="edit-vendor-city" required>
                <input
                  id="edit-vendor-city"
                  className={inputClassName}
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.paymentTerms")} htmlFor="edit-vendor-terms" required>
                <input
                  id="edit-vendor-terms"
                  className={inputClassName}
                  value={editPaymentTerms}
                  onChange={(e) => setEditPaymentTerms(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
            </div>

            <FormField label={t("form.notes")} htmlFor="edit-vendor-notes">
              <textarea
                id="edit-vendor-notes"
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
