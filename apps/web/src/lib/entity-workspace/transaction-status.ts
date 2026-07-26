import type { BadgeProps } from "@/components/ui/badge";

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function transactionStatusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "DRAFT":
      return "secondary";
    case "SENT":
    case "PICKED":
    case "PICKING":
    case "READY_TO_SHIP":
    case "IN_TRANSIT":
    case "PARTIALLY_RECEIVED":
    case "PARTIALLY_PAID":
    case "OVERDUE":
      return "warning";
    case "CONFIRMED":
    case "APPROVED":
      return "info";
    case "DELIVERED":
    case "RECEIVED":
    case "COMPLETED":
    case "INVOICED":
    case "PAID":
    case "POSTED":
    case "ACTIVE":
    case "CONSUMED":
      return "success";
    case "RELEASED":
      return "secondary";
    case "CANCELLED":
    case "VOID":
      return "destructive";
    default:
      return "secondary";
  }
}

/** Alias for financial document badges (invoices, bills, journal entries). */
export const financialStatusVariant = transactionStatusVariant;

export type WorkflowStepDef = {
  id: string;
  label: string;
  active?: boolean;
  done?: boolean;
};

export function buildLinearWorkflowSteps(
  stages: Array<{ id: string; label: string }>,
  currentId: string
): WorkflowStepDef[] {
  const currentIdx = stages.findIndex((s) => s.id === currentId);
  return stages.map((stage, idx) => ({
    id: stage.id,
    label: stage.label,
    active: stage.id === currentId,
    done: currentIdx >= 0 && idx < currentIdx,
  }));
}
