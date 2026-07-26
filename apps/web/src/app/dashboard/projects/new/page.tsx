"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { useSalesCustomers } from "@/lib/hooks/use-sales";
import { useSettingsUsers } from "@/lib/hooks/use-settings";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectsNavLinks } from "@/components/projects/projects-gate";
import type { ProjectStatus } from "@ierp/shared";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { data: customersData } = useSalesCustomers({ active: true });
  const { data: usersData } = useSettingsUsers();
  const createProjectMutation = useCreateProject();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNING");
  const [budget, setBudget] = useState("50000");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const project = await createProjectMutation.mutateAsync({
        name,
        customerId: customerId || null,
        managerId: managerId || null,
        startDate: startDate || null,
        targetDate: targetDate || null,
        status,
        budget: Number(budget),
        notes: notes || null,
      });
      const href = `/dashboard/projects/${project.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const customerOptions = [
    { value: "", label: "No customer" },
    ...(customersData?.data ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
  ];

  const userOptions = [
    { value: "", label: "Unassigned" },
    ...(usersData?.data ?? []).map((u) => ({ value: u.id, label: u.name })),
  ];

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("projects.newProject")} description={t("projects.description")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <ProjectsNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6"
        >
          <ActionFeedback error={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Project Name" required>
              <input
                className={inputClassName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>
            <SelectField
              id="status"
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as ProjectStatus)}
              options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
            <SelectField
              id="customer"
              label="Customer"
              value={customerId}
              onChange={setCustomerId}
              options={customerOptions}
            />
            <SelectField
              id="manager"
              label="Project Manager"
              value={managerId}
              onChange={setManagerId}
              options={userOptions}
            />
            <DatePicker
              id="start-date"
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              max={targetDate || undefined}
              optional
            />
            <DatePicker
              id="target-date"
              label="Target Date"
              value={targetDate}
              onChange={setTargetDate}
              min={startDate || undefined}
              optional
            />
            <FormField label="Budget (JOD)" required>
              <input
                type="number"
                min={0}
                className={inputClassName}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea
              className={textareaClassName}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              onClick={() => router.back()}
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              loading={submitting}
              loadingText={t("form.submitting")}
            >
              {t("projects.newProject")}
            </Button>
          </div>
        </form>
      </FadeIn>
    </ModuleLayout>
  );
}
