"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { CUSTOMER_TYPE_LABELS } from "@/components/sales/so-status-badge";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useCreateCustomer } from "@/lib/hooks/use-sales";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { CreateCustomerInput, CustomerType } from "@ierp/shared";

const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "RETAILER", label: CUSTOMER_TYPE_LABELS.RETAILER },
  { value: "WHOLESALER", label: CUSTOMER_TYPE_LABELS.WHOLESALER },
  { value: "CORPORATE", label: CUSTOMER_TYPE_LABELS.CORPORATE },
  { value: "DISTRIBUTOR", label: CUSTOMER_TYPE_LABELS.DISTRIBUTOR },
];

const DEFAULT_PAYMENT_TERMS = "Net 30";

type CreateCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful create (list caches already updated). */
  onCreated?: (customerId: string) => void;
  navigateOnSuccess?: boolean;
};

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCreated,
  navigateOnSuccess = true,
}: CreateCustomerDialogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const createMutation = useCreateCustomer();

  const [name, setName] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("RETAILER");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Amman");
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_PAYMENT_TERMS);
  const [creditLimit, setCreditLimit] = useState("0");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setCustomerType("RETAILER");
    setContactName("");
    setEmail("");
    setPhone("");
    setCity("Amman");
    setPaymentTerms(DEFAULT_PAYMENT_TERMS);
    setCreditLimit("0");
    setNotes("");
    setFieldErrors({});
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!shouldAllowEditDialogClose(submitting, next)) return;
    onOpenChange(next);
    if (!next) {
      setFieldErrors({});
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || createMutation.isPending) return;

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = t("masterData.nameRequired");
    if (!city.trim()) errors.city = t("masterData.cityRequired", "City is required.");
    if (!paymentTerms.trim()) {
      errors.paymentTerms = t("masterData.paymentTermsRequired", "Payment terms are required.");
    }
    const creditLimitValue = Number(creditLimit);
    if (!Number.isFinite(creditLimitValue) || creditLimitValue < 0) {
      errors.creditLimit = t("masterData.priceInvalid");
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = t("form.invalidEmail", "Enter a valid email address.");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    const input: CreateCustomerInput = {
      name: name.trim(),
      customerType,
      contactName: contactName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      city: city.trim(),
      paymentTerms: paymentTerms.trim(),
      creditLimit: creditLimitValue,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createMutation.mutateAsync(input);
      resetForm();
      onOpenChange(false);
      onCreated?.(created.id);
      if (navigateOnSuccess) {
        const href = `/dashboard/sales/customers/${created.id}`;
        startNavigation(href);
        router.push(href);
      }
    } catch (err) {
      setError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("masterData.createCustomer", "Create customer")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <ActionFeedback error={error} />
          <FormField label={t("masterData.name", "Name")} required error={fieldErrors.name}>
            <input
              className={inputClassName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </FormField>
          <SelectField
            id="create-customer-type"
            label={t("masterData.customerType", "Customer type")}
            value={customerType}
            onChange={(v) => setCustomerType(v as CustomerType)}
            options={CUSTOMER_TYPE_OPTIONS}
            disabled={submitting}
          />
          <FormField label={t("masterData.contactName", "Contact name")}>
            <input
              className={inputClassName}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("masterData.email")} error={fieldErrors.email}>
              <input
                type="email"
                className={inputClassName}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </FormField>
            <FormField label={t("masterData.phone")}>
              <input
                className={inputClassName}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
              />
            </FormField>
          </div>
          <FormField label={t("masterData.city")} required error={fieldErrors.city}>
            <input
              className={inputClassName}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("masterData.paymentTerms")}
              required
              error={fieldErrors.paymentTerms}
            >
              <input
                className={inputClassName}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                disabled={submitting}
                placeholder="Net 30"
              />
            </FormField>
            <FormField
              label={t("masterData.creditLimit")}
              required
              error={fieldErrors.creditLimit}
            >
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClassName}
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                disabled={submitting}
              />
            </FormField>
          </div>
          <FormField label={t("entityWorkspace.notes")}>
            <textarea
              className={textareaClassName}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("masterData.createCustomer", "Create customer")}
            loading={submitting}
            disabled={submitting}
            onCancel={() => handleOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
