"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseMoney, newLineId } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { SelectField } from "./select-field";
import { QuantityInput } from "./quantity-input";
import { MoneyInput } from "./money-input";

export type LineItemRow = {
  id: string;
  productId: string;
  quantity: string;
  unitAmount: string;
};

type ProductOption = {
  id: string;
  sku: string;
  name: string;
  costPrice: string;
  sellPrice: string;
};

export function LineItemsEditor({
  lines,
  products,
  onChange,
  mode,
  errors,
}: {
  lines: LineItemRow[];
  products: ProductOption[];
  onChange: (lines: LineItemRow[]) => void;
  mode: "cost" | "price";
  errors?: Record<string, string>;
}) {
  const { t } = useI18n();

  function addLine() {
    onChange([...lines, { id: newLineId(), productId: "", quantity: "1", unitAmount: "0" }]);
  }

  function removeLine(id: string) {
    if (lines.length <= 1) return;
    onChange(lines.filter((l) => l.id !== id));
  }

  function updateLine(id: string, patch: Partial<LineItemRow>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function handleProductChange(lineId: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    const defaultAmount = product
      ? parseMoney(mode === "cost" ? product.costPrice : product.sellPrice)
      : 0;
    updateLine(lineId, {
      productId,
      unitAmount: defaultAmount > 0 ? String(defaultAmount) : "0",
    });
  }

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name}`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("form.lineItems")}</h3>
        <Button type="button" variant="outline" size="sm" className="cursor-pointer gap-1" onClick={addLine}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("form.addLine")}
        </Button>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={line.id}
            className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-4 sm:grid-cols-12"
          >
            <div className="sm:col-span-5">
              <SelectField
                id={`product-${line.id}`}
                label={`${t("form.product")} ${index + 1}`}
                value={line.productId}
                onChange={(v) => handleProductChange(line.id, v)}
                options={productOptions}
                placeholder={t("form.selectProduct")}
                error={errors?.[`lines.${index}.productId`]}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <QuantityInput
                id={`qty-${line.id}`}
                label={t("form.quantity")}
                value={line.quantity}
                onChange={(v) => updateLine(line.id, { quantity: v })}
                error={errors?.[`lines.${index}.quantity`]}
                required
              />
            </div>
            <div className="sm:col-span-3">
              <MoneyInput
                id={`unit-${line.id}`}
                label={mode === "cost" ? t("form.unitCost") : t("form.unitPrice")}
                value={line.unitAmount}
                onChange={(v) => updateLine(line.id, { unitAmount: v })}
                error={errors?.[`lines.${index}.unitAmount`]}
                required
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cursor-pointer text-[var(--destructive)] hover:text-[var(--destructive)]"
                onClick={() => removeLine(line.id)}
                disabled={lines.length <= 1}
                aria-label={t("form.removeLine")}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {errors?.lines && <p className="text-xs text-[var(--destructive)]">{errors.lines}</p>}
    </div>
  );
}

export function createEmptyLine(): LineItemRow {
  return { id: newLineId(), productId: "", quantity: "1", unitAmount: "0" };
}
