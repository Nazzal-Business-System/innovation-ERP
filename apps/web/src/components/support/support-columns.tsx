"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  SupportCategory,
  SupportTicket,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from "@ierp/shared";
import { StatusBadge } from "@/components/data-display/status-badge";
import { UserPersonChip } from "@/components/avatar/person-chips";
import { formatDisplayDateTime } from "@/lib/date";
import type { Locale } from "@/lib/i18n/types";

export function ticketStatusVariant(
  status: TicketStatus
): "active" | "pending" | "info" | "draft" | "inactive" | "error" {
  switch (status) {
    case "OPEN":
      return "info";
    case "IN_PROGRESS":
      return "active";
    case "WAITING_CUSTOMER":
      return "pending";
    case "RESOLVED":
      return "active";
    case "CLOSED":
      return "inactive";
    case "CANCELLED":
      return "error";
    default:
      return "draft";
  }
}

export function ticketPriorityVariant(
  priority: TicketPriority
): "active" | "pending" | "info" | "draft" | "error" {
  switch (priority) {
    case "CRITICAL":
      return "error";
    case "HIGH":
      return "pending";
    case "MEDIUM":
      return "info";
    default:
      return "draft";
  }
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_CUSTOMER: "Waiting Customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const TICKET_SOURCE_LABELS: Record<TicketSource, string> = {
  EMAIL: "Email",
  PHONE: "Phone",
  PORTAL: "Portal",
  INTERNAL: "Internal",
  WHATSAPP: "WhatsApp",
  OTHER: "Other",
};

export function ticketColumnsForLocale(locale: Locale): ColumnDef<SupportTicket>[] {
  return [
  {
    accessorKey: "ticketNumber",
    header: "Ticket",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/support/tickets/${row.original.id}`}
        className="cursor-pointer font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.ticketNumber}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.customer?.name ?? "—"}</span>
    ),
  },
  {
    id: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.category?.name ?? "—"}</span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <StatusBadge
        status={ticketPriorityVariant(row.original.priority)}
        label={TICKET_PRIORITY_LABELS[row.original.priority]}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={ticketStatusVariant(row.original.status)}
        label={TICKET_STATUS_LABELS[row.original.status]}
      />
    ),
  },
  {
    id: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => <UserPersonChip user={row.original.assignedTo} />,
  },
  {
    accessorKey: "dueAt",
    header: "Due Date",
    cell: ({ row }) => (
      <span
        className={
          row.original.isOverdue
            ? "text-sm font-medium text-[var(--destructive)]"
            : "text-sm text-[var(--muted)]"
        }
      >
        {formatDisplayDateTime(row.original.dueAt, locale)}
        {row.original.isOverdue ? " (overdue)" : ""}
      </span>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">
        {TICKET_SOURCE_LABELS[row.original.source]}
      </span>
    ),
  },
  ];
}

export const ticketColumns = ticketColumnsForLocale("en");

export const categoryColumns: ColumnDef<SupportCategory>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/support/categories/${row.original.id}`}
        className="cursor-pointer font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.description ?? "—"}</span>
    ),
  },
  {
    accessorKey: "ticketCount",
    header: "Tickets",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.ticketCount ?? 0}</span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.isActive ? "active" : "inactive"}
        label={row.original.isActive ? "Active" : "Inactive"}
      />
    ),
  },
];
