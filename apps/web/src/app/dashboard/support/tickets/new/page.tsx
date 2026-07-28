"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useCreateSupportTicket, useSupportCategories } from "@/lib/hooks/use-support";
import { useSalesCustomers } from "@/lib/hooks/use-sales";
import { useProjects } from "@/lib/hooks/use-projects";
import { useSettingsUsers } from "@/lib/hooks/use-settings";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SupportNavLinks } from "@/components/support/support-gate";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_SOURCE_LABELS,
} from "@/components/support/support-columns";
import type { TicketPriority, TicketSource } from "@ierp/shared";

export default function NewTicketPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { data: categoriesData } = useSupportCategories({ activeOnly: true });
  const { data: customersData } = useSalesCustomers({ active: true });
  const { data: projectsData } = useProjects({});
  const { data: usersData } = useSettingsUsers({ page: 1, pageSize: 100 });
  const createTicketMutation = useCreateSupportTicket();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [source, setSource] = useState<TicketSource>("INTERNAL");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueAt, setDueAt] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await createTicketMutation.mutateAsync({
        title,
        description,
        priority,
        source,
        customerId: customerId || null,
        projectId: projectId || null,
        categoryId: categoryId || null,
        assignedToId: assignedToId || null,
        dueAt: dueAt || null,
      });
      const href = `/dashboard/support/tickets/${ticket.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const customerOptions = [
    { value: "", label: t("support.noCustomer") },
    ...(customersData?.data ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
  ];
  const projectOptions = [
    { value: "", label: t("support.noProject") },
    ...(projectsData?.data ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  ];
  const categoryOptions = [
    { value: "", label: t("support.noCategory") },
    ...(categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const userOptions = [
    { value: "", label: t("support.unassigned") },
    ...(usersData?.data ?? []).map((u) => ({ value: u.id, label: u.name })),
  ];

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("support.newTicket")} description={t("support.newTicketDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <SupportNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6"
        >
          <ActionFeedback error={error} />
          <FormField label={t("support.ticketTitle")} required>
            <input
              className={inputClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t("support.ticketDescription")} required>
            <textarea
              className={textareaClassName}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="priority"
              label={t("support.priority")}
              value={priority}
              onChange={(v) => setPriority(v as TicketPriority)}
              options={Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <SelectField
              id="source"
              label={t("support.source")}
              value={source}
              onChange={(v) => setSource(v as TicketSource)}
              options={Object.entries(TICKET_SOURCE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <SelectField
              id="customer"
              label={t("support.customer")}
              value={customerId}
              onChange={setCustomerId}
              options={customerOptions}
            />
            <SelectField
              id="project"
              label="Project"
              value={projectId}
              onChange={setProjectId}
              options={projectOptions}
            />
            <SelectField
              id="category"
              label={t("nav.categories")}
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
            />
            <SelectField
              id="assignee"
              label={t("support.assignee")}
              value={assignedToId}
              onChange={setAssignedToId}
              options={userOptions}
            />
            <DatePicker
              id="due-at"
              label={t("support.dueDate")}
              value={dueAt}
              onChange={setDueAt}
              optional
            />
          </div>
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
              {t("support.newTicket")}
            </Button>
          </div>
        </form>
      </FadeIn>
    </ModuleLayout>
  );
}
