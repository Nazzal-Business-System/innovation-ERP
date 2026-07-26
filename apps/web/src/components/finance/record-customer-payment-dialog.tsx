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
import {
  useCreateCustomerPayment,
  useCustomerInvoice,
  useCustomerInvoices,
} from "@/lib/hooks/use-finance";
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

function isPayableInvoice(status: string, balanceDue: string) {
  return (
    !["DRAFT", "VOID", "PAID"].includes(status) &&
    parseMoney(balanceDue) > 0
  );
}

export function RecordCustomerPaymentDialog({
  open,
  onOpenChange,
  invoiceId: initialInvoiceId,
  invoiceNumber: initialInvoiceNumber,
  balanceDue: initialBalanceDue,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  invoiceNumber?: string;
  balanceDue?: string;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const createPaymentMutation = useCreateCustomerPayment();
  const allowSelect = !initialInvoiceId;

  const { data: invoicesData } = useCustomerInvoices({ page: 1 });
  const openInvoices = useMemo(
    () => (invoicesData?.data ?? []).filter((inv) => isPayableInvoice(inv.status, inv.balanceDue)),
    [invoicesData]
  );

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId ?? "");
  const activeInvoiceId = initialInvoiceId ?? selectedInvoiceId;
  const { data: invoiceDetail } = useCustomerInvoice(activeInvoiceId);

  const invoiceNumber =
    initialInvoiceNumber ??
    invoiceDetail?.invoiceNumber ??
    openInvoices.find((i) => i.id === activeInvoiceId)?.invoiceNumber ??
    "";
  const balanceDue =
    initialBalanceDue ??
    invoiceDetail?.balanceDue ??
    openInvoices.find((i) => i.id === activeInvoiceId)?.balanceDue ??
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
      setSelectedInvoiceId(initialInvoiceId ?? "");
      setAmount("");
      setPaymentMethod("BANK_TRANSFER");
      setPaymentDate(todayApiDate());
      setReference("");
      setNotes("");
      setErrors({});
      setSubmitError(null);
      setSuccess(null);
    }
  }, [open, initialInvoiceId]);

  useEffect(() => {
    if (open && maxAmount > 0) {
      setAmount(maxAmount.toFixed(2));
    }
  }, [open, maxAmount, activeInvoiceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    if (!activeInvoiceId) {
      setErrors({ invoiceId: t("form.selectInvoice") });
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
        customerInvoiceId: activeInvoiceId,
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

  const invoiceOptions = openInvoices.map((inv) => ({
    value: inv.id,
    label: `${inv.invoiceNumber} — ${inv.customer.name} (${inv.balanceDue})`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="customer-payment-dialog">
        <DialogHeader>
          <DialogTitle>{t("form.recordCustomerPayment")}</DialogTitle>
          <DialogDescription>
            {allowSelect
              ? t("form.recordCustomerPaymentDesc")
              : `${invoiceNumber} · ${t("form.balanceDue")}: ${balanceDue}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <ActionFeedback success={success} error={submitError} />

          {allowSelect && (
            <SelectField
              id="cp-invoice"
              label={t("form.invoice")}
              value={selectedInvoiceId}
              onChange={setSelectedInvoiceId}
              options={invoiceOptions}
              placeholder={t("form.selectInvoice")}
              error={errors.invoiceId}
              required
            />
          )}

          {activeInvoiceId && (
            <p className="text-sm text-[var(--muted)]">
              {t("form.balanceDue")}: <span className="font-semibold tabular-nums">{balanceDue}</span>
            </p>
          )}

          <MoneyInput
            id="cp-amount"
            label={t("form.amount")}
            value={amount}
            onChange={setAmount}
            max={maxAmount}
            error={errors.amount}
            hint={activeInvoiceId ? t("form.maxPayment").replace("{amount}", balanceDue) : undefined}
            required
            disabled={!activeInvoiceId}
          />

          <SelectField
            id="cp-method"
            label={t("form.paymentMethod.label")}
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={methodOptions}
            required
            disabled={!activeInvoiceId}
          />

          <DateInput
            id="cp-date"
            label={t("form.paymentDate")}
            value={paymentDate}
            onChange={setPaymentDate}
            disabled={!activeInvoiceId}
          />

          <FormField label={t("form.reference")} htmlFor="cp-ref">
            <input
              id="cp-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputClassName}
              disabled={!activeInvoiceId}
            />
          </FormField>

          <FormField label={t("form.notes")} htmlFor="cp-notes">
            <textarea
              id="cp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(textareaClassName, "min-h-[3rem]")}
              disabled={!activeInvoiceId}
            />
          </FormField>

          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("form.recordPayment")}
            loadingLabel={t("form.recording")}
            loading={submitting}
            disabled={!activeInvoiceId || maxAmount <= 0}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
