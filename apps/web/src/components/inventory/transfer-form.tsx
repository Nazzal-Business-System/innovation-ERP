"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { QuantityInput } from "@/components/forms/quantity-input";
import { textareaClassName } from "@/lib/form-utils";
import {
  useCreateTransfer,
  useInventoryProducts,
  useInventoryWarehouse,
  useInventoryWarehouses,
} from "@/lib/hooks/use-inventory";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";

type TransferLineRow = {
  productId: string;
  sku: string;
  name: string;
  quantity: string;
  availableStock: number;
};

export function TransferForm() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const createMutation = useCreateTransfer();

  const { data: warehouses } = useInventoryWarehouses({ active: true });
  const { data: productsData } = useInventoryProducts({
    status: "ACTIVE",
    archived: false,
    page: 1,
  });

  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const { data: sourceDetail } = useInventoryWarehouse(sourceWarehouseId);

  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLineRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const products = useMemo(() => productsData?.data ?? [], [productsData?.data]);

  useEffect(() => {
    if (!sourceDetail || products.length === 0) return;
    const stockMap = new Map(sourceDetail.stock.map((s) => [s.productId, s.available]));
    setLines(
      products.slice(0, 5).map((p) => ({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        quantity: "0",
        availableStock: stockMap.get(p.id) ?? 0,
      }))
    );
  }, [sourceDetail, products]);

  const warehouseOptions = (warehouses ?? []).map((w) => ({
    value: w.id,
    label: `${w.code} — ${w.name}`,
  }));

  const destinationOptions = warehouseOptions.filter((w) => w.value !== sourceWarehouseId);

  const stockWarnings = useMemo(
    () => lines.filter((l) => Number(l.quantity) > 0 && Number(l.quantity) > l.availableStock),
    [lines]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!sourceWarehouseId || !destinationWarehouseId) {
      setSubmitError("Select source and destination warehouses.");
      return;
    }

    if (sourceWarehouseId === destinationWarehouseId) {
      setSubmitError("Source and destination must differ.");
      return;
    }

    const activeLines = lines
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }));

    if (activeLines.length === 0) {
      setSubmitError("Add at least one product with quantity.");
      return;
    }

    if (stockWarnings.length > 0) {
      setSubmitError("Insufficient available stock for one or more lines.");
      return;
    }

    setSubmitting(true);
    try {
      const transfer = await createMutation.mutateAsync({
        sourceWarehouseId,
        destinationWarehouseId,
        notes: notes || undefined,
        lines: activeLines,
      });
      const href = `/dashboard/inventory/transfers/${transfer.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("form.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <ActionFeedback error={submitError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="sourceWarehouseId"
          label={t("inventory.sourceWarehouse")}
          value={sourceWarehouseId}
          onChange={setSourceWarehouseId}
          options={[{ value: "", label: "Select source…" }, ...warehouseOptions]}
          required
        />
        <SelectField
          id="destinationWarehouseId"
          label={t("inventory.destinationWarehouse")}
          value={destinationWarehouseId}
          onChange={setDestinationWarehouseId}
          options={[{ value: "", label: "Select destination…" }, ...destinationOptions]}
          required
        />
      </div>

      <FormField label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={textareaClassName}
          placeholder="Optional transfer notes"
        />
      </FormField>

      {sourceWarehouseId && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Products</h3>
          {lines.map((line, index) => (
            <div
              key={line.productId}
              className="grid gap-3 rounded-xl border border-[var(--border-subtle)] p-4 sm:grid-cols-[1fr_140px]"
            >
              <div>
                <p className="font-medium">{line.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {line.sku} · Available: {line.availableStock.toLocaleString()}
                </p>
              </div>
              <QuantityInput
                id={`transfer-qty-${line.productId}`}
                label="Qty"
                value={line.quantity}
                onChange={(v) => {
                  const next = [...lines];
                  next[index] = { ...line, quantity: v };
                  setLines(next);
                }}
                min={0}
              />
            </div>
          ))}
        </div>
      )}

      {stockWarnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Insufficient available stock</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {stockWarnings.map((w) => (
                <li key={w.productId}>
                  {w.sku}: need {w.quantity}, available {w.availableStock}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => router.back()}>
          {t("form.cancel")}
        </Button>
        <Button
          type="submit"
          className="cursor-pointer"
          loading={submitting}
          loadingText={t("form.submitting")}
          disabled={stockWarnings.length > 0 || !sourceWarehouseId || !destinationWarehouseId}
        >
          {t("inventory.newTransfer")}
        </Button>
      </div>
    </form>
  );
}
