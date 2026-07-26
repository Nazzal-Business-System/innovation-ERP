"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DateInput } from "@/components/forms/date-input";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { SelectField } from "@/components/forms/select-field";
import { inputClassName, parseMoney, textareaClassName } from "@/lib/form-utils";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useCreateVendorPayment, useVendorBill, useVendorBills } from "@/lib/hooks/use-finance";
import { useI18n } from "@/lib/i18n";
import { apiDateToIsoUtcNoon, todayApiDate } from "@/lib/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", labelKey: "form.paymentMethod.bankTransfer" },
  { value: "CASH", labelKey: "form.paymentMethod.cash" },
  { value: "CARD", labelKey: "form.paymentMethod.card" },
  { value: "CHECK", labelKey: "form.paymentMethod.check" },
  { value: "WALLET", labelKey: "form.paymentMethod.wallet" },
] as const;

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "CHECK", "WALLET"]),
  paymentDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

function isPayableBill(status: string, balanceDue: string) {
  return !["DRAFT", "VOID", "PAID"].includes(status) && parseMoney(balanceDue) > 0;
}

export function RecordVendorPaymentDialog({
  open,
  onOpenChange,
  billId: initialBillId,
  billNumber: initialBillNumber,
  balanceDue: initialBalanceDue,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId?: string;
  billNumber?: string;
  balanceDue?: string;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const createPaymentMutation = useCreateVendorPayment();
  const allowSelect = !initialBillId;

  const { data: billsData } = useVendorBills({ page: 1 });
  const openBills = useMemo(
    () => (billsData?.data ?? []).filter((b) => isPayableBill(b.status, b.balanceDue)),
    [billsData]
  );

  const [selectedBillId, setSelectedBillId] = useState(initialBillId ?? "");
  const activeBillId = initialBillId ?? selectedBillId;
  const { data: billDetail } = useVendorBill(activeBillId);

  const billNumber =
    initialBillNumber ??
    billDetail?.billNumber ??
    openBills.find((b) => b.id === activeBillId)?.billNumber ??
    "";
  const balanceDue =
    initialBalanceDue ??
    billDetail?.balanceDue ??
    openBills.find((b) => b.id === activeBillId)?.balanceDue ??
    "JOD 0.00";

  const maxAmount = parseMoney(balanceDue);

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentDate, setPaymentDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedBillId(initialBillId ?? "");
      setAmount("");
      setPaymentMethod("BANK_TRANSFER");
      setPaymentDate(todayApiDate());
      setReference("");
      setNotes("");
      setErrors({});
      setSubmitError(null);
      setSuccess(null);
    }
  }, [open, initialBillId]);

  useEffect(() => {
    if (open && maxAmount > 0) {
      setAmount(maxAmount.toFixed(2));
    }
  }, [open, maxAmount, activeBillId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    if (!activeBillId) {
      setErrors({ billId: t("form.selectBill") });
      return;
    }

    const amountNum = Number(amount);
    if (amountNum > maxAmount + 0.001) {
      setErrors({ amount: t("form.overpaymentError").replace("{amount}", balanceDue) });
      return;
    }

    const payload = {
      amount: amountNum,
      paymentMethod,
      paymentDate: paymentDate ? apiDateToIsoUtcNoon(paymentDate) : undefined,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const parsed = paymentSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await createPaymentMutation.mutateAsync({
        vendorBillId: activeBillId,
        ...parsed.data,
      });
      setSuccess(t("form.paymentRecorded"));
      onSuccess();
      setTimeout(() => onOpenChange(false), 800);
    } catch (err) {
      setSubmitError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  const methodOptions = PAYMENT_METHODS.map((m) => ({
    value: m.value,
    label: t(m.labelKey),
  }));

  const billOptions = openBills.map((bill) => ({
    value: bill.id,
    label: `${bill.billNumber} — ${bill.vendor.name} (${bill.balanceDue})`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="vendor-payment-dialog">
        <DialogHeader>
          <DialogTitle>{t("form.recordVendorPayment")}</DialogTitle>
          <DialogDescription>
            {allowSelect
              ? t("form.recordVendorPaymentDesc")
              : `${billNumber} · ${t("form.balanceDue")}: ${balanceDue}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <ActionFeedback success={success} error={submitError} />

          {allowSelect && (
            <SelectField
              id="vp-bill"
              label={t("form.bill")}
              value={selectedBillId}
              onChange={setSelectedBillId}
              options={billOptions}
              placeholder={t("form.selectBill")}
              error={errors.billId}
              required
            />
          )}

          {activeBillId && (
            <p className="text-sm text-[var(--muted)]">
              {t("form.balanceDue")}: <span className="font-semibold tabular-nums">{balanceDue}</span>
            </p>
          )}

          <MoneyInput
            id="vp-amount"
            label={t("form.amount")}
            value={amount}
            onChange={setAmount}
            max={maxAmount}
            error={errors.amount}
            hint={activeBillId ? t("form.maxPayment").replace("{amount}", balanceDue) : undefined}
            required
            disabled={!activeBillId}
          />

          <SelectField
            id="vp-method"
            label={t("form.paymentMethod.label")}
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={methodOptions}
            required
            disabled={!activeBillId}
          />

          <DateInput
            id="vp-date"
            label={t("form.paymentDate")}
            value={paymentDate}
            onChange={setPaymentDate}
            disabled={!activeBillId}
          />

          <FormField label={t("form.reference")} htmlFor="vp-ref">
            <input
              id="vp-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputClassName}
              disabled={!activeBillId}
            />
          </FormField>

          <FormField label={t("form.notes")} htmlFor="vp-notes">
            <textarea
              id="vp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(textareaClassName, "min-h-[3rem]")}
              disabled={!activeBillId}
            />
          </FormField>

          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("form.recordPayment")}
            loadingLabel={t("form.recording")}
            loading={submitting}
            disabled={!activeBillId || maxAmount <= 0}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
