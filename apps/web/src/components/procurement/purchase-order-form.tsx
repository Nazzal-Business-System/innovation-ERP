"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DateInput } from "@/components/forms/date-input";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { createEmptyLine, LineItemsEditor, type LineItemRow } from "@/components/forms/line-items-editor";
import { OrderTotalsSummary } from "@/components/forms/order-totals-summary";
import { SelectField } from "@/components/forms/select-field";
import { textareaClassName } from "@/lib/form-utils";
import { useCreatePurchaseOrder, useProcurementVendors } from "@/lib/hooks/use-procurement";
import { useInventoryProducts, useInventoryWarehouses } from "@/lib/hooks/use-inventory";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { apiDateToIsoUtcNoon } from "@/lib/date";

const lineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  unitCost: z.coerce.number().min(0),
});

const formSchema = z.object({
  vendorId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  if (error.issues.some((i) => i.path[0] === "lines")) {
    out.lines = "At least one valid line item is required";
  }
  return out;
}

export function PurchaseOrderForm() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const createMutation = useCreatePurchaseOrder();

  const { data: vendorsData } = useProcurementVendors({ active: true, page: 1 });
  const { data: warehouses } = useInventoryWarehouses({ active: true });
  const { data: productsData } = useInventoryProducts({
    status: "ACTIVE",
    archived: false,
    page: 1,
  });

  const [vendorId, setVendorId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItemRow[]>([createEmptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const vendorOptions = useMemo(
    () => (vendorsData?.data ?? []).map((v) => ({ value: v.id, label: `${v.code} — ${v.name}` })),
    [vendorsData]
  );
  const warehouseOptions = useMemo(
    () => (warehouses ?? []).map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` })),
    [warehouses]
  );
  const products = productsData?.data ?? [];

  const numericLines = lines.map((l) => ({
    quantity: Number(l.quantity) || 0,
    unitAmount: Number(l.unitAmount) || 0,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const payload = {
      vendorId,
      warehouseId,
      expectedDate: expectedDate ? apiDateToIsoUtcNoon(expectedDate) : undefined,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitAmount),
      })),
    };

    const parsed = formSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(flattenErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const po = await createMutation.mutateAsync(parsed.data);
      const href = `/dashboard/procurement/purchase-orders/${po.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("form.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" data-testid="purchase-order-form">
      <ActionFeedback error={submitError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="po-vendor"
          label={t("form.vendor")}
          value={vendorId}
          onChange={setVendorId}
          options={vendorOptions}
          placeholder={t("form.selectVendor")}
          error={errors.vendorId}
          required
        />
        <SelectField
          id="po-warehouse"
          label={t("form.warehouse")}
          value={warehouseId}
          onChange={setWarehouseId}
          options={warehouseOptions}
          placeholder={t("form.selectWarehouse")}
          error={errors.warehouseId}
          required
        />
        <DateInput
          id="po-expected"
          label={t("form.expectedDate")}
          value={expectedDate}
          onChange={setExpectedDate}
        />
      </div>

      <FormField label={t("form.notes")} htmlFor="po-notes">
        <textarea
          id="po-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={cn(textareaClassName, "min-h-[4rem]")}
        />
      </FormField>

      <LineItemsEditor
        lines={lines}
        products={products}
        onChange={setLines}
        mode="cost"
        errors={errors}
      />

      <OrderTotalsSummary lines={numericLines} unitKey="unitCost" />

      <FormActions
        cancelLabel={t("form.cancel")}
        submitLabel={t("form.createPurchaseOrder")}
        loadingLabel={t("form.creating")}
        loading={submitting}
        onCancel={() => router.push("/dashboard/procurement/purchase-orders")}
      />
    </form>
  );
}
