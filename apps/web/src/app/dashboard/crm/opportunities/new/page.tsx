"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import {
  defaultOpportunityTitle,
  OpportunitySourceSelector,
  type OpportunitySource,
} from "@/components/crm/opportunity-source-selector";
import { AssigneeSelect } from "@/components/crm/assignee-select";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useCreateOpportunity } from "@/lib/hooks/use-crm";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CrmNavLinks } from "@/components/crm/crm-gate";
import type { CrmAssigneeOption, OpenOpportunityConflict, OpportunityStage } from "@ierp/shared";

export default function NewOpportunityPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const authUser = useAuthStore((s) => s.user);
  const createOpportunityMutation = useCreateOpportunity();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<OpportunitySource>(null);
  const [sourceError, setSourceError] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [assignee, setAssignee] = useState<CrmAssigneeOption | null>(null);
  const [assigneeError, setAssigneeError] = useState<string | undefined>();
  const [stage, setStage] = useState<OpportunityStage>("PROSPECTING");
  const [estimatedValue, setEstimatedValue] = useState("25000");
  const [probability, setProbability] = useState("30");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [duplicateOpps, setDuplicateOpps] = useState<OpenOpportunityConflict[]>([]);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  useEffect(() => {
    if (!assignee && authUser) {
      setAssignee({
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: null,
        isActive: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  const stageOptions = useMemo(
    () =>
      (["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION"] as const).map((s) => ({
        value: s,
        label: s.replace(/_/g, " "),
      })),
    []
  );

  function handleSourceChange(next: OpportunitySource) {
    setSource(next);
    setSourceError(undefined);
    setDuplicateOpps([]);
    setConfirmDuplicate(false);
    if (!titleTouched) {
      setTitle(defaultOpportunityTitle(next));
    }
  }

  async function handleSubmit(e: React.FormEvent, forceDuplicate = false) {
    e.preventDefault();
    if (!source) {
      setSourceError(t("crm.sourceRequired"));
      return;
    }
    if (!title.trim()) {
      setError(t("crm.titleRequired"));
      return;
    }
    if (!assignee) {
      setAssigneeError(t("crm.assigneeRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const opp = await createOpportunityMutation.mutateAsync({
        title: title.trim(),
        stage,
        estimatedValue: Number(estimatedValue),
        probability: Number(probability),
        expectedCloseDate: expectedCloseDate || undefined,
        notes: notes || undefined,
        leadId: source.kind === "lead" ? source.lead.id : undefined,
        customerId: source.kind === "customer" ? source.customer.id : undefined,
        assignedToId: assignee.id,
        confirmDuplicate: forceDuplicate || confirmDuplicate || undefined,
      });
      const href = `/dashboard/crm/opportunities/${opp.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      if (err instanceof ApiError && err.code === "OPEN_OPPORTUNITY_EXISTS") {
        const existing = Array.isArray(err.data?.existingOpportunities)
          ? (err.data.existingOpportunities as OpenOpportunityConflict[])
          : [];
        setDuplicateOpps(existing);
        setConfirmDuplicate(false);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : t("form.submitFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("crm.newOpportunity")} description={t("crm.opportunitiesDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <CrmNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6"
        >
          <ActionFeedback error={error} />

          <OpportunitySourceSelector
            value={source}
            onChange={handleSourceChange}
            error={sourceError}
          />

          {duplicateOpps.length > 0 && (
            <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t("crm.duplicateOpenOpportunity")}
              </p>
              <ul className="space-y-1.5">
                {duplicateOpps.map((opp) => (
                  <li key={opp.id}>
                    <Link
                      href={`/dashboard/crm/opportunities/${opp.id}`}
                      className="cursor-pointer text-sm text-[var(--accent)] hover:underline"
                    >
                      {opp.opportunityNumber} — {opp.title} ({opp.stage.replace(/_/g, " ")})
                    </Link>
                  </li>
                ))}
              </ul>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={confirmDuplicate}
                  onChange={(e) => setConfirmDuplicate(e.target.checked)}
                />
                {t("crm.confirmCreateAnother")}
              </label>
              <Button
                type="button"
                className="cursor-pointer"
                disabled={!confirmDuplicate || submitting}
                loading={submitting}
                onClick={(e) => void handleSubmit(e, true)}
              >
                {t("crm.createAnyway")}
              </Button>
            </div>
          )}

          <FormField label={t("crm.opportunityTitle")} htmlFor="opp-title" required>
            <input
              id="opp-title"
              className={inputClassName}
              value={title}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
              required
            />
          </FormField>

          <AssigneeSelect
            id="opp-assignee"
            label={t("crm.assignedTo")}
            value={assignee?.id}
            onChange={(next) => {
              setAssignee(next);
              setAssigneeError(undefined);
            }}
            initialOption={assignee}
            error={assigneeError}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="stage"
              label={t("crm.stage")}
              value={stage}
              onChange={(v) => setStage(v as OpportunityStage)}
              options={stageOptions}
            />
            <FormField label={t("crm.estimatedValue")} htmlFor="opp-value" required>
              <input
                id="opp-value"
                type="number"
                min={0}
                className={inputClassName}
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                required
              />
            </FormField>
            <FormField label={t("crm.probability")} htmlFor="opp-prob" required>
              <input
                id="opp-prob"
                type="number"
                min={0}
                max={100}
                className={inputClassName}
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                required
              />
            </FormField>
            <DatePicker
              id="expected-close-date"
              label={t("crm.expectedCloseDate")}
              value={expectedCloseDate}
              onChange={setExpectedCloseDate}
              optional
            />
          </div>

          <FormField label={t("crm.notes")} htmlFor="opp-notes">
            <textarea
              id="opp-notes"
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
              disabled={duplicateOpps.length > 0 && !confirmDuplicate}
            >
              {t("crm.newOpportunity")}
            </Button>
          </div>
        </form>
      </FadeIn>
    </ModuleLayout>
  );
}
