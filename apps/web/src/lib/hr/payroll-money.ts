import {
  formatJodAmount,
  parseMoneyAmount,
  sumMoneyAmounts,
  type MoneySumResult,
} from "@ierp/shared";

/** True when a payroll line amount can be used for pay/selection totals. */
export function hasValidPayrollNetPay(netPay: unknown): boolean {
  const parsed = parseMoneyAmount(netPay);
  return parsed.ok && parsed.value > 0;
}

export function sumPayrollNetPay(netPays: readonly unknown[]): MoneySumResult {
  return sumMoneyAmounts(netPays);
}

export function formatPayrollMoney(netPay: unknown, locale = "en-US"): string {
  const parsed = parseMoneyAmount(netPay);
  if (!parsed.ok) return "—";
  return formatJodAmount(parsed.value, locale);
}

export function requirePayrollNetTotal(
  netPays: readonly unknown[]
): { ok: true; total: number; formatted: string } | { ok: false; message: string } {
  const summed = sumMoneyAmounts(netPays);
  if (!summed.ok) {
    return {
      ok: false,
      message: "One or more selected lines have an invalid net pay amount",
    };
  }
  return {
    ok: true,
    total: summed.total,
    formatted: formatJodAmount(summed.total),
  };
}
