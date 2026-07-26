import { calcOrderTotals, formatMoneyAmount } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";

export function OrderTotalsSummary({
  lines,
}: {
  lines: Array<{ quantity: number; unitAmount: number }>;
  unitKey?: "unitCost" | "unitPrice";
}) {
  const { t } = useI18n();
  const { subtotal, taxAmount, totalAmount } = calcOrderTotals(lines);

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 p-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--muted)]">{t("form.subtotal")}</span>
          <span className="font-medium tabular-nums">{formatMoneyAmount(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--muted)]">{t("form.tax")}</span>
          <span className="font-medium tabular-nums">{formatMoneyAmount(taxAmount)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
          <span className="font-semibold">{t("form.total")}</span>
          <span className="text-lg font-bold tabular-nums text-[var(--accent)]">{formatMoneyAmount(totalAmount)}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">{t("form.totalsHint")}</p>
    </div>
  );
}
