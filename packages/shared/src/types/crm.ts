import type { PaginatedResponse } from "./inventory";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "CONVERTED";

export type LeadSource =
  | "WEBSITE"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "FIELD_SALES"
  | "EVENT"
  | "OTHER";

export type OpportunityStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type CrmActivityType = "CALL" | "EMAIL" | "MEETING" | "TASK" | "FOLLOW_UP";

export type OpportunityEventType =
  | "CREATED"
  | "STAGE_CHANGED"
  | "OWNER_CHANGED"
  | "VALUE_UPDATED"
  | "PROBABILITY_UPDATED"
  | "CLOSE_DATE_UPDATED"
  | "TITLE_UPDATED"
  | "NOTES_UPDATED"
  | "ACTIVITY_LINKED";

export interface CrmUserRef {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  initials?: string;
  hasAvatar?: boolean;
  avatarUpdatedAt?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
}

export interface CrmAssigneeOption extends CrmUserRef {
  isActive: boolean;
  hasAvatar?: boolean;
  avatarUpdatedAt?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
}

export interface CrmCustomerRef {
  id: string;
  code: string;
  name: string;
}

export interface CrmLeadRef {
  id: string;
  leadNumber: string;
  companyName: string;
}

export interface CrmOpportunityRef {
  id: string;
  opportunityNumber: string;
  title: string;
  stage?: OpportunityStage;
  estimatedValue?: string;
}

export interface CrmOpportunityEvent {
  id: string;
  type: OpportunityEventType;
  summary: string;
  details: string | null;
  actor: CrmUserRef | null;
  createdAt: string;
}

export interface CrmLead {
  id: string;
  leadNumber: string;
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  city: string;
  source: LeadSource;
  status: LeadStatus;
  estimatedValue: string;
  notes: string | null;
  assignedTo: CrmUserRef | null;
  convertedCustomer: CrmCustomerRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmLeadDetail extends CrmLead {
  activities: CrmActivity[];
  opportunities: CrmOpportunityRef[];
  canChangeStatus: boolean;
}

export interface CrmOpportunity {
  id: string;
  opportunityNumber: string;
  title: string;
  stage: OpportunityStage;
  estimatedValue: string;
  weightedValue: string;
  probability: number;
  expectedCloseDate: string | null;
  notes: string | null;
  lead: CrmLeadRef | null;
  customer: CrmCustomerRef | null;
  assignedTo: CrmUserRef | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CrmOpportunityDetail extends CrmOpportunity {
  activities: CrmActivity[];
  timeline: CrmOpportunityEvent[];
  canChangeStage: boolean;
  canEdit: boolean;
}

export interface CrmActivity {
  id: string;
  type: CrmActivityType;
  subject: string;
  dueDate: string | null;
  completedAt: string | null;
  isCompleted: boolean;
  isOverdue: boolean;
  notes: string | null;
  lead: CrmLeadRef | null;
  opportunity: CrmOpportunityRef | null;
  customer: CrmCustomerRef | null;
  assignedTo: CrmUserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmActivityDetail extends CrmActivity {
  canComplete: boolean;
}

export interface CrmOverview {
  totalLeads: number;
  qualifiedLeads: number;
  openOpportunities: number;
  pipelineValue: string;
  weightedPipelineValue: string;
  wonDealsThisMonth: number;
  overdueActivities: number;
  leadsBySource: Array<{ source: LeadSource; count: number }>;
  opportunitiesByStage: Array<{ stage: OpportunityStage; count: number; totalValue: string }>;
  upcomingActivities: CrmActivity[];
  topOpportunities: CrmOpportunity[];
}

export interface CreateLeadInput {
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  city: string;
  source: LeadSource;
  estimatedValue: number;
  assignedToId?: string;
  notes?: string;
}

export interface UpdateLeadInput {
  companyName?: string;
  contactName?: string;
  email?: string | null;
  phone?: string | null;
  city?: string;
  source?: LeadSource;
  estimatedValue?: number;
  assignedToId?: string | null;
  notes?: string | null;
}

export interface CreateOpportunityInput {
  title: string;
  leadId?: string;
  customerId?: string;
  /** When true, allow creating another open opportunity for the same lead. */
  confirmDuplicate?: boolean;
  stage?: OpportunityStage;
  estimatedValue: number;
  probability?: number;
  expectedCloseDate?: string;
  assignedToId: string;
  notes?: string;
}

export interface UpdateOpportunityInput {
  title?: string;
  assignedToId?: string;
  stage?: OpportunityStage;
  estimatedValue?: number;
  probability?: number;
  expectedCloseDate?: string | null;
  notes?: string | null;
}

export interface OpenOpportunityConflict {
  id: string;
  opportunityNumber: string;
  title: string;
  stage: OpportunityStage;
}

export interface CreateActivityInput {
  type: CrmActivityType;
  subject: string;
  leadId?: string;
  opportunityId?: string;
  customerId?: string;
  dueDate?: string;
  assignedToId?: string;
  notes?: string;
}

export interface UpdateActivityInput {
  type?: CrmActivityType;
  subject?: string;
  leadId?: string | null;
  opportunityId?: string | null;
  customerId?: string | null;
  dueDate?: string | null;
  assignedToId?: string | null;
  notes?: string | null;
}

export type CrmLeadsListResponse = PaginatedResponse<CrmLead>;
export type CrmOpportunitiesListResponse = PaginatedResponse<CrmOpportunity>;
export type CrmActivitiesListResponse = PaginatedResponse<CrmActivity>;

export const CRM_PERMISSIONS = {
  READ: "crm.read",
  WRITE: "crm.write",
} as const;
