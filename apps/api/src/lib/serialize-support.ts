import type { Prisma } from "@prisma/client";
import type {
  SupportCategory,
  SupportTicket,
  SupportTicketComment,
  SupportTicketDetail,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from "@ierp/shared";

type UserRow = {
  id: string;
  name: string;
  email: string;
  avatarPath?: string | null;
  updatedAt?: Date;
  lastSeenAt?: Date | null;
  lastActiveAt?: Date | null;
} | null;
type CustomerRow = { id: string; code: string; name: string } | null;
type ProjectRow = { id: string; code: string; name: string } | null;
type CategoryRow = { id: string; code: string; name: string } | null;

type TicketRow = {
  id: string;
  ticketNumber: string;
  customerId: string | null;
  customer: CustomerRow;
  projectId: string | null;
  project: ProjectRow;
  categoryId: string | null;
  category: CategoryRow;
  title: string;
  description: string;
  priority: string;
  status: string;
  source: string;
  assignedToId: string | null;
  assignedTo: UserRow;
  openedAt: Date;
  dueAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { comments: number };
};

type CommentRow = {
  id: string;
  ticketId: string;
  authorId: string | null;
  author: UserRow;
  body: string;
  isInternal: boolean;
  createdAt: Date;
};

type CategoryFullRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { tickets: number };
};

function serializeUser(user: UserRow) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hasAvatar: Boolean(user.avatarPath),
    avatarUpdatedAt: user.avatarPath && user.updatedAt ? user.updatedAt.toISOString() : null,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
  };
}

function isOverdue(ticket: TicketRow, now = new Date()): boolean {
  if (!ticket.dueAt) return false;
  const closed = ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status);
  if (closed) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return ticket.dueAt < today;
}

export function serializeTicket(ticket: TicketRow, now = new Date()): SupportTicket {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    customerId: ticket.customerId,
    customer: ticket.customer
      ? { id: ticket.customer.id, code: ticket.customer.code, name: ticket.customer.name }
      : null,
    projectId: ticket.projectId,
    project: ticket.project
      ? { id: ticket.project.id, code: ticket.project.code, name: ticket.project.name }
      : null,
    categoryId: ticket.categoryId,
    category: ticket.category
      ? { id: ticket.category.id, code: ticket.category.code, name: ticket.category.name }
      : null,
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority as TicketPriority,
    status: ticket.status as TicketStatus,
    source: ticket.source as TicketSource,
    assignedToId: ticket.assignedToId,
    assignedTo: serializeUser(ticket.assignedTo),
    openedAt: ticket.openedAt.toISOString(),
    dueAt: ticket.dueAt?.toISOString() ?? null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    isOverdue: isOverdue(ticket, now),
    commentCount: ticket._count?.comments,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export function serializeTicketDetail(
  ticket: TicketRow & { comments: CommentRow[] },
  now = new Date()
): SupportTicketDetail {
  return {
    ...serializeTicket(ticket, now),
    comments: ticket.comments.map(serializeComment),
  };
}

export function serializeComment(comment: CommentRow): SupportTicketComment {
  return {
    id: comment.id,
    ticketId: comment.ticketId,
    authorId: comment.authorId,
    author: serializeUser(comment.author),
    body: comment.body,
    isInternal: comment.isInternal,
    createdAt: comment.createdAt.toISOString(),
  };
}

export function serializeCategory(category: CategoryFullRow): SupportCategory {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    ticketCount: category._count?.tickets,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function computeAvgResolutionHours(
  tickets: Array<{ openedAt: Date; resolvedAt: Date | null; status: string }>
): number {
  const resolved = tickets.filter((t) => t.resolvedAt);
  if (resolved.length === 0) return 0;
  let totalHours = 0;
  for (const t of resolved) {
    const ms = t.resolvedAt!.getTime() - t.openedAt.getTime();
    totalHours += ms / (1000 * 60 * 60);
  }
  return Math.round((totalHours / resolved.length) * 10) / 10;
}
