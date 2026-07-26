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
import { useInventoryWarehouses } from "@/lib/hooks/use-inventory";
import {
  useCreateGoodsReceipt,
  useReceiveGoodsReceipt,
} from "@/lib/hooks/use-operations";
import {
  useProcurementPurchaseOrder,
  useProcurementPurchaseOrders,
} from "@/lib/hooks/use-procurement";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";

type ReceiptLineRow = {
  productId: string;
  sku: string;
  name: string;
  orderedQuantity: string;
  receivedQuantity: string;
  rejectedQuantity: string;
};

const RECEIVABLE_PO_STATUSES = new Set(["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"]);

export function GoodsReceiptForm({ initialPoId }: { initialPoId?: string }) {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const createReceiptMutation = useCreateGoodsReceipt();
  const receiveReceiptMutation = useReceiveGoodsReceipt();

  const { data: poList } = useProcurementPurchaseOrders({ page: 1 });
  const eligiblePos = useMemo(
    () => (poList?.data ?? []).filter((po) => RECEIVABLE_PO_STATUSES.has(po.status)),
    [poList]
  );

  const [poId, setPoId] = useState(initialPoId ?? "");
  const { data: po } = useProcurementPurchaseOrder(poId);
  const { data: warehouses } = useInventoryWarehouses({ active: true });

  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReceiptLineRow[]>([]);
  const [submitting, setSubmitting] = useState<"draft" | "receive" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialPoId) setPoId(initialPoId);
  }, [initialPoId]);

  useEffect(() => {
    if (!po) return;
    setWarehouseId(po.warehouse.id);
    setLines(
      po.lines.map((line) => ({
        productId: line.productId,
        sku: line.sku,
        name: line.productName,
        orderedQuantity: String(line.quantity),
        receivedQuantity: String(line.quantity),
        rejectedQuantity: "0",
      }))
    );
  }, [po]);

  const poOptions = eligiblePos.map((p) => ({
    value: p.id,
    label: `${p.poNumber} — ${p.vendor.name} (${p.status.replace(/_/g, " ")})`,
  }));

  const warehouseOptions = (warehouses ?? []).map((w) => ({
    value: w.id,
    label: `${w.code} — ${w.name}`,
  }));

  function updateLine(productId: string, patch: Partial<ReceiptLineRow>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  async function handleSubmit(mode: "draft" | "receive") {
    setSubmitError(null);
    setErrors({});

    if (!poId) {
      setErrors({ poId: t("form.selectPurchaseOrder") });
      return;
    }

    const schema = z.object({
      purchaseOrderId: z.string().uuid(),
      warehouseId: z.string().uuid().optional(),
      notes: z.string().optional(),
      lines: z
        .array(
          z.object({
            productId: z.string().uuid(),
            orderedQuantity: z.coerce.number().int().positive(),
            receivedQuantity: z.coerce.number().int().min(0),
            rejectedQuantity: z.coerce.number().int().min(0).default(0),
          })
        )
        .min(1),
    });

    const payload = {
      purchaseOrderId: poId,
      warehouseId: warehouseId || undefined,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        orderedQuantity: Number(l.orderedQuantity),
        receivedQuantity: Number(l.receivedQuantity),
        rejectedQuantity: Number(l.rejectedQuantity) || 0,
      })),
    };

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setSubmitError(t("form.invalidLines"));
      return;
    }

    if (mode === "receive" && !parsed.data.lines.some((l) => l.receivedQuantity > 0)) {
      setSubmitError(t("wizard.receiveQtyRequired"));
      return;
    }

    setSubmitting(mode);
    try {
      const receipt = await createReceiptMutation.mutateAsync(parsed.data);
      if (mode === "receive") {
        const updated = await receiveReceiptMutation.mutateAsync({ id: receipt.id });
        const href = `/dashboard/operations/goods-receipts/${updated.id}`;
        startNavigation(href);
        router.push(href);
      } else {
        const href = `/dashboard/operations/goods-receipts/${receipt.id}`;
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
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-6"
      data-testid="goods-receipt-form"
    >
      <ActionFeedback error={submitError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="gr-po"
          label={t("form.purchaseOrder")}
          value={poId}
          onChange={setPoId}
          options={poOptions}
          placeholder={t("form.selectPurchaseOrder")}
          error={errors.poId}
          required
          disabled={Boolean(initialPoId)}
        />
        <SelectField
          id="gr-wh"
          label={t("form.warehouse")}
          value={warehouseId}
          onChange={setWarehouseId}
          options={warehouseOptions}
          placeholder={t("form.selectWarehouse")}
          required
        />
      </div>

      <FormField label={t("form.notes")} htmlFor="gr-notes">
        <textarea
          id="gr-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={cn(textareaClassName, "min-h-[4rem]")}
        />
      </FormField>

      {lines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("wizard.receiptLines")}</h3>
          {lines.map((line) => (
            <div
              key={line.productId}
              className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-4 sm:grid-cols-12"
            >
              <div className="sm:col-span-4">
                <p className="text-sm font-medium">{line.name}</p>
                <p className="font-mono text-xs text-[var(--muted)]">{line.sku}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("form.ordered")}: {line.orderedQuantity}
                </p>
              </div>
              <div className="sm:col-span-3">
                <QuantityInput
                  id={`gr-rcv-${line.productId}`}
                  label={t("wizard.receivedQty")}
                  value={line.receivedQuantity}
                  onChange={(v) => updateLine(line.productId, { receivedQuantity: v })}
                  min={0}
                />
              </div>
              <div className="sm:col-span-3">
                <QuantityInput
                  id={`gr-rej-${line.productId}`}
                  label={t("wizard.rejectedQty")}
                  value={line.rejectedQuantity}
                  onChange={(v) => updateLine(line.productId, { rejectedQuantity: v })}
                  min={0}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {po && !RECEIVABLE_PO_STATUSES.has(po.status) && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{t("wizard.poNotReceivable")}</span>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          className="cursor-pointer"
          disabled={!!submitting}
          onClick={() => router.push("/dashboard/operations/goods-receipts")}
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
          loading={submitting === "receive"}
          loadingText={t("wizard.receivingNow")}
          disabled={!!submitting}
          onClick={() => void handleSubmit("receive")}
        >
          {t("wizard.receiveNow")}
        </Button>
      </div>
    </form>
  );
}
