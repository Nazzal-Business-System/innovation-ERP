"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useCreateActivity } from "@/lib/hooks/use-crm";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CrmNavLinks } from "@/components/crm/crm-gate";
import { ACTIVITY_TYPE_LABELS } from "@/components/crm/crm-columns";
import type { CrmActivityType } from "@ierp/shared";

export default function NewActivityPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const createActivityMutation = useCreateActivity();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<CrmActivityType>("FOLLOW_UP");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const activity = await createActivityMutation.mutateAsync({
        type,
        subject,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });
      const href = `/dashboard/crm/activities/${activity.id}`;
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
      <FadeIn><PageHeader title={t("crm.newActivity")} description={t("crm.activitiesDesc")} /></FadeIn>
      <FadeIn delay={0.04}><CrmNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6">
          <ActionFeedback error={error} />
          <SelectField id="type" label="Type" value={type} onChange={(v) => setType(v as CrmActivityType)} options={Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          <FormField label="Subject" required>
            <input className={inputClassName} value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </FormField>
          <DatePicker id="due-date" label="Due Date" value={dueDate} onChange={setDueDate} optional />
          <FormField label="Notes">
            <textarea className={textareaClassName} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" className="cursor-pointer" onClick={() => router.back()}>{t("form.cancel")}</Button>
            <Button type="submit" className="cursor-pointer" loading={submitting}>{t("crm.newActivity")}</Button>
          </div>
        </form>
      </FadeIn>
    </ModuleLayout>
  );
}
