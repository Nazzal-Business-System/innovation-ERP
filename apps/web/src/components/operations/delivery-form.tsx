"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { QuantityInput } from "@/components/forms/quantity-input";
import { textareaClassName } from "@/lib/form-utils";
import { useInventoryWarehouse, useInventoryWarehouses } from "@/lib/hooks/use-inventory";
import { useCreateDelivery, useDeliverDelivery } from "@/lib/hooks/use-operations";
import { useSalesOrder, useSalesOrders } from "@/lib/hooks/use-sales";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";

type DeliveryLineRow = {
  productId: string;
  sku: string;
  name: string;
  orderedQuantity: string;
  deliveredQuantity: string;
  returnedQuantity: string;
  availableStock: number;
};

const DELIVERABLE_SO_STATUSES = new Set([
  "CONFIRMED",
  "PICKING",
  "READY_TO_SHIP",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "INVOICED",
]);

export function DeliveryForm({ initialSoId }: { initialSoId?: string }) {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const createDeliveryMutation = useCreateDelivery();
  const deliverDeliveryMutation = useDeliverDelivery();

  const { data: soList } = useSalesOrders({ page: 1 });
  const eligibleSos = useMemo(
    () => (soList?.data ?? []).filter((so) => DELIVERABLE_SO_STATUSES.has(so.status)),
    [soList]
  );

  const [soId, setSoId] = useState(initialSoId ?? "");
  const { data: so } = useSalesOrder(soId);
  const { data: warehouses } = useInventoryWarehouses({ active: true });

  const [warehouseId, setWarehouseId] = useState("");
  const { data: warehouseDetail } = useInventoryWarehouse(warehouseId);

  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DeliveryLineRow[]>([]);
  const [submitting, setSubmitting] = useState<"draft" | "deliver" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialSoId) setSoId(initialSoId);
  }, [initialSoId]);

  useEffect(() => {
    if (!so) return;
    setWarehouseId(so.warehouse.id);
  }, [so]);

  useEffect(() => {
    if (!so || !warehouseDetail) return;
    const stockMap = new Map(warehouseDetail.stock.map((s) => [s.productId, s.available]));
    setLines(
      so.lines.map((line) => ({
        productId: line.productId,
        sku: line.sku,
        name: line.productName,
        orderedQuantity: String(line.quantity),
        deliveredQuantity: String(line.quantity),
        returnedQuantity: "0",
        availableStock: stockMap.get(line.productId) ?? 0,
      }))
    );
  }, [so, warehouseDetail]);

  const stockWarnings = lines.filter(
    (l) => Number(l.deliveredQuantity) > l.availableStock
  );

  const poOptions = eligibleSos.map((s) => ({
    value: s.id,
    label: `${s.soNumber} — ${s.customer.name} (${s.status.replace(/_/g, " ")})`,
  }));

  const warehouseOptions = (warehouses ?? []).map((w) => ({
    value: w.id,
    label: `${w.code} — ${w.name}`,
  }));

  function updateLine(productId: string, patch: Partial<DeliveryLineRow>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  async function handleSubmit(mode: "draft" | "deliver") {
    setSubmitError(null);
    setErrors({});

    if (!soId) {
      setErrors({ soId: t("form.selectSalesOrder") });
      return;
    }

    if (mode === "deliver" && stockWarnings.length > 0) {
      setSubmitError(t("action.insufficientStock"));
      return;
    }

    const schema = z.object({
      salesOrderId: z.string().uuid(),
      warehouseId: z.string().uuid().optional(),
      notes: z.string().optional(),
      lines: z
        .array(
          z.object({
            productId: z.string().uuid(),
            orderedQuantity: z.coerce.number().int().positive(),
            deliveredQuantity: z.coerce.number().int().min(0),
            returnedQuantity: z.coerce.number().int().min(0).default(0),
          })
        )
        .min(1),
    });

    const payload = {
      salesOrderId: soId,
      warehouseId: warehouseId || undefined,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        orderedQuantity: Number(l.orderedQuantity),
        deliveredQuantity: Number(l.deliveredQuantity),
        returnedQuantity: Number(l.returnedQuantity) || 0,
      })),
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setSubmitError(t("form.invalidLines"));
      return;
    }

    if (mode === "deliver" && !parsed.data.lines.some((l) => l.deliveredQuantity > 0)) {
      setSubmitError(t("wizard.deliverQtyRequired"));
      return;
    }

    setSubmitting(mode);
    try {
      const delivery = await createDeliveryMutation.mutateAsync(parsed.data);
      if (mode === "deliver") {
        const updated = await deliverDeliveryMutation.mutateAsync({ id: delivery.id });
        const href = `/dashboard/operations/deliveries/${updated.id}`;
        startNavigation(href);
        router.push(href);
      } else {
        const href = `/dashboard/operations/deliveries/${delivery.id}`;
        startNavigation(href);
        router.push(href);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("form.submitFailed"));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6" data-testid="delivery-form">
      <ActionFeedback error={submitError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="dl-so"
          label={t("form.salesOrder")}
          value={soId}
          onChange={setSoId}
          options={poOptions}
          placeholder={t("form.selectSalesOrder")}
          error={errors.soId}
          required
          disabled={Boolean(initialSoId)}
        />
        <SelectField
          id="dl-wh"
          label={t("form.warehouse")}
          value={warehouseId}
          onChange={setWarehouseId}
          options={warehouseOptions}
          placeholder={t("form.selectWarehouse")}
          required
        />
      </div>

      <FormField label={t("form.notes")} htmlFor="dl-notes">
        <textarea
          id="dl-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={cn(textareaClassName, "min-h-[4rem]")}
        />
      </FormField>

      {stockWarnings.length > 0 && (
        <div className="space-y-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-4 py-3">
          {stockWarnings.map((line) => (
            <div key={line.productId} className="flex items-start gap-2 text-sm text-[var(--warning)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                {line.name}: {t("wizard.stockShortage")
                  .replace("{need}", String(Number(line.deliveredQuantity)))
                  .replace("{avail}", String(line.availableStock))}
              </span>
            </div>
          ))}
        </div>
      )}

      {lines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("wizard.deliveryLines")}</h3>
          {lines.map((line) => (
            <div
              key={line.productId}
              className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-4 sm:grid-cols-12"
            >
              <div className="sm:col-span-4">
                <p className="text-sm font-medium">{line.name}</p>
                <p className="font-mono text-xs text-[var(--muted)]">{line.sku}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("form.ordered")}: {line.orderedQuantity} ·{" "}
                  {t("wizard.availableStockLabel").replace("{qty}", String(line.availableStock))}
                </p>
              </div>
              <div className="sm:col-span-3">
                <QuantityInput
                  id={`dl-del-${line.productId}`}
                  label={t("wizard.deliveredQty")}
                  value={line.deliveredQuantity}
                  onChange={(v) => updateLine(line.productId, { deliveredQuantity: v })}
                  min={0}
                />
              </div>
              <div className="sm:col-span-3">
                <QuantityInput
                  id={`dl-ret-${line.productId}`}
                  label={t("wizard.returnedQty")}
                  value={line.returnedQuantity}
                  onChange={(v) => updateLine(line.productId, { returnedQuantity: v })}
                  min={0}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="cursor-pointer"
          disabled={!!submitting}
          onClick={() => router.push("/dashboard/operations/deliveries")}
        >
          {t("form.cancel")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          loading={submitting === "draft"}
          loadingText={t("form.saving")}
          disabled={!!submitting}
          onClick={() => void handleSubmit("draft")}
        >
          {t("wizard.saveDraft")}
        </Button>
        <Button
          type="button"
          className="cursor-pointer"
          loading={submitting === "deliver"}
          loadingText={t("wizard.deliveringNow")}
          disabled={!!submitting || stockWarnings.length > 0}
          onClick={() => void handleSubmit("deliver")}
        >
          {t("wizard.deliverNow")}
        </Button>
      </div>
    </form>
  );
}
