import type { PaginatedResponse } from "./inventory";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED";
/** Ticket intake channel. `PORTAL` is deprecated (external portals removed) but kept for historical rows. */
export type TicketSource = "EMAIL" | "PHONE" | "PORTAL" | "INTERNAL" | "WHATSAPP" | "OTHER";

export interface SupportUserRef {
  id: string;
  name: string;
  email: string;
  hasAvatar?: boolean;
  avatarUpdatedAt?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
}

export interface SupportCustomerRef {
  id: string;
  code: string;
  name: string;
}

export interface SupportProjectRef {
  id: string;
  code: string;
  name: string;
}

export interface SupportCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  ticketCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string | null;
  customer: SupportCustomerRef | null;
  projectId: string | null;
  project: SupportProjectRef | null;
  categoryId: string | null;
  category: { id: string; code: string; name: string } | null;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  assignedToId: string | null;
  assignedTo: SupportUserRef | null;
  openedAt: string;
  dueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  isOverdue: boolean;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetail extends SupportTicket {
  comments: SupportTicketComment[];
}

export interface SupportTicketComment {
  id: string;
  ticketId: string;
  authorId: string | null;
  author: SupportUserRef | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SupportOverview {
  totalTickets: number;
  openTickets: number;
  overdueTickets: number;
  criticalTickets: number;
  avgResolutionHours: number;
  ticketsByStatus: Array<{ status: TicketStatus; count: number }>;
  ticketsByPriority: Array<{ priority: TicketPriority; count: number }>;
  ticketsByCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
  recentTickets: SupportTicket[];
  overdueList: SupportTicket[];
}

export interface CreateSupportTicketInput {
  customerId?: string | null;
  projectId?: string | null;
  categoryId?: string | null;
  title: string;
  description: string;
  priority?: TicketPriority;
  source?: TicketSource;
  assignedToId?: string | null;
  dueAt?: string | null;
}

export interface UpdateSupportTicketInput {
  title?: string;
  description?: string;
  categoryId?: string | null;
  priority?: TicketPriority;
  dueAt?: string | null;
  customerId?: string | null;
  projectId?: string | null;
}

export interface UpdateTicketStatusInput {
  status: TicketStatus;
}

export interface AssignTicketInput {
  assignedToId: string | null;
}

export interface CreateSupportCategoryInput {
  code?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateSupportCategoryInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateTicketCommentInput {
  body: string;
  isInternal?: boolean;
}

export type SupportTicketsListResponse = PaginatedResponse<SupportTicket>;
export type SupportCategoriesListResponse = PaginatedResponse<SupportCategory>;

export const SUPPORT_PERMISSIONS = {
  READ: "support.read",
  WRITE: "support.write",
} as const;

export interface SupportSummaryReport {
  totalTickets: number;
  openTickets: number;
  overdueTickets: number;
  criticalTickets: number;
  avgResolutionHours: number;
  slaCompliancePercent: number;
  ticketsByStatus: Array<{ status: string; count: number }>;
  ticketsByPriority: Array<{ priority: string; count: number }>;
  topCategories: Array<{ id: string; code: string; name: string; count: number }>;
  overdueList: Array<{ id: string; ticketNumber: string; title: string; dueAt: string | null; priority: string }>;
  generatedAt: string;
}
