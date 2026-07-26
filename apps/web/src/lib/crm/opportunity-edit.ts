import type { OpportunityStage, UpdateOpportunityInput } from "@ierp/shared";

export type OpportunityEditBaseline = {
  title: string;
  assignedToId: string | null | undefined;
  stage: OpportunityStage;
  /** Numeric amount already parsed from display money, or raw number string digits. */
  estimatedValue: number;
  probability: number;
  expectedCloseDate: string | null;
  notes: string | null;
};

export type OpportunityEditDraft = {
  title: string;
  assignedToId: string | null | undefined;
  stage: OpportunityStage;
  estimatedValue: string;
  probability: string;
  expectedCloseDate: string;
  notes: string;
};

export type OpportunityEditValidationErrors = Partial<
  Record<"title" | "assignee" | "estimatedValue" | "probability", string>
>;

export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("-")) return null;
  const cleaned = trimmed.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function parseProbabilityInput(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 100) {
    return null;
  }
  return value;
}

/**
 * Build a PATCH body containing only changed fields.
 * Always sending `stage` for WON/LOST opportunities previously made the API reject
 * unrelated edits (`Cannot change stage from WON|LOST`).
 */
export function buildOpportunityUpdateInput(
  baseline: OpportunityEditBaseline,
  draft: OpportunityEditDraft,
  messages: {
    titleRequired: string;
    assigneeRequired: string;
    valueInvalid: string;
    probabilityInvalid: string;
  }
):
  | { ok: true; input: UpdateOpportunityInput }
  | { ok: false; errors: OpportunityEditValidationErrors } {
  const errors: OpportunityEditValidationErrors = {};

  const title = draft.title.trim();
  if (!title) errors.title = messages.titleRequired;
  if (!draft.assignedToId) errors.assignee = messages.assigneeRequired;

  const estimatedValue = parseMoneyInput(draft.estimatedValue);
  if (estimatedValue === null) errors.estimatedValue = messages.valueInvalid;

  const probability = parseProbabilityInput(draft.probability);
  if (probability === null) errors.probability = messages.probabilityInvalid;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const nextClose = draft.expectedCloseDate.trim() ? draft.expectedCloseDate.trim() : null;
  const nextNotes = draft.notes.trim() ? draft.notes.trim() : null;

  const input: UpdateOpportunityInput = {};

  if (title !== baseline.title) input.title = title;
  if (draft.assignedToId !== baseline.assignedToId) {
    input.assignedToId = draft.assignedToId!;
  }
  if (draft.stage !== baseline.stage) input.stage = draft.stage;
  if (estimatedValue !== baseline.estimatedValue) input.estimatedValue = estimatedValue!;
  if (probability !== baseline.probability) input.probability = probability!;
  if (nextClose !== (baseline.expectedCloseDate ?? null)) {
    input.expectedCloseDate = nextClose;
  }
  if (nextNotes !== (baseline.notes ?? null)) input.notes = nextNotes;

  return { ok: true, input };
}

export function opportunityEditHasChanges(input: UpdateOpportunityInput): boolean {
  return Object.keys(input).length > 0;
}
