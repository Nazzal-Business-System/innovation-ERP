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
import { SelectField } from "@/components/forms/select-field";
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
  useInventoryProduct,
  useSetProductLifecycle,
  useUpdateProduct,
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
import type { InventoryProductDetail, ProductStatus } from "@ierp/shared";

const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "DISCONTINUED", label: "Discontinued" },
];

function productStatusLabel(status: ProductStatus): string {
  return PRODUCT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function productStatusVariant(
  status: ProductStatus
): "success" | "secondary" | "warning" | "default" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "secondary";
    case "DISCONTINUED":
      return "warning";
    default:
      return "default";
  }
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(INVENTORY_PERMISSIONS.WRITE);
  const { data: product, loading, error, refetch } = useInventoryProduct(id);
  const updateMutation = useUpdateProduct();
  const lifecycleMutation = useSetProductLifecycle();

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("");
  const [editSellPrice, setEditSellPrice] = useState("");
  const [editReorderLevel, setEditReorderLevel] = useState("");
  const [editStatus, setEditStatus] = useState<ProductStatus>("ACTIVE");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function seedEditForm(entity: InventoryProductDetail) {
    setEditName(entity.name);
    setEditDescription(entity.description ?? "");
    setEditCategory(entity.category);
    setEditUnit(entity.unit);
    setEditCostPrice(entity.costPrice.replace(/[^\d.]/g, ""));
    setEditSellPrice(entity.sellPrice.replace(/[^\d.]/g, ""));
    setEditReorderLevel(String(entity.reorderLevel));
    setEditStatus(entity.status);
    setEditErrors({});
    setEditError(null);
  }

  async function handleLifecycleChange(active: boolean) {
    if (lifecycleMutation.isPending || updateMutation.isPending) return;
    setLifecycleError(null);
    setActionSuccess(null);
    try {
      await lifecycleMutation.mutateAsync({ id, active });
      setActionSuccess(
        active
          ? t("masterData.restoreSuccess", "Product restored")
          : t("masterData.archiveSuccess", "Product archived")
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

  function openEditDialog() {
    if (!product) return;
    seedEditForm(product);
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
    if (!product || editSubmitting || updateMutation.isPending || lifecycleMutation.isPending) {
      return;
    }

    const errors: Record<string, string> = {};
    if (!editName.trim()) errors.name = t("masterData.nameRequired");
    const costPriceValue = parseFloat(editCostPrice);
    if (!editCostPrice || Number.isNaN(costPriceValue) || costPriceValue < 0) {
      errors.costPrice = t("masterData.priceInvalid");
    }
    const sellPriceValue = parseFloat(editSellPrice);
    if (!editSellPrice || Number.isNaN(sellPriceValue) || sellPriceValue < 0) {
      errors.sellPrice = t("masterData.priceInvalid");
    }
    const reorderLevelValue = parseInt(editReorderLevel, 10);
    if (!editReorderLevel || Number.isNaN(reorderLevelValue) || reorderLevelValue < 0) {
      errors.reorderLevel = t("masterData.priceInvalid");
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      setEditError(null);
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    setEditErrors({});
    setActionSuccess(null);
    try {
      const updated = await updateMutation.mutateAsync({
        id,
        input: {
          name: editName.trim(),
          description: editDescription.trim() || null,
          category: editCategory.trim(),
          unit: editUnit.trim(),
          costPrice: costPriceValue,
          sellPrice: sellPriceValue,
          reorderLevel: reorderLevelValue,
          status: editStatus,
        },
      });
      if (updated.status !== editStatus) {
        throw new Error(
          t(
            "masterData.statusPersistFailed",
            "Status was not saved. Please try again."
          )
        );
      }
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

  if (loading) {
    return (
      <ModuleLayout>
        <InventoryPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !product) {
    return (
      <ModuleLayout maxWidth="lg">
        <MasterDataWorkspace
          entityType="product"
          entityId={id}
          error={error ?? t("masterData.productNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const warehouseRelations = product.stockByWarehouse.map((row) => ({
    id: row.warehouseId,
    label: row.warehouseName,
    description: `${row.available.toLocaleString()} ${t("masterData.available")} · ${row.quantityOnHand} ${t("masterData.onHand")} · ${row.quantityReserved} ${t("masterData.reserved")}`,
    meta: row.warehouseCode,
    href: `/dashboard/inventory/warehouses/${row.warehouseId}`,
  }));

  const headerActions: EntityAction[] = [
    {
      id: "edit",
      label: t("entityWorkspace.action.edit"),
      icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
      onSelect: openEditDialog,
      kind: "primary",
      capability: "edit",
      disabled: lifecycleMutation.isPending || updateMutation.isPending,
      pending: updateMutation.isPending,
    },
    ...(canWrite
      ? [
          {
            id: product.isArchived ? "restore" : "archive",
            label: product.isArchived
              ? t("masterData.restore", "Restore")
              : t("masterData.archive", "Archive"),
            icon: product.isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Archive className="h-3.5 w-3.5" aria-hidden />
            ),
            onSelect: () => void handleLifecycleChange(product.isArchived),
            kind: product.isArchived ? "secondary" : "destructive",
            capability: product.isArchived ? "restore" : "archive",
            pending: lifecycleMutation.isPending,
            disabled: updateMutation.isPending,
            confirm: product.isArchived ? "soft" : "hard",
            confirmTitle: `${product.isArchived ? t("masterData.restore", "Restore") : t("masterData.archive", "Archive")} — ${product.name}`,
            confirmDescription: product.isArchived
              ? t("masterData.productRestoreConsequence", "This product can be used in new documents again.")
              : t(
                  "masterData.productArchiveConsequence",
                  "This product cannot be used in new sales or purchase documents. History remains available."
                ),
          } satisfies EntityAction,
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/inventory/products">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("masterData.backToProducts")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={lifecycleError} />
      <InventoryNavLinks />

      <MasterDataWorkspace
        entityType="product"
        entityId={product.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("nav.products"), href: "/dashboard/inventory/products" },
              { label: product.sku },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={product.name}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="ew-ltr-isolate font-mono text-xs">{product.sku}</span>
                      <span>· {product.category}</span>
                      <span>· {product.unit}</span>
                    </span>
                  }
                  trailing={
                    <div className="flex flex-wrap items-center gap-2">
                      <EntityStatus
                        label={productStatusLabel(product.status)}
                        variant={productStatusVariant(product.status)}
                      />
                      {product.isArchived ? (
                        <EntityStatus
                          label={t("masterData.archived", "Archived")}
                          variant="secondary"
                        />
                      ) : null}
                      {product.isLowStock ? (
                        <Badge variant="warning">{t("masterData.lowStock")}</Badge>
                      ) : null}
                    </div>
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["edit", product.isArchived ? "restore" : "archive"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "onHand",
                label: t("masterData.onHand"),
                value: product.totalOnHand?.toLocaleString() ?? "0",
              },
              {
                id: "reserved",
                label: t("masterData.reserved"),
                value: product.totalReserved?.toLocaleString() ?? "0",
              },
              {
                id: "value",
                label: t("masterData.inventoryValue"),
                value: product.totalValue ?? "—",
              },
              {
                id: "reorder",
                label: t("masterData.reorderLevel"),
                value: String(product.reorderLevel),
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="pricing" title={t("masterData.pricing")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "sku",
                    label: t("masterData.sku"),
                    value: product.sku,
                    mono: true,
                    span: "sm",
                  },
                  {
                    id: "category",
                    label: t("masterData.category"),
                    value: product.category,
                    span: "sm",
                  },
                  {
                    id: "cost",
                    label: t("masterData.costPrice"),
                    value: product.costPrice,
                    span: "sm",
                  },
                  {
                    id: "sell",
                    label: t("masterData.sellPrice"),
                    value: product.sellPrice,
                    span: "sm",
                  },
                  {
                    id: "unit",
                    label: t("masterData.unitOfMeasure"),
                    value: product.unit,
                    span: "sm",
                  },
                  {
                    id: "catalogStatus",
                    label: t("masterData.status"),
                    value: productStatusLabel(product.status),
                    span: "sm",
                  },
                  {
                    id: "lifecycle",
                    label: t("masterData.lifecycle", "Lifecycle"),
                    value: product.isArchived
                      ? t("masterData.archived", "Archived")
                      : t("common.active"),
                    span: "sm",
                  },
                ]}
              />
            </EntitySection>

            <EntityRelations
              items={warehouseRelations}
              title={t("masterData.stockByWarehouse")}
              emptyTitle={t("entityWorkspace.noRelated")}
              emptyDescription=""
            />

            <EntityTableSection id="movements" title={t("masterData.recentMovements")}>
              {product.recentMovements.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState variant="empty" title={t("common.noData")} />
                </div>
              ) : (
                <DataTable columns={movementColumns} data={product.recentMovements} pageSize={10} />
              )}
            </EntityTableSection>

            <EntityNotesEditor
              value={product.description}
              canEdit={canWrite}
              title={t("masterData.description")}
              onSave={async (description) => {
                await updateMutation.mutateAsync({ id, input: { description } });
              }}
            />

            <EntityLinkedAttachments module="OPERATIONS" entityType="product" entityId={product.id} />

            <EntityTimeline events={mapMasterDataTimeline(product.timeline, locale, t)} />
          </>
        }
        footer={<EntityAudit meta={mapMasterDataAudit(product.id, product.audit, locale)} />}
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("masterData.editProduct")}</DialogTitle>
          </DialogHeader>
          <form
            id="product-edit-form"
            onSubmit={(e) => void handleEditSubmit(e)}
            className="space-y-4"
            noValidate
          >
            <ActionFeedback error={editError} />

            <FormField label={t("masterData.sku")} htmlFor="edit-product-sku" hint={t("masterData.skuLocked")}>
              <input
                id="edit-product-sku"
                className={inputClassName}
                value={product.sku}
                disabled
                readOnly
              />
            </FormField>

            <FormField label={t("masterData.name")} htmlFor="edit-product-name" required error={editErrors.name}>
              <input
                id="edit-product-name"
                className={inputClassName}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={editSubmitting}
              />
            </FormField>

            <FormField label={t("masterData.description")} htmlFor="edit-product-description">
              <textarea
                id="edit-product-description"
                className={textareaClassName}
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("masterData.category")} htmlFor="edit-product-category" required>
                <input
                  id="edit-product-category"
                  className={inputClassName}
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.unitOfMeasure")} htmlFor="edit-product-unit" required>
                <input
                  id="edit-product-unit"
                  className={inputClassName}
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField
                label={t("masterData.costPrice")}
                htmlFor="edit-product-cost"
                required
                error={editErrors.costPrice}
              >
                <input
                  id="edit-product-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClassName}
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField
                label={t("masterData.sellPrice")}
                htmlFor="edit-product-sell"
                required
                error={editErrors.sellPrice}
              >
                <input
                  id="edit-product-sell"
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClassName}
                  value={editSellPrice}
                  onChange={(e) => setEditSellPrice(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField
                label={t("masterData.reorderLevel")}
                htmlFor="edit-product-reorder"
                required
                error={editErrors.reorderLevel}
              >
                <input
                  id="edit-product-reorder"
                  type="number"
                  min={0}
                  step={1}
                  className={inputClassName}
                  value={editReorderLevel}
                  onChange={(e) => setEditReorderLevel(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <SelectField
                id="edit-product-status"
                label={t("masterData.status")}
                value={editStatus}
                onChange={(v) => setEditStatus(v as ProductStatus)}
                options={PRODUCT_STATUS_OPTIONS}
                disabled={editSubmitting}
                loading={editSubmitting}
              />
            </div>

            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("masterData.saveChanges")}
              loading={editSubmitting}
              loadingLabel={t("form.saving")}
              disabled={editSubmitting}
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
