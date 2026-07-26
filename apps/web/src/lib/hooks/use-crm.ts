"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  CreateActivityInput,
  CreateLeadInput,
  CreateOpportunityInput,
  CrmActivity,
  CrmActivityDetail,
  CrmAssigneeOption,
  CrmLead,
  CrmLeadDetail,
  CrmOpportunity,
  CrmOpportunityDetail,
  CrmOverview,
  LeadStatus,
  OpportunityStage,
  PaginatedResponse,
  UpdateActivityInput,
  UpdateLeadInput,
  UpdateOpportunityInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { formatMoneyAmount } from "@/lib/form-utils";
import { assertMutationEntity } from "@/lib/query/assert-mutation-fields";
import { queryKeys } from "@/lib/query/client";
import {
  keepIfMatchesStageFilter,
  keepIfMatchesStatusFilter,
} from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";

export function useCrmOverview() {
  return useAsyncData(queryKeys.crm.overview, () => apiFetch<CrmOverview>("/crm/overview"), { staleTime: STALE.dashboard });
}

export function useCrmAssignees(params: { search?: string } = {}) {
  const { search } = params;
  return useAsyncData(
    queryKeys.crm.assignees(search),
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      const qs = query.toString();
      return apiFetch<{ data: CrmAssigneeOption[] }>(`/crm/assignees${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.reference, keepPrevious: true }
  );
}

export function useCrmLeads(params: { search?: string; status?: string; source?: string; page?: number }) {
  const { search, status, source, page } = params;
  return useAsyncData(["crm-2", search, status, source, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (source) query.set("source", source);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<CrmLead>>(`/crm/leads${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useCrmLead(id: string) {
  return useAsyncData(queryKeys.crm.lead(id), () => apiFetch<CrmLeadDetail>(`/crm/leads/${id}`), { staleTime: STALE.operational, keepPrevious: true });
}

export function useCrmOpportunities(params: {
  search?: string;
  stage?: string;
  page?: number;
  limit?: number;
  leadId?: string;
  customerId?: string;
  openOnly?: boolean;
  /** Distinct cache scope — e.g. "table" vs "pipeline". */
  scope?: string;
  enabled?: boolean;
}) {
  const { search, stage, page, limit, leadId, customerId, openOnly, scope = "table", enabled = true } =
    params;
  return useAsyncData(
    ["crm-4", scope, { search, stage, page, limit, leadId, customerId, openOnly }],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (stage) query.set("stage", stage);
      if (page) query.set("page", String(page));
      if (limit) query.set("limit", String(limit));
      if (leadId) query.set("leadId", leadId);
      if (customerId) query.set("customerId", customerId);
      if (openOnly) query.set("openOnly", "true");
      const qs = query.toString();
      return apiFetch<PaginatedResponse<CrmOpportunity>>(
        `/crm/opportunities${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true, enabled }
  );
}

export function useCrmOpportunity(id: string) {
  return useAsyncData(["crm-5", id], () => apiFetch<CrmOpportunityDetail>(`/crm/opportunities/${id}`), { staleTime: STALE.operational });
}

export function useCrmActivities(params: {
  search?: string;
  type?: string;
  status?: string;
  page?: number;
}) {
  const { search, type, status, page } = params;
  return useAsyncData(["crm-6", search, type, status, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (type) query.set("type", type);
    if (status) query.set("status", status);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<CrmActivity>>(
      `/crm/activities${qs ? `?${qs}` : ""}`
    );
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useCrmActivity(id: string) {
  return useAsyncData(queryKeys.crm.activity(id), () => apiFetch<CrmActivityDetail>(`/crm/activities/${id}`), { staleTime: STALE.operational });
}

export async function createLead(input: CreateLeadInput): Promise<CrmLeadDetail> {
  return apiFetch<CrmLeadDetail>("/crm/leads", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<CrmLeadDetail> {
  return apiFetch<CrmLeadDetail>(`/crm/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<CrmLeadDetail> {
  return apiFetch<CrmLeadDetail>(`/crm/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function createOpportunity(input: CreateOpportunityInput): Promise<CrmOpportunityDetail> {
  return apiFetch<CrmOpportunityDetail>("/crm/opportunities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateOpportunity(
  id: string,
  input: UpdateOpportunityInput
): Promise<CrmOpportunityDetail> {
  return apiFetch<CrmOpportunityDetail>(`/crm/opportunities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateOpportunityStage(
  id: string,
  stage: OpportunityStage
): Promise<CrmOpportunityDetail> {
  return apiFetch<CrmOpportunityDetail>(`/crm/opportunities/${id}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
}

export async function createActivity(input: CreateActivityInput): Promise<CrmActivityDetail> {
  return apiFetch<CrmActivityDetail>("/crm/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeActivity(id: string): Promise<CrmActivityDetail> {
  return apiFetch<CrmActivityDetail>(`/crm/activities/${id}/complete`, {
    method: "PATCH",
  });
}

export async function updateActivity(
  id: string,
  input: UpdateActivityInput
): Promise<CrmActivityDetail> {
  return apiFetch<CrmActivityDetail>(`/crm/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useCreateLead() {
  return useOptimisticCreateMutation<CrmLeadDetail, CreateLeadInput, CrmLeadDetail>({
    mutationFn: createLead,
    detailKey: (entity) => queryKeys.crm.lead(entity.id),
    listKeyPrefix: queryKeys.crm.leads,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}

export function useCreateOpportunity() {
  return useOptimisticCreateMutation<
    CrmOpportunityDetail,
    CreateOpportunityInput,
    CrmOpportunityDetail
  >({
    mutationFn: createOpportunity,
    detailKey: (entity) => queryKeys.crm.opportunity(entity.id),
    listKeyPrefix: queryKeys.crm.opportunities,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStageFilter(entity, queryKey),
  });
}

export function useCreateActivity() {
  return useOptimisticCreateMutation<CrmActivityDetail, CreateActivityInput, CrmActivityDetail>({
    mutationFn: createActivity,
    detailKey: (entity) => queryKeys.crm.activity(entity.id),
    listKeyPrefix: queryKeys.crm.activities,
    toEntity: (data) => data,
  });
}

export function useUpdateLeadStatus() {
  return useOptimisticEntityMutation<
    CrmLeadDetail,
    { id: string; status: LeadStatus },
    CrmLeadDetail
  >({
    mutationFn: ({ id, status }) => updateLeadStatus(id, status),
    detailKey: ({ id }) => queryKeys.crm.lead(id),
    listKeyPrefix: queryKeys.crm.leads,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, status }) => {
      assertMutationEntity(data, { id, status }, "updateLeadStatus");
    },
    optimisticUpdate: (current, { status }) => ({ ...current, status }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.crm.lead(id),
      queryKeys.crm.leads,
      queryKeys.crm.overview,
    ],
  });
}

export function useUpdateLead() {
  return useOptimisticEntityMutation<
    CrmLeadDetail,
    { id: string; input: UpdateLeadInput; assignee?: CrmAssigneeOption | null },
    CrmLeadDetail
  >({
    mutationFn: ({ id, input }) => updateLead(id, input),
    detailKey: ({ id }) => queryKeys.crm.lead(id),
    listKeyPrefix: queryKeys.crm.leads,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input, assignee }) => ({
      ...current,
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.estimatedValue !== undefined
        ? { estimatedValue: formatMoneyAmount(input.estimatedValue) }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(assignee !== undefined ? { assignedTo: assignee } : {}),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.crm.lead(id),
      queryKeys.crm.leads,
      queryKeys.crm.overview,
    ],
  });
}

export function useUpdateOpportunity() {
  return useOptimisticEntityMutation<
    CrmOpportunityDetail,
    { id: string; input: UpdateOpportunityInput; assignee?: CrmAssigneeOption | null },
    CrmOpportunityDetail
  >({
    mutationFn: ({ id, input }) => updateOpportunity(id, input),
    detailKey: ({ id }) => queryKeys.crm.opportunity(id),
    listKeyPrefix: queryKeys.crm.opportunities,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input, assignee }) => ({
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.stage !== undefined ? { stage: input.stage } : {}),
      ...(input.estimatedValue !== undefined
        ? { estimatedValue: formatMoneyAmount(input.estimatedValue) }
        : {}),
      ...(input.probability !== undefined ? { probability: input.probability } : {}),
      ...(input.expectedCloseDate !== undefined
        ? { expectedCloseDate: input.expectedCloseDate }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(assignee !== undefined ? { assignedTo: assignee } : {}),
    }),
    shouldKeepInList: keepIfMatchesStageFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.crm.opportunity(id),
      queryKeys.crm.opportunities,
      queryKeys.crm.overview,
    ],
  });
}

export function useUpdateOpportunityStage() {
  return useOptimisticEntityMutation<
    CrmOpportunityDetail,
    { id: string; stage: OpportunityStage },
    CrmOpportunityDetail
  >({
    mutationFn: ({ id, stage }) => updateOpportunityStage(id, stage),
    detailKey: ({ id }) => queryKeys.crm.opportunity(id),
    listKeyPrefix: queryKeys.crm.opportunities,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, stage }) => {
      assertMutationEntity(data, { id, stage }, "updateOpportunityStage");
    },
    optimisticUpdate: (current, { stage }) => ({ ...current, stage }),
    shouldKeepInList: keepIfMatchesStageFilter,
    reconcileKeys: ({ id }) => [queryKeys.crm.opportunity(id), queryKeys.crm.opportunities],
  });
}

export function useCompleteActivity() {
  return useOptimisticEntityMutation<CrmActivityDetail, { id: string }, CrmActivityDetail>({
    mutationFn: ({ id }) => completeActivity(id),
    detailKey: ({ id }) => queryKeys.crm.activity(id),
    listKeyPrefix: queryKeys.crm.activities,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      isCompleted: true,
      completedAt: current.completedAt ?? new Date().toISOString(),
    }),
    shouldKeepInList: (item, queryKey) => {
      // Key shape: ["crm-6", search, type, status, page]
      const filter = typeof queryKey[3] === "string" ? queryKey[3] : undefined;
      if (!filter) return true;
      if (filter === "open" || filter === "overdue") return !item.isCompleted;
      if (filter === "completed") return item.isCompleted;
      return true;
    },
    reconcileKeys: ({ id }) => [
      queryKeys.crm.activity(id),
      queryKeys.crm.activities,
      queryKeys.crm.overview,
    ],
  });
}

export function useUpdateActivity() {
  return useOptimisticEntityMutation<
    CrmActivityDetail,
    {
      id: string;
      input: UpdateActivityInput;
      assignee?: CrmAssigneeOption | null;
      leadId?: string | null;
      opportunityId?: string | null;
    },
    CrmActivityDetail
  >({
    mutationFn: ({ id, input }) => updateActivity(id, input),
    detailKey: ({ id }) => queryKeys.crm.activity(id),
    listKeyPrefix: queryKeys.crm.activities,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input, assignee }) => ({
      ...current,
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(assignee !== undefined ? { assignedTo: assignee } : {}),
    }),
    reconcileKeys: ({ id, leadId, opportunityId, input }) => {
      const keys: Array<readonly string[]> = [
        queryKeys.crm.activity(id),
        queryKeys.crm.activities,
        queryKeys.crm.overview,
      ];
      const linkedLead = input.leadId !== undefined ? input.leadId : leadId;
      const linkedOpp =
        input.opportunityId !== undefined ? input.opportunityId : opportunityId;
      if (linkedLead) keys.push(queryKeys.crm.lead(linkedLead));
      if (linkedOpp) keys.push(queryKeys.crm.opportunity(linkedOpp));
      return keys;
    },
  });
}
