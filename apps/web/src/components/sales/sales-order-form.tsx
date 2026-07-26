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
import { useInventoryProducts, useInventoryWarehouses } from "@/lib/hooks/use-inventory";
import { useCreateSalesOrder, useSalesCustomers } from "@/lib/hooks/use-sales";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { apiDateToIsoUtcNoon } from "@/lib/date";

const lineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
});

const formSchema = z.object({
  customerId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  expectedDeliveryDate: z.string().optional(),
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

export function SalesOrderForm() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const createMutation = useCreateSalesOrder();

  const { data: customersData } = useSalesCustomers({ active: true, page: 1 });
  const { data: warehouses } = useInventoryWarehouses({ active: true });
  const { data: productsData } = useInventoryProducts({
    status: "ACTIVE",
    archived: false,
    page: 1,
  });

  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItemRow[]>([createEmptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const customerOptions = useMemo(
    () => (customersData?.data ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
    [customersData]
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
      customerId,
      warehouseId,
      expectedDeliveryDate: expectedDeliveryDate ? apiDateToIsoUtcNoon(expectedDeliveryDate) : undefined,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitAmount),
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
      const order = await createMutation.mutateAsync(parsed.data);
      const href = `/dashboard/sales/orders/${order.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("form.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" data-testid="sales-order-form">
      <ActionFeedback error={submitError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="so-customer"
          label={t("form.customer")}
          value={customerId}
          onChange={setCustomerId}
          options={customerOptions}
          placeholder={t("form.selectCustomer")}
          error={errors.customerId}
          required
        />
        <SelectField
          id="so-warehouse"
          label={t("form.warehouse")}
          value={warehouseId}
          onChange={setWarehouseId}
          options={warehouseOptions}
          placeholder={t("form.selectWarehouse")}
          error={errors.warehouseId}
          required
        />
        <DateInput
          id="so-expected"
          label={t("form.expectedDeliveryDate")}
          value={expectedDeliveryDate}
          onChange={setExpectedDeliveryDate}
        />
      </div>

      <FormField label={t("form.notes")} htmlFor="so-notes">
        <textarea
          id="so-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={cn(textareaClassName, "min-h-[4rem]")}
        />
      </FormField>

      <LineItemsEditor lines={lines} products={products} onChange={setLines} mode="price" errors={errors} />

      <OrderTotalsSummary lines={numericLines} unitKey="unitPrice" />

      <FormActions
        cancelLabel={t("form.cancel")}
        submitLabel={t("form.createSalesOrder")}
        loadingLabel={t("form.creating")}
        loading={submitting}
        onCancel={() => router.push("/dashboard/sales/orders")}
      />
    </form>
  );
}
