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
import { SalesNavLinks } from "@/components/sales/sales-gate";
import { SalesPageSkeleton } from "@/components/sales/sales-page-skeleton";
import { salesOrderColumns } from "@/components/sales/sales-columns";
import { CUSTOMER_TYPE_LABELS } from "@/components/sales/so-status-badge";
import {
  EntityActionBar,
  EntityAudit,
  EntityContactProfile,
  EntityEmptyState,
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
import { useCrmOpportunities } from "@/lib/hooks/use-crm";
import {
  useSalesCustomer,
  useSetCustomerLifecycle,
  useUpdateCustomer,
} from "@/lib/hooks/use-sales";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { ApiError } from "@/lib/api-client";
import {
  mapMasterDataAudit,
  mapMasterDataTimeline,
} from "@/lib/entity-workspace/master-data-lifecycle";
import { SALES_PERMISSIONS } from "@ierp/shared";
import type { CustomerType, SalesCustomerDetail } from "@ierp/shared";

const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "RETAILER", label: CUSTOMER_TYPE_LABELS.RETAILER },
  { value: "WHOLESALER", label: CUSTOMER_TYPE_LABELS.WHOLESALER },
  { value: "CORPORATE", label: CUSTOMER_TYPE_LABELS.CORPORATE },
  { value: "DISTRIBUTOR", label: CUSTOMER_TYPE_LABELS.DISTRIBUTOR },
];

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(SALES_PERMISSIONS.WRITE);
  const { data: customer, loading, error, refetch } = useSalesCustomer(id);
  const { data: opportunitiesData } = useCrmOpportunities({ customerId: id, page: 1 });
  const opportunities = opportunitiesData?.data ?? [];
  const updateMutation = useUpdateCustomer();
  const lifecycleMutation = useSetCustomerLifecycle();

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCustomerType, setEditCustomerType] = useState<CustomerType>("RETAILER");
  const [editPaymentTerms, setEditPaymentTerms] = useState("");
  const [editCreditLimit, setEditCreditLimit] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function seedEditForm(entity: SalesCustomerDetail) {
    setEditName(entity.name);
    setEditContactName(entity.contactName ?? "");
    setEditEmail(entity.email ?? "");
    setEditPhone(entity.phone ?? "");
    setEditCity(entity.city);
    setEditCustomerType(entity.customerType);
    setEditPaymentTerms(entity.paymentTerms);
    setEditCreditLimit(entity.creditLimit.replace(/[^\d.]/g, ""));
    setEditNotes(entity.notes ?? "");
    setEditErrors({});
    setEditError(null);
  }

  function openEditDialog() {
    if (!customer) return;
    seedEditForm(customer);
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
    if (!customer || editSubmitting) return;

    const errors: Record<string, string> = {};
    if (!editName.trim()) errors.name = t("masterData.nameRequired");
    const creditLimitValue = parseFloat(editCreditLimit);
    if (!editCreditLimit || Number.isNaN(creditLimitValue) || creditLimitValue < 0) {
      errors.creditLimit = t("masterData.priceInvalid");
    }

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
          customerType: editCustomerType,
          paymentTerms: editPaymentTerms.trim(),
          creditLimit: creditLimitValue,
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
          ? t("masterData.restoreSuccess", "Customer restored")
          : t("masterData.archiveSuccess", "Customer archived")
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
        <SalesPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !customer) {
    return (
      <ModuleLayout maxWidth="lg">
        <MasterDataWorkspace
          entityType="customer"
          entityId={id}
          error={error ?? t("masterData.customerNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const relationItems = opportunities.map((opp) => ({
    id: opp.id,
    label: `${opp.opportunityNumber} — ${opp.title}`,
    description: `${opp.estimatedValue} · ${opp.probability}%`,
    meta: opp.stage.replace(/_/g, " "),
    href: `/dashboard/crm/opportunities/${opp.id}`,
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
            id: customer.isActive ? "archive" : "restore",
            label: customer.isActive
              ? t("masterData.archive", "Archive")
              : t("masterData.restore", "Restore"),
            icon: customer.isActive ? (
              <Archive className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
            ),
            onSelect: () => void handleLifecycleChange(!customer.isActive),
            kind: customer.isActive ? "destructive" : "secondary",
            capability: customer.isActive ? "archive" : "restore",
            pending: lifecycleMutation.isPending,
            confirm: customer.isActive ? "hard" : "soft",
            confirmTitle: `${customer.isActive ? t("masterData.archive", "Archive") : t("masterData.restore", "Restore")} — ${customer.name}`,
            confirmDescription: customer.isActive
              ? t(
                  "masterData.customerArchiveConsequence",
                  "This customer cannot be used for new sales."
                )
              : t("masterData.customerRestoreConsequence", "This customer can be used for new sales again."),
          } satisfies EntityAction,
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/sales/customers">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("masterData.backToCustomers")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={lifecycleError} />
      <SalesNavLinks />

      <MasterDataWorkspace
        entityType="customer"
        entityId={customer.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("nav.customers"), href: "/dashboard/sales/customers" },
              { label: customer.code },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={customer.name}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="ew-ltr-isolate font-mono text-xs">{customer.code}</span>
                      <span>· {customer.city}</span>
                      <span>· {CUSTOMER_TYPE_LABELS[customer.customerType]}</span>
                    </span>
                  }
                  trailing={
                    <div className="flex flex-wrap items-center gap-2">
                      <EntityStatus
                        label={customer.isActive ? t("common.active") : t("masterData.archived", "Archived")}
                        variant={customer.isActive ? "success" : "secondary"}
                      />
                      {(customer.openSalesOrders ?? 0) > 0 ? (
                        <Badge variant="warning">
                          {customer.openSalesOrders} {t("masterData.openOrders")}
                        </Badge>
                      ) : null}
                    </div>
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["edit", customer.isActive ? "archive" : "restore"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "open",
                label: t("masterData.openOrders"),
                value: String(customer.openSalesOrders ?? 0),
              },
              {
                id: "recent",
                label: t("masterData.recentOrders"),
                value: String(customer.recentSalesOrders.length),
              },
              ...(customer.totalSales
                ? [{ id: "sales", label: t("entityWorkspace.summary"), value: customer.totalSales }]
                : []),
            ]}
          />
        }
        main={
          <>
            <EntitySection id="core-info" title={t("masterData.contactInfo")} defaultOpen>
              <EntityContactProfile
                contactName={customer.contactName}
                typeLabel={CUSTOMER_TYPE_LABELS[customer.customerType]}
                code={customer.code}
                methods={[
                  {
                    id: "email",
                    kind: "email",
                    label: t("masterData.email"),
                    value: customer.email,
                    href: customer.email ? `mailto:${customer.email}` : undefined,
                  },
                  {
                    id: "phone",
                    kind: "phone",
                    label: t("masterData.phone"),
                    value: customer.phone,
                    href: customer.phone ? `tel:${customer.phone}` : undefined,
                  },
                  {
                    id: "city",
                    kind: "location",
                    label: t("masterData.city"),
                    value: customer.city,
                  },
                ]}
                terms={[
                  { id: "terms", label: t("masterData.paymentTerms"), value: customer.paymentTerms },
                  { id: "credit", label: t("masterData.creditLimit"), value: customer.creditLimit, mono: true },
                ]}
              />
            </EntitySection>

            <EntityRelations
              items={relationItems}
              title={t("masterData.relatedOpportunities")}
              emptyTitle={t("entityWorkspace.noRelated")}
              emptyDescription=""
            />

            <EntityTableSection id="recent-orders" title={t("masterData.recentSalesOrders")}>
              {customer.recentSalesOrders.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState variant="empty" title={t("common.noData")} />
                </div>
              ) : (
                <DataTable columns={salesOrderColumns} data={customer.recentSalesOrders} pageSize={10} />
              )}
            </EntityTableSection>

            <EntityNotesEditor
              value={customer.notes}
              canEdit={canWrite}
              onSave={async (notes) => {
                await updateMutation.mutateAsync({ id, input: { notes } });
              }}
            />

            <EntityLinkedAttachments module="SALES" entityType="customer" entityId={customer.id} />

            <EntityTimeline events={mapMasterDataTimeline(customer.timeline, locale, t)} />
          </>
        }
        footer={<EntityAudit meta={mapMasterDataAudit(customer.id, customer.audit, locale)} />}
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("masterData.editCustomer")}</DialogTitle>
          </DialogHeader>
          <form
            id="customer-edit-form"
            onSubmit={(e) => void handleEditSubmit(e)}
            className="space-y-4"
            noValidate
          >
            <ActionFeedback error={editError} />

            <FormField label={t("masterData.name")} htmlFor="edit-customer-name" required error={editErrors.name}>
              <input
                id="edit-customer-name"
                className={inputClassName}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={editSubmitting}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("masterData.contactName")} htmlFor="edit-customer-contact">
                <input
                  id="edit-customer-contact"
                  className={inputClassName}
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
              <SelectField
                id="edit-customer-type"
                label={t("masterData.customerType")}
                value={editCustomerType}
                onChange={(v) => setEditCustomerType(v as CustomerType)}
                options={CUSTOMER_TYPE_OPTIONS}
                disabled={editSubmitting}
              />
              <FormField label={t("masterData.email")} htmlFor="edit-customer-email">
                <input
                  id="edit-customer-email"
                  type="email"
                  className={inputClassName}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.phone")} htmlFor="edit-customer-phone">
                <input
                  id="edit-customer-phone"
                  className={inputClassName}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.city")} htmlFor="edit-customer-city" required>
                <input
                  id="edit-customer-city"
                  className={inputClassName}
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.paymentTerms")} htmlFor="edit-customer-terms" required>
                <input
                  id="edit-customer-terms"
                  className={inputClassName}
                  value={editPaymentTerms}
                  onChange={(e) => setEditPaymentTerms(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField
                label={t("masterData.creditLimit")}
                htmlFor="edit-customer-credit"
                required
                error={editErrors.creditLimit}
              >
                <input
                  id="edit-customer-credit"
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClassName}
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
            </div>

            <FormField label={t("form.notes")} htmlFor="edit-customer-notes">
              <textarea
                id="edit-customer-notes"
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
