"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  CrmActivity,
  CrmActivityType,
  CrmLead,
  CrmOpportunity,
  LeadSource,
  LeadStatus,
  OpportunityStage,
} from "@ierp/shared";
import { UserPersonChip } from "@/components/avatar/person-chips";
import { StatusBadge } from "@/components/data-display/status-badge";
import { formatDisplayDate } from "@/lib/date";
import { useI18n } from "@/lib/i18n";

function DisplayDate({ value }: { value: string | null | undefined }) {
  const { locale } = useI18n();
  return <>{formatDisplayDate(value, locale)}</>;
}

export function leadStatusVariant(status: LeadStatus): "active" | "pending" | "info" | "draft" {
  switch (status) {
    case "QUALIFIED":
    case "CONVERTED":
      return "active";
    case "CONTACTED":
      return "info";
    case "NEW":
      return "draft";
    case "LOST":
      return "pending";
    default:
      return "draft";
  }
}

export function opportunityStageVariant(
  stage: OpportunityStage
): "active" | "pending" | "info" | "draft" {
  switch (stage) {
    case "WON":
      return "active";
    case "NEGOTIATION":
    case "PROPOSAL":
      return "info";
    case "LOST":
      return "pending";
    default:
      return "draft";
  }
}

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  SOCIAL_MEDIA: "Social Media",
  FIELD_SALES: "Field Sales",
  EVENT: "Event",
  OTHER: "Other",
};

export const ACTIVITY_TYPE_LABELS: Record<CrmActivityType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  TASK: "Task",
  FOLLOW_UP: "Follow-up",
};

export const leadColumns: ColumnDef<CrmLead>[] = [
  {
    accessorKey: "leadNumber",
    header: "Lead",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/crm/leads/${row.original.id}`}
        className="font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.leadNumber}
      </Link>
    ),
  },
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => <span className="font-medium">{row.original.companyName}</span>,
  },
  {
    accessorKey: "contactName",
    header: "Contact",
    cell: ({ row }) => <span className="text-sm">{row.original.contactName}</span>,
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">
        {LEAD_SOURCE_LABELS[row.original.source]}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={leadStatusVariant(row.original.status)} label={row.original.status} />
    ),
  },
  {
    accessorKey: "estimatedValue",
    header: "Est. Value",
    cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.estimatedValue}</span>,
  },
  {
    id: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => <UserPersonChip user={row.original.assignedTo} />,
  },
];

export const opportunityColumns: ColumnDef<CrmOpportunity>[] = [
  {
    accessorKey: "opportunityNumber",
    header: "Opportunity",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/crm/opportunities/${row.original.id}`}
        className="font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.opportunityNumber}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    id: "linked",
    header: "Lead / Customer",
    cell: ({ row }) => {
      const customer = row.original.customer;
      const lead = row.original.lead;
      if (customer) {
        return (
          <Link
            href={`/dashboard/sales/customers/${customer.id}`}
            className="cursor-pointer text-sm text-[var(--accent)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {customer.name}
          </Link>
        );
      }
      if (lead) {
        return (
          <Link
            href={`/dashboard/crm/leads/${lead.id}`}
            className="cursor-pointer text-sm text-[var(--accent)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {lead.companyName}
          </Link>
        );
      }
      return <span className="text-sm text-[var(--muted)]">—</span>;
    },
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => (
      <StatusBadge
        status={opportunityStageVariant(row.original.stage)}
        label={row.original.stage.replace(/_/g, " ")}
      />
    ),
  },
  {
    accessorKey: "estimatedValue",
    header: "Value",
    cell: ({ row }) => <span className="tabular-nums">{row.original.estimatedValue}</span>,
  },
  {
    accessorKey: "probability",
    header: "Probability",
    cell: ({ row }) => <span className="tabular-nums">{row.original.probability}%</span>,
  },
  {
    accessorKey: "expectedCloseDate",
    header: "Close Date",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]"><DisplayDate value={row.original.expectedCloseDate} /></span>
    ),
  },
  {
    id: "assignedTo",
    header: "Assigned",
    cell: ({ row }) => <UserPersonChip user={row.original.assignedTo} />,
  },
];

export const activityColumns: ColumnDef<CrmActivity>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{ACTIVITY_TYPE_LABELS[row.original.type]}</span>
    ),
  },
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/crm/activities/${row.original.id}`}
        className="font-medium text-[var(--accent)] hover:underline"
      >
        {row.original.subject}
      </Link>
    ),
  },
  {
    id: "linked",
    header: "Linked To",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">
        {row.original.opportunity?.title ??
          row.original.lead?.companyName ??
          row.original.customer?.name ??
          "—"}
      </span>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => (
      <span
        className={
          row.original.isOverdue ? "text-sm font-medium text-amber-600 dark:text-amber-400" : "text-sm"
        }
      >
        <DisplayDate value={row.original.dueDate} />
      </span>
    ),
  },
  {
    id: "assignedTo",
    header: "Assigned",
    cell: ({ row }) => <UserPersonChip user={row.original.assignedTo} />,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.isCompleted ? "active" : row.original.isOverdue ? "pending" : "info"}
        label={row.original.isCompleted ? "Completed" : row.original.isOverdue ? "Overdue" : "Open"}
      />
    ),
  },
];

export const crmActivityLineColumns: ColumnDef<CrmActivity>[] = activityColumns;
