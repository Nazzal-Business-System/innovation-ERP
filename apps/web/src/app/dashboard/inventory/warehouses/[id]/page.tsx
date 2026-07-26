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
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
import { movementColumns } from "@/components/inventory/inventory-columns";
import {
  EntityActionBar,
  EntityAudit,
  EntityEmptyState,
  EntityFieldGrid,
  EntityHeader,
  EntityLinkedAttachments,
  EntityMetrics,
  EntityNotesEditor,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTableSection,
  EntityTimeline,
  EntityTitle,
  MasterDataWorkspace,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import {
  useInventoryWarehouse,
  useSetWarehouseLifecycle,
  useUpdateWarehouse,
  type InventoryWarehouseDetail,
} from "@/lib/hooks/use-inventory";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { ApiError } from "@/lib/api-client";
import {
  mapMasterDataAudit,
  mapMasterDataTimeline,
} from "@/lib/entity-workspace/master-data-lifecycle";
import { INVENTORY_PERMISSIONS } from "@ierp/shared";

export default function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(INVENTORY_PERMISSIONS.WRITE);
  const { data: warehouse, loading, error, refetch } = useInventoryWarehouse(id);
  const updateMutation = useUpdateWarehouse();
  const lifecycleMutation = useSetWarehouseLifecycle();

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function seedEditForm(entity: InventoryWarehouseDetail) {
    setEditName(entity.name);
    setEditCity(entity.city);
    setEditBranch(entity.branch);
    setEditAddress(entity.address ?? "");
    setEditNotes(entity.notes ?? "");
    setEditErrors({});
    setEditError(null);
  }

  function openEditDialog() {
    if (!warehouse) return;
    seedEditForm(warehouse);
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
    if (!warehouse || editSubmitting) return;

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
          city: editCity.trim(),
          branch: editBranch.trim(),
          address: editAddress.trim() || null,
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
          ? t("masterData.reactivateSuccess", "Warehouse reactivated")
          : t("masterData.deactivateSuccess", "Warehouse deactivated")
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
        <InventoryPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !warehouse) {
    return (
      <ModuleLayout maxWidth="lg">
        <MasterDataWorkspace
          entityType="warehouse"
          entityId={id}
          error={error ?? t("masterData.warehouseNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const stockRelations = (warehouse.stock ?? []).map((row) => ({
    id: row.productId,
    label: row.name,
    description: `${row.available.toLocaleString()} ${t("masterData.available")} · ${row.quantityOnHand} ${t("masterData.onHand")} · ${row.quantityReserved} ${t("masterData.reserved")}${row.value ? ` · ${row.value}` : ""}`,
    meta: row.sku,
    href: `/dashboard/inventory/products/${row.productId}`,
  }));

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
            id: warehouse.isActive ? "deactivate" : "reactivate",
            label: warehouse.isActive
              ? t("masterData.deactivate", "Deactivate")
              : t("masterData.reactivate", "Reactivate"),
            icon: warehouse.isActive ? (
              <Power className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            ),
            onSelect: () => void handleLifecycleChange(!warehouse.isActive),
            kind: warehouse.isActive ? "destructive" : "secondary",
            capability: warehouse.isActive ? "archive" : "restore",
            pending: lifecycleMutation.isPending,
            confirm: warehouse.isActive ? "hard" : "soft",
            confirmTitle: `${warehouse.isActive ? t("masterData.deactivate", "Deactivate") : t("masterData.reactivate", "Reactivate")} — ${warehouse.name}`,
            confirmDescription: warehouse.isActive
              ? t(
                  "masterData.warehouseDeactivateConsequence",
                  "This warehouse cannot be used for new inventory activity. Server safety checks may reject this action."
                )
              : t(
                  "masterData.warehouseReactivateConsequence",
                  "This warehouse can be used for new inventory activity again."
                ),
          } satisfies EntityAction,
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/inventory/warehouses">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("masterData.backToWarehouses")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={lifecycleError} />
      <InventoryNavLinks />

      <MasterDataWorkspace
        entityType="warehouse"
        entityId={warehouse.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("nav.warehouses"), href: "/dashboard/inventory/warehouses" },
              { label: warehouse.code },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={warehouse.name}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="ew-ltr-isolate font-mono text-xs">{warehouse.code}</span>
                      <span>
                        · {warehouse.city} · {warehouse.branch}
                      </span>
                    </span>
                  }
                  trailing={
                    <EntityStatus
                      label={warehouse.isActive ? t("common.active") : t("common.inactive")}
                      variant={warehouse.isActive ? "success" : "secondary"}
                    />
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["edit", warehouse.isActive ? "archive" : "restore"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "skus",
                label: t("masterData.productCount"),
                value: String(warehouse.productCount ?? warehouse.stock?.length ?? 0),
              },
              {
                id: "units",
                label: t("masterData.totalUnits"),
                value: warehouse.totalUnits?.toLocaleString() ?? "0",
              },
              {
                id: "value",
                label: t("masterData.totalValue"),
                value: warehouse.totalValue ?? "—",
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
                    id: "code",
                    label: t("masterData.code"),
                    value: warehouse.code,
                    mono: true,
                    span: "sm",
                  },
                  {
                    id: "city",
                    label: t("masterData.city"),
                    value: warehouse.city,
                    span: "sm",
                  },
                  {
                    id: "branch",
                    label: t("masterData.branch"),
                    value: warehouse.branch,
                    span: "sm",
                  },
                  {
                    id: "address",
                    label: t("masterData.address"),
                    value: warehouse.address ?? "—",
                    span: "lg",
                  },
                ]}
              />
            </EntitySection>

            <EntityRelations
              items={stockRelations}
              title={t("masterData.stockOnHand")}
              emptyTitle={t("entityWorkspace.noRelated")}
              emptyDescription=""
            />

            <EntityTableSection id="movements" title={t("masterData.recentMovements")}>
              {(warehouse.recentMovements ?? []).length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState variant="empty" title={t("common.noData")} />
                </div>
              ) : (
                <DataTable
                  columns={movementColumns}
                  data={warehouse.recentMovements}
                  pageSize={10}
                />
              )}
            </EntityTableSection>

            <EntityNotesEditor
              value={warehouse.notes}
              canEdit={canWrite}
              onSave={async (notes) => {
                await updateMutation.mutateAsync({ id, input: { notes } });
              }}
            />

            <EntityLinkedAttachments module="OPERATIONS" entityType="warehouse" entityId={warehouse.id} />

            <EntityTimeline events={mapMasterDataTimeline(warehouse.timeline, locale, t)} />
          </>
        }
        footer={<EntityAudit meta={mapMasterDataAudit(warehouse.id, warehouse.audit, locale)} />}
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("masterData.editWarehouse")}</DialogTitle>
          </DialogHeader>
          <form
            id="warehouse-edit-form"
            onSubmit={(e) => void handleEditSubmit(e)}
            className="space-y-4"
            noValidate
          >
            <ActionFeedback error={editError} />

            <FormField
              label={t("masterData.code")}
              htmlFor="edit-warehouse-code"
              hint={t("masterData.warehouseCodeLocked")}
            >
              <input
                id="edit-warehouse-code"
                className={inputClassName}
                value={warehouse.code}
                disabled
                readOnly
              />
            </FormField>

            <FormField label={t("masterData.name")} htmlFor="edit-warehouse-name" required error={editErrors.name}>
              <input
                id="edit-warehouse-name"
                className={inputClassName}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={editSubmitting}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("masterData.city")} htmlFor="edit-warehouse-city" required>
                <input
                  id="edit-warehouse-city"
                  className={inputClassName}
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.branch")} htmlFor="edit-warehouse-branch" required>
                <input
                  id="edit-warehouse-branch"
                  className={inputClassName}
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
            </div>

            <FormField label={t("masterData.address")} htmlFor="edit-warehouse-address">
              <input
                id="edit-warehouse-address"
                className={inputClassName}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>

            <FormField label={t("form.notes")} htmlFor="edit-warehouse-notes">
              <textarea
                id="edit-warehouse-notes"
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
