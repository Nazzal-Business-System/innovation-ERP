"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  HrAttendanceRecord,
  HrContract,
  HrContractDetail,
  HrDepartment,
  HrDocument,
  HrDocumentDetail,
  HrEmployee,
  HrEmployeeDetail,
  HrLeaveRequest,
  HrLeaveRequestDetail,
  HrOverview,
  HrPayrollRun,
  HrPayrollRunDetail,
  HrPosition,
  HrPositionDetail,
  PaginatedResponse,
  SetLifecycleInput,
  CreateContractInput,
  CreateDepartmentInput,
  CreateEmployeeInput,
  CreateHrDocumentInput,
  CreateLeaveRequestInput,
  CreatePositionInput,
  HrContractSort,
  HrDepartmentSort,
  HrDocumentExpiryState,
  HrDocumentSort,
  HrEmployeeSort,
  HrLeaveSort,
  HrPayrollSort,
  HrPositionSort,
  UpdateContractInput,
  UpdateEmployeeInput,
  UpdateHrDocumentInput,
  UpdateLeaveRequestInput,
  UpdatePayrollRunInput,
  UpdatePositionInput,
  PayPayrollRunInput,
} from "@ierp/shared";
import { parseMoneyAmount, toCanonicalMoneyString } from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { formatMoneyAmount } from "@/lib/form-utils";
import {
  isNewestFirstSort,
  matchesOptionalSearch,
  readQueryKeyPage,
  readQueryKeyString,
} from "@/lib/hr/list-query";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";

export function useHrOverview() {
  return useAsyncData(queryKeys.hr.overview, () => apiFetch<HrOverview>("/hr/overview"), {
    staleTime: STALE.dashboard,
  });
}

