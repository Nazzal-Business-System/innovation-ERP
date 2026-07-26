"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useCreateLead } from "@/lib/hooks/use-crm";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CrmNavLinks } from "@/components/crm/crm-gate";
import { LEAD_SOURCE_LABELS } from "@/components/crm/crm-columns";
import type { LeadSource } from "@ierp/shared";

export default function NewLeadPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const createLeadMutation = useCreateLead();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Amman");
  const [source, setSource] = useState<LeadSource>("WEBSITE");
  const [estimatedValue, setEstimatedValue] = useState("10000");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const lead = await createLeadMutation.mutateAsync({
        companyName,
        contactName,
        email: email || undefined,
        phone: phone || undefined,
        city,
        source,
        estimatedValue: Number(estimatedValue),
        notes: notes || undefined,
      });
      const href = `/dashboard/crm/leads/${lead.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("crm.newLead")} description={t("crm.leadsDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}><CrmNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6">
          <ActionFeedback error={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Company Name" required>
              <input className={inputClassName} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </FormField>
            <FormField label="Contact Name" required>
              <input className={inputClassName} value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            </FormField>
            <FormField label="Email">
              <input type="email" className={inputClassName} value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="Phone">
              <input className={inputClassName} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <FormField label="City" required>
              <input className={inputClassName} value={city} onChange={(e) => setCity(e.target.value)} required />
            </FormField>
            <SelectField
              id="source"
              label="Source"
              value={source}
              onChange={(v) => setSource(v as LeadSource)}
              options={Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <FormField label="Estimated Value (JOD)" required>
              <input type="number" min={0} className={inputClassName} value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} required />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea className={textareaClassName} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => router.back()}>{t("form.cancel")}</Button>
            <Button type="submit" className="cursor-pointer" loading={submitting} loadingText={t("form.submitting")}>{t("crm.newLead")}</Button>
          </div>
        </form>
      </FadeIn>
    </ModuleLayout>
  );
}