export function useHrEmployees(params: {
  search?: string;
  departmentId?: string;
  status?: string;
  location?: string;
  active?: boolean;
  sort?: HrEmployeeSort;
  page?: number;
  limit?: number;
}) {
  const { search, departmentId, status, location, active, sort = "NAME_ASC", page, limit } = params;
  return useAsyncData(
    [...queryKeys.hr.employees, search, departmentId, status, location, active, sort, page, limit] as const,
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (departmentId) query.set("departmentId", departmentId);
      if (status) query.set("status", status);
      if (location) query.set("location", location);
      if (active !== undefined) query.set("active", String(active));
      if (sort) query.set("sort", sort);
      if (page) query.set("page", String(page));
      if (limit) query.set("limit", String(limit));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<HrEmployee>>(`/hr/employees${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.reference, keepPrevious: true }
  );
}

export function useHrEmployee(id: string) {
  return useAsyncData(
    queryKeys.hr.employee(id),
    () => apiFetch<HrEmployeeDetail>(`/hr/employees/${id}`),
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  return apiFetch<HrEmployeeDetail>(`/hr/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function createEmployee(input: CreateEmployeeInput) {
  return apiFetch<HrEmployee>("/hr/employees", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function employeeMatchesListFilters(entity: HrEmployee, queryKey: readonly unknown[]): boolean {
  // ["hr-2", search, departmentId, status, location, active, sort, page, limit]
  const search = readQueryKeyString(queryKey, 1);
  const departmentId = readQueryKeyString(queryKey, 2);
  const status = readQueryKeyString(queryKey, 3);
  const location = readQueryKeyString(queryKey, 4);
  const active = typeof queryKey[5] === "boolean" ? queryKey[5] : undefined;
  const sort = queryKey[6];
  const page = readQueryKeyPage(queryKey, 7);
  if (page !== 1) return false;
  if (!isNewestFirstSort(sort)) return false;
  if (typeof active === "boolean" && entity.isActive !== active) return false;
  if (departmentId && entity.department.id !== departmentId) return false;
  if (status && entity.employmentStatus !== status) return false;
  if (location && entity.workLocation !== location) return false;
  return matchesOptionalSearch(
    [entity.employeeNumber, entity.fullName, entity.email, entity.department.name, entity.position.title].join(" "),
    search
  );
}

export function useCreateEmployee() {
  return useOptimisticCreateMutation<HrEmployee, CreateEmployeeInput, HrEmployee>({
    mutationFn: createEmployee,
    detailKey: (entity) => queryKeys.hr.employee(entity.id),
    listKeyPrefix: queryKeys.hr.employees,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => employeeMatchesListFilters(entity, queryKey),
    reconcileKeys: (entity) => [
      queryKeys.hr.employee(entity.id),
      queryKeys.hr.employees,
      queryKeys.hr.departments,
      queryKeys.hr.overview,
    ],
  });
}

export function useUpdateEmployee() {
  return useOptimisticEntityMutation<
    HrEmployeeDetail,
    { id: string; input: UpdateEmployeeInput },
    HrEmployeeDetail
  >({
    mutationFn: ({ id, input }) => updateEmployee(id, input),
    detailKey: ({ id }) => queryKeys.hr.employee(id),
    listKeyPrefix: queryKeys.hr.employees,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.firstName !== undefined || input.lastName !== undefined
        ? {
            fullName: `${input.firstName ?? current.firstName} ${input.lastName ?? current.lastName}`.trim(),
          }
        : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.employmentStatus !== undefined
        ? { employmentStatus: input.employmentStatus }
        : {}),
      ...(input.workLocation !== undefined ? { workLocation: input.workLocation } : {}),
      ...(input.hireDate !== undefined ? { hireDate: input.hireDate } : {}),
      ...(input.salary !== undefined
        ? { salary: input.salary === null ? null : formatMoneyAmount(input.salary) }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.managerId !== undefined
        ? {
            manager:
              input.managerId === null
                ? null
                : current.manager?.id === input.managerId
                  ? current.manager
                  : current.manager,
          }
        : {}),
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.hr.employee(id),
      queryKeys.hr.employees,
      queryKeys.hr.overview,
    ],
  });
}

export async function setEmployeeLifecycle(id: string, input: SetLifecycleInput) {
  return apiFetch<HrEmployeeDetail>(`/hr/employees/${id}/lifecycle`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useSetEmployeeLifecycle() {
  return useOptimisticEntityMutation<
    HrEmployeeDetail,
    { id: string; active: boolean },
    HrEmployeeDetail
  >({
    mutationFn: ({ id, active }) => setEmployeeLifecycle(id, { active }),
    detailKey: ({ id }) => queryKeys.hr.employee(id),
    listKeyPrefix: queryKeys.hr.employees,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { active }) => ({
      ...current,
      isActive: active,
      ...(active
        ? { reactivatedAt: new Date().toISOString() }
        : { deactivatedAt: new Date().toISOString() }),
    }),
    shouldKeepInList: (item, queryKey) => {
      const activeFilter = queryKey[5];
      return typeof activeFilter !== "boolean" || item.isActive === activeFilter;
    },
    reconcileKeys: ({ id }) => [
      queryKeys.hr.employee(id),
      queryKeys.hr.employees,
      queryKeys.hr.overview,
    ],
  });
}

export async function uploadEmployeeAvatar(
  id: string,
  input: { mimeType: "image/jpeg" | "image/png" | "image/webp"; data: string }
) {
  return apiFetch<HrEmployeeDetail>(`/hr/employees/${id}/avatar`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function removeEmployeeAvatar(id: string) {
  return apiFetch<HrEmployeeDetail>(`/hr/employees/${id}/avatar`, {
    method: "DELETE",
  });
}

export function useUploadEmployeeAvatar() {
  return useOptimisticEntityMutation<
    HrEmployeeDetail,
    { id: string; input: { mimeType: "image/jpeg" | "image/png" | "image/webp"; data: string } },
    HrEmployeeDetail
  >({
    mutationFn: ({ id, input }) => uploadEmployeeAvatar(id, input),
    detailKey: ({ id }) => queryKeys.hr.employee(id),
    listKeyPrefix: queryKeys.hr.employees,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      hasAvatar: true,
      avatarUpdatedAt: new Date().toISOString(),
    }),
    reconcileKeys: ({ id }) => [queryKeys.hr.employee(id), queryKeys.hr.employees],
  });
}

export function useRemoveEmployeeAvatar() {
  return useOptimisticEntityMutation<HrEmployeeDetail, { id: string }, HrEmployeeDetail>({
    mutationFn: ({ id }) => removeEmployeeAvatar(id),
    detailKey: ({ id }) => queryKeys.hr.employee(id),
    listKeyPrefix: queryKeys.hr.employees,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      hasAvatar: false,
      avatarUpdatedAt: null,
    }),
    reconcileKeys: ({ id }) => [queryKeys.hr.employee(id), queryKeys.hr.employees],
  });
}

export function useHrDepartments(params?: {
  search?: string;
  active?: boolean;
  sort?: HrDepartmentSort;
}) {
  const search = params?.search;
  const active = params?.active;
  const sort = params?.sort ?? "NEWEST";
  return useAsyncData(
    [...queryKeys.hr.departments, search, active, sort] as const,
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (active !== undefined) query.set("active", String(active));
      if (sort) query.set("sort", sort);
      const qs = query.toString();
      return apiFetch<{ data: HrDepartment[] }>(`/hr/departments${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.reference, keepPrevious: true }
  );
}

export async function createDepartment(input: CreateDepartmentInput) {
  return apiFetch<HrDepartment>("/hr/departments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function departmentMatchesListFilters(entity: HrDepartment, queryKey: readonly unknown[]): boolean {
  // ["hr-4", search, active, sort]
  const search = readQueryKeyString(queryKey, 1);
  const active = typeof queryKey[2] === "boolean" ? queryKey[2] : undefined;
  const sort = queryKey[3];
  if (!isNewestFirstSort(sort)) return false;
  if (typeof active === "boolean" && entity.isActive !== active) return false;
  return matchesOptionalSearch([entity.code, entity.name, entity.description ?? ""].join(" "), search);
}

export function useCreateDepartment() {
  return useOptimisticCreateMutation<HrDepartment, CreateDepartmentInput, HrDepartment>({
    mutationFn: createDepartment,
    detailKey: (entity) => [...queryKeys.hr.departments, entity.id] as const,
    listKeyPrefix: queryKeys.hr.departments,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => departmentMatchesListFilters(entity, queryKey),
    reconcileKeys: () => [queryKeys.hr.departments, queryKeys.hr.overview],
  });
}

export function useHrAttendance(params: {
  date?: string;
  departmentId?: string;
  status?: string;
  page?: number;
}) {
  const { date, departmentId, status, page } = params;
  return useAsyncData([...queryKeys.hr.attendance, date, departmentId, status, page], () => {
    const query = new URLSearchParams();
    if (date) query.set("date", date);
    if (departmentId) query.set("departmentId", departmentId);
    if (status) query.set("status", status);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<HrAttendanceRecord>>(`/hr/attendance${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.reference, keepPrevious: true });
}

export function useHrLeaveRequests(params: {
  search?: string;
  status?: string;
  type?: string;
  sort?: HrLeaveSort;
  page?: number;
}) {
  const { search, status, type, sort = "NEWEST", page } = params;
  return useAsyncData(
    [...queryKeys.hr.leaveRequests, search, status, type, sort, page] as const,
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (type) query.set("type", type);
      if (sort) query.set("sort", sort);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<HrLeaveRequest>>(`/hr/leave-requests${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useHrLeaveRequest(id: string) {
  return useAsyncData(
    queryKeys.hr.leaveRequest(id),
    () => apiFetch<HrLeaveRequestDetail>(`/hr/leave-requests/${id}`),
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export async function updateLeaveRequestStatus(id: string, status: "APPROVED" | "REJECTED") {
  return apiFetch<HrLeaveRequestDetail>(`/hr/leave-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateLeaveRequest(id: string, input: UpdateLeaveRequestInput) {
  return apiFetch<HrLeaveRequestDetail>(`/hr/leave-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updatePayrollRun(id: string, input: UpdatePayrollRunInput) {
  return apiFetch<HrPayrollRunDetail>(`/hr/payroll/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateContract(id: string, input: UpdateContractInput) {
  return apiFetch<HrContractDetail>(`/hr/contracts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateHrDocument(id: string, input: UpdateHrDocumentInput) {
  return apiFetch<HrDocumentDetail>(`/hr/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updatePosition(id: string, input: UpdatePositionInput) {
  return apiFetch<HrPositionDetail>(`/hr/positions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function createPosition(input: CreatePositionInput) {
  return apiFetch<HrPosition>("/hr/positions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useCreatePosition() {
  return useOptimisticCreateMutation<HrPosition, CreatePositionInput, HrPosition>({
    mutationFn: createPosition,
    detailKey: (entity) => queryKeys.hr.position(entity.id),
    listKeyPrefix: queryKeys.hr.positions,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => {
      // ["hr-14", search, departmentId, active, sort, page]
      const search = readQueryKeyString(queryKey, 1);
      const departmentId = readQueryKeyString(queryKey, 2);
      const active = typeof queryKey[3] === "boolean" ? queryKey[3] : undefined;
      const sort = queryKey[4];
      const page = readQueryKeyPage(queryKey, 5);
      if (page !== 1) return false;
      if (!isNewestFirstSort(sort)) return false;
      if (departmentId && entity.department.id !== departmentId) return false;
      if (typeof active === "boolean" && entity.isActive !== active) return false;
      return matchesOptionalSearch(
        [entity.title, entity.level, entity.department.name, entity.department.code].join(" "),
        search
      );
    },
    reconcileKeys: () => [queryKeys.hr.positions, queryKeys.hr.departments, queryKeys.hr.overview],
  });
}

export function useHrPayrollRuns(params: {
  search?: string;
  status?: string;
  sort?: HrPayrollSort;
  page?: number;
}) {
  const { search, status, sort = "NEWEST", page } = params;
  return useAsyncData([...queryKeys.hr.payrollRuns, search, status, sort, page] as const, () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (sort) query.set("sort", sort);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<HrPayrollRun>>(`/hr/payroll${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useHrPayrollRun(id: string) {
  const enabled = Boolean(id);
  return useAsyncData(
    queryKeys.hr.payrollRun(id),
    () =>
      enabled
        ? apiFetch<HrPayrollRunDetail>(`/hr/payroll/${id}`)
        : Promise.resolve(null as unknown as HrPayrollRunDetail),
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export async function createPayrollRun(input: {
  periodStart: string;
  periodEnd: string;
  notes?: string;
}) {
  return apiFetch<HrPayrollRunDetail>("/hr/payroll", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function processPayrollRun(id: string) {
  return apiFetch<HrPayrollRunDetail>(`/hr/payroll/${id}/process`, { method: "PATCH" });
}

export async function payPayrollRun(id: string, input: PayPayrollRunInput) {
  return apiFetch<HrPayrollRunDetail>(`/hr/payroll/${id}/pay`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function payPayrollLine(runId: string, lineId: string) {
  return apiFetch<HrPayrollRunDetail>(`/hr/payroll/${runId}/lines/${lineId}/pay`, {
    method: "POST",
  });
}

export async function fetchEligiblePayrollLineIds(
  runId: string,
  params?: { departmentId?: string; paymentStatus?: "UNPAID" | "PAID" | "all" }
) {
  const search = new URLSearchParams();
  if (params?.departmentId) search.set("departmentId", params.departmentId);
  if (params?.paymentStatus && params.paymentStatus !== "all") {
    search.set("paymentStatus", params.paymentStatus);
  }
  const qs = search.toString();
  return apiFetch<{ lineIds: string[] }>(
    `/hr/payroll/${runId}/eligible-line-ids${qs ? `?${qs}` : ""}`
  );
}

export async function createLeaveRequest(input: CreateLeaveRequestInput) {
  return apiFetch<HrLeaveRequest>("/hr/leave-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useCreateLeaveRequest() {
  return useOptimisticCreateMutation<HrLeaveRequest, CreateLeaveRequestInput, HrLeaveRequest>({
    mutationFn: createLeaveRequest,
    detailKey: (entity) => queryKeys.hr.leaveRequest(entity.id),
    listKeyPrefix: queryKeys.hr.leaveRequests,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => {
      // ["hr-6", search, status, type, sort, page]
      const search = readQueryKeyString(queryKey, 1);
      const status = readQueryKeyString(queryKey, 2);
      const type = readQueryKeyString(queryKey, 3);
      const sort = queryKey[4];
      const page = readQueryKeyPage(queryKey, 5);
      if (page !== 1) return false;
      if (!isNewestFirstSort(sort)) return false;
      if (status && entity.status !== status) return false;
      if (type && entity.type !== type) return false;
      return matchesOptionalSearch(
        [
          entity.employee.fullName,
          entity.employee.employeeNumber,
          entity.employee.department,
          entity.reason ?? "",
        ].join(" "),
        search
      );
    },
    reconcileKeys: (entity) => [
      queryKeys.hr.leaveRequest(entity.id),
      queryKeys.hr.leaveRequests,
      queryKeys.hr.overview,
      queryKeys.hr.employee(entity.employee.id),
    ],
  });
}

export async function createContract(input: CreateContractInput) {
  return apiFetch<HrContractDetail>("/hr/contracts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useCreateContract() {
  return useOptimisticCreateMutation<HrContractDetail, CreateContractInput, HrContractDetail>({
    mutationFn: createContract,
    detailKey: (entity) => queryKeys.hr.contract(entity.id),
    listKeyPrefix: queryKeys.hr.contracts,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => {
      // ["hr-10", search, status, contractType, sort, page]
      const search = readQueryKeyString(queryKey, 1);
      const status = readQueryKeyString(queryKey, 2);
      const contractType = readQueryKeyString(queryKey, 3);
      const sort = queryKey[4];
      const page = readQueryKeyPage(queryKey, 5);
      if (page !== 1) return false;
      if (!isNewestFirstSort(sort)) return false;
      if (status && entity.status !== status) return false;
      if (contractType && entity.contractType !== contractType) return false;
      return matchesOptionalSearch(
        [entity.contractNumber, entity.employee.fullName, entity.employee.employeeNumber].join(" "),
        search
      );
    },
    reconcileKeys: (entity) => [
      queryKeys.hr.contract(entity.id),
      queryKeys.hr.contracts,
      queryKeys.hr.overview,
      queryKeys.hr.employee(entity.employee.id),
    ],
  });
}

export async function createHrDocument(input: CreateHrDocumentInput) {
  return apiFetch<HrDocumentDetail>("/hr/documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useCreateHrDocument() {
  return useOptimisticCreateMutation<HrDocumentDetail, CreateHrDocumentInput, HrDocumentDetail>({
    mutationFn: createHrDocument,
    detailKey: (entity) => queryKeys.hr.document(entity.id),
    listKeyPrefix: queryKeys.hr.documents,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => {
      // ["hr-12", search, status, documentType, expiryState, sort, page]
      const search = readQueryKeyString(queryKey, 1);
      const status = readQueryKeyString(queryKey, 2);
      const documentType = readQueryKeyString(queryKey, 3);
      const expiryState = readQueryKeyString(queryKey, 4);
      const sort = queryKey[5];
      const page = readQueryKeyPage(queryKey, 6);
      if (page !== 1) return false;
      if (!isNewestFirstSort(sort)) return false;
      if (status && entity.status !== status) return false;
      if (documentType && !entity.documentType.toLowerCase().includes(documentType.toLowerCase())) {
        return false;
      }
      if (expiryState === "expired" && !entity.isExpired) return false;
      if (expiryState === "expiring_soon" && !entity.isExpiringSoon) return false;
      if (expiryState === "ok" && (entity.isExpired || entity.isExpiringSoon || entity.isMissing)) {
        return false;
      }
      return matchesOptionalSearch(
        [entity.title, entity.documentType, entity.employee.fullName, entity.employee.employeeNumber].join(
          " "
        ),
        search
      );
    },
    reconcileKeys: (entity) => [
      queryKeys.hr.document(entity.id),
      queryKeys.hr.documents,
      queryKeys.hr.overview,
      queryKeys.hr.employee(entity.employee.id),
    ],
  });
}

export function useUpdateLeaveRequestStatus() {
  return useOptimisticEntityMutation<
    HrLeaveRequestDetail,
    { id: string; status: "APPROVED" | "REJECTED"; employeeId?: string },
    HrLeaveRequestDetail
  >({
    mutationFn: ({ id, status }) => updateLeaveRequestStatus(id, status),
    detailKey: ({ id }) => queryKeys.hr.leaveRequest(id),
    listKeyPrefix: queryKeys.hr.leaveRequests,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { status }) => {
      const user = useAuthStore.getState().user;
      const actor = user ? { id: user.id, name: user.name } : current.decidedBy;
      return {
        ...current,
        status,
        decidedBy: actor,
        decidedAt: new Date().toISOString(),
        approvedBy: actor ? { id: actor.id, fullName: actor.name } : current.approvedBy,
      };
    },
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id, employeeId }) => [
      queryKeys.hr.leaveRequest(id),
      queryKeys.hr.leaveRequests,
      queryKeys.hr.overview,
      ...(employeeId
        ? [queryKeys.hr.employee(employeeId), queryKeys.hr.employees]
        : [queryKeys.hr.employees]),
    ],
  });
}

export function useUpdateLeaveRequest() {
  return useOptimisticEntityMutation<
    HrLeaveRequestDetail,
    {
      id: string;
      input: UpdateLeaveRequestInput;
      /** Optional display snapshot so assigned-approver changes paint immediately. */
      assignedApprover?: { id: string; fullName: string } | null;
    },
    HrLeaveRequestDetail
  >({
    mutationFn: ({ id, input }) => updateLeaveRequest(id, input),
    detailKey: ({ id }) => queryKeys.hr.leaveRequest(id),
    listKeyPrefix: queryKeys.hr.leaveRequests,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input, assignedApprover }) => ({
      ...current,
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.days !== undefined ? { days: String(input.days) } : {}),
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.assignedApproverId !== undefined
        ? {
            assignedApprover:
              assignedApprover !== undefined
                ? assignedApprover
                : input.assignedApproverId === null
                  ? null
                  : current.assignedApprover?.id === input.assignedApproverId
                    ? current.assignedApprover
                    : current.assignedApprover,
          }
        : {}),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.hr.leaveRequest(id),
      queryKeys.hr.leaveRequests,
      queryKeys.hr.overview,
    ],
  });
}

export function useUpdatePayrollRun() {
  return useOptimisticEntityMutation<
    HrPayrollRunDetail,
    { id: string; input: UpdatePayrollRunInput },
    HrPayrollRunDetail
  >({
    mutationFn: ({ id, input }) => updatePayrollRun(id, input),
    detailKey: ({ id }) => queryKeys.hr.payrollRun(id),
    listKeyPrefix: queryKeys.hr.payrollRuns,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.hr.payrollRun(id),
      queryKeys.hr.payrollRuns,
      queryKeys.hr.overview,
    ],
  });
}

export function useUpdateContract() {
  return useOptimisticEntityMutation<
    HrContractDetail,
    { id: string; input: UpdateContractInput },
    HrContractDetail
  >({
    mutationFn: ({ id, input }) => updateContract(id, input),
    detailKey: ({ id }) => queryKeys.hr.contract(id),
    listKeyPrefix: queryKeys.hr.contracts,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.contractType !== undefined ? { contractType: input.contractType } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.salary !== undefined ? { salary: formatMoneyAmount(input.salary) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.hr.contract(id),
      queryKeys.hr.contracts,
      queryKeys.hr.overview,
    ],
  });
}

export function useUpdateHrDocument() {
  return useOptimisticEntityMutation<
    HrDocumentDetail,
    { id: string; input: UpdateHrDocumentInput },
    HrDocumentDetail
  >({
    mutationFn: ({ id, input }) => updateHrDocument(id, input),
    detailKey: ({ id }) => queryKeys.hr.document(id),
    listKeyPrefix: queryKeys.hr.documents,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.documentType !== undefined ? { documentType: input.documentType } : {}),
      ...(input.fileUrl !== undefined ? { fileUrl: input.fileUrl } : {}),
      ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.hr.document(id),
      queryKeys.hr.documents,
      queryKeys.hr.overview,
    ],
  });
}

export function useUpdatePosition() {
  return useOptimisticEntityMutation<
    HrPositionDetail,
    { id: string; input: UpdatePositionInput },
    HrPositionDetail
  >({
    mutationFn: ({ id, input }) => updatePosition(id, input),
    detailKey: ({ id }) => queryKeys.hr.position(id),
    listKeyPrefix: queryKeys.hr.positions,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.level !== undefined ? { level: input.level } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.hr.position(id),
      queryKeys.hr.positions,
      queryKeys.hr.overview,
    ],
  });
}

export function useProcessPayrollRun() {
  return useOptimisticEntityMutation<HrPayrollRunDetail, { id: string }, HrPayrollRunDetail>({
    mutationFn: ({ id }) => processPayrollRun(id),
    detailKey: ({ id }) => queryKeys.hr.payrollRun(id),
    listKeyPrefix: queryKeys.hr.payrollRuns,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "PROCESSED",
      lines: current.lines.map((line) =>
        line.status === "DRAFT"
          ? { ...line, status: "PROCESSED", paymentStatus: "UNPAID" as const }
          : line
      ),
      paymentSummary: {
        ...current.paymentSummary,
        unpaidEmployees: current.lines.length,
        paidEmployees: 0,
        unpaidAmount: current.netTotal,
        paidAmount: "0.00",
        totalEmployees: current.lines.length,
        totalPayroll: current.netTotal,
        departmentsTotal: current.paymentSummary?.departmentsTotal ?? 0,
        departmentsCompleted: 0,
      },
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.hr.payrollRun(id),
      queryKeys.hr.payrollRuns,
      queryKeys.hr.overview,
    ],
  });
}

function applyOptimisticPayrollPayment(
  current: HrPayrollRunDetail,
  paidLineIds: Set<string>,
  actor: { id: string; name: string } | null
): HrPayrollRunDetail {
  const paidAt = new Date().toISOString();
  const lines = current.lines.map((line) => {
    if (!paidLineIds.has(line.id) || line.paymentStatus === "PAID") return line;
    return {
      ...line,
      status: "PAID" as const,
      paymentStatus: "PAID" as const,
      paidAt,
      paidBy: actor,
    };
  });

  let paidEmployees = 0;
  let unpaidEmployees = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;
  const deptStats = new Map<string, { total: number; paid: number }>();

  for (const line of lines) {
    const parsed = parseMoneyAmount(line.netPay);
    const net = parsed.ok ? parsed.value : 0;
    const bucket = deptStats.get(line.employee.departmentId) ?? { total: 0, paid: 0 };
    bucket.total += 1;
    if (line.paymentStatus === "PAID") {
      paidEmployees += 1;
      if (parsed.ok) paidAmount += net;
      bucket.paid += 1;
    } else {
      unpaidEmployees += 1;
      if (parsed.ok) unpaidAmount += net;
    }
    deptStats.set(line.employee.departmentId, bucket);
  }

  let departmentsCompleted = 0;
  for (const stats of deptStats.values()) {
    if (stats.total > 0 && stats.paid === stats.total) departmentsCompleted += 1;
  }

  const status =
    unpaidEmployees === 0 ? ("PAID" as const) : paidEmployees > 0 ? ("PARTIALLY_PAID" as const) : current.status;

  return {
    ...current,
    status,
    lines,
    paidEmployeeCount: paidEmployees,
    unpaidEmployeeCount: unpaidEmployees,
    paidAmount: toCanonicalMoneyString(paidAmount),
    unpaidAmount: toCanonicalMoneyString(unpaidAmount),
    paymentSummary: {
      totalEmployees: lines.length,
      paidEmployees,
      unpaidEmployees,
      totalPayroll: current.netTotal,
      paidAmount: toCanonicalMoneyString(paidAmount),
      unpaidAmount: toCanonicalMoneyString(unpaidAmount),
      departmentsTotal: deptStats.size,
      departmentsCompleted,
    },
  };
}

export function usePayPayrollRun() {
  return useOptimisticEntityMutation<
    HrPayrollRunDetail,
    { id: string; input: PayPayrollRunInput; lineIds?: string[] },
    HrPayrollRunDetail
  >({
    mutationFn: ({ id, input }) => payPayrollRun(id, input),
    detailKey: ({ id }) => queryKeys.hr.payrollRun(id),
    listKeyPrefix: queryKeys.hr.payrollRuns,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input, lineIds }) => {
      const actor = useAuthStore.getState().user;
      const actorRef = actor ? { id: actor.id, name: actor.name } : null;
      let ids = lineIds ?? [];
      if (ids.length === 0) {
        if (input.mode === "allRemaining") {
          ids = current.lines.filter((l) => l.paymentStatus === "UNPAID" && l.status === "PROCESSED").map((l) => l.id);
        } else if (input.mode === "department" && input.departmentId) {
          ids = current.lines
            .filter(
              (l) =>
                l.paymentStatus === "UNPAID" &&
                l.status === "PROCESSED" &&
                l.employee.departmentId === input.departmentId
            )
            .map((l) => l.id);
        } else if (input.mode === "employees" && input.employeeIds) {
          const empSet = new Set(input.employeeIds);
          ids = current.lines
            .filter(
              (l) =>
                empSet.has(l.employee.id) && l.paymentStatus === "UNPAID" && l.status === "PROCESSED"
            )
            .map((l) => l.id);
        } else if (input.mode === "lines" && input.lineIds) {
          ids = input.lineIds;
        }
      }
      return applyOptimisticPayrollPayment(current, new Set(ids), actorRef);
    },
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.hr.payrollRun(id),
      queryKeys.hr.payrollRuns,
      queryKeys.hr.overview,
      queryKeys.accounting.journalEntries,
    ],
  });
}

export function usePayPayrollLine() {
  return useOptimisticEntityMutation<
    HrPayrollRunDetail,
    { id: string; lineId: string },
    HrPayrollRunDetail
  >({
    mutationFn: ({ id, lineId }) => payPayrollLine(id, lineId),
    detailKey: ({ id }) => queryKeys.hr.payrollRun(id),
    listKeyPrefix: queryKeys.hr.payrollRuns,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { lineId }) => {
      const actor = useAuthStore.getState().user;
      return applyOptimisticPayrollPayment(
        current,
        new Set([lineId]),
        actor ? { id: actor.id, name: actor.name } : null
      );
    },
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.hr.payrollRun(id),
      queryKeys.hr.payrollRuns,
      queryKeys.hr.overview,
      queryKeys.accounting.journalEntries,
    ],
  });
}

export function useCreatePayrollRun() {
  return useOptimisticCreateMutation<
    HrPayrollRunDetail,
    { periodStart: string; periodEnd: string; notes?: string },
    HrPayrollRunDetail
  >({
    mutationFn: createPayrollRun,
    detailKey: (entity) => queryKeys.hr.payrollRun(entity.id),
    listKeyPrefix: queryKeys.hr.payrollRuns,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => {
      // ["hr-8", search, status, sort, page]
      const search = readQueryKeyString(queryKey, 1);
      const status = readQueryKeyString(queryKey, 2);
      const sort = queryKey[3];
      const page = readQueryKeyPage(queryKey, 4);
      if (page !== 1) return false;
      if (!isNewestFirstSort(sort)) return false;
      if (status && entity.status !== status) return false;
      return matchesOptionalSearch(entity.runNumber, search);
    },
    reconcileKeys: () => [queryKeys.hr.payrollRuns, queryKeys.hr.overview],
  });
}

export function useHrContracts(params: {
  search?: string;
  status?: string;
  contractType?: string;
  sort?: HrContractSort;
  page?: number;
}) {
  const { search, status, contractType, sort = "NEWEST", page } = params;
  return useAsyncData(
    [...queryKeys.hr.contracts, search, status, contractType, sort, page] as const,
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (contractType) query.set("contractType", contractType);
      if (sort) query.set("sort", sort);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<HrContract>>(`/hr/contracts${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useHrContract(id: string) {
  const enabled = Boolean(id);
  return useAsyncData(
    queryKeys.hr.contract(id),
    () =>
      enabled
        ? apiFetch<HrContractDetail>(`/hr/contracts/${id}`)
        : Promise.resolve(null as unknown as HrContractDetail),
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useHrDocuments(params: {
  search?: string;
  status?: string;
  documentType?: string;
  expiryState?: HrDocumentExpiryState;
  sort?: HrDocumentSort;
  page?: number;
}) {
  const { search, status, documentType, expiryState, sort = "NEWEST", page } = params;
  return useAsyncData(
    [...queryKeys.hr.documents, search, status, documentType, expiryState, sort, page] as const,
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (documentType) query.set("documentType", documentType);
      if (expiryState) query.set("expiryState", expiryState);
      if (sort) query.set("sort", sort);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<HrDocument>>(`/hr/documents${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useHrDocument(id: string) {
  const enabled = Boolean(id);
  return useAsyncData(
    queryKeys.hr.document(id),
    () =>
      enabled
        ? apiFetch<HrDocumentDetail>(`/hr/documents/${id}`)
        : Promise.resolve(null as unknown as HrDocumentDetail),
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useHrPositions(params: {
  search?: string;
  departmentId?: string;
  active?: boolean;
  sort?: HrPositionSort;
  page?: number;
}) {
  const { search, departmentId, active, sort = "NEWEST", page } = params;
  return useAsyncData(
    [...queryKeys.hr.positions, search, departmentId, active, sort, page] as const,
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (departmentId) query.set("departmentId", departmentId);
      if (active !== undefined) query.set("active", String(active));
      if (sort) query.set("sort", sort);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<HrPosition>>(`/hr/positions${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.reference, keepPrevious: true }
  );
}

export function useHrPosition(id: string) {
  const enabled = Boolean(id);
  return useAsyncData(
    queryKeys.hr.position(id),
    () =>
      enabled
        ? apiFetch<HrPositionDetail>(`/hr/positions/${id}`)
        : Promise.resolve(null as unknown as HrPositionDetail),
    { staleTime: STALE.reference, keepPrevious: true }
  );
}
