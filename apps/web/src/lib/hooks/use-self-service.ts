"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  HrAttendanceRecord,
  HrContract,
  HrDocument,
  HrEmployee,
  HrEmployeeProfilePayrollLine,
  HrLeaveRequest,
  LeaveType,
  UploadAvatarInput,
} from "@ierp/shared";
import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";

export type SelfServiceProfile = HrEmployee & { canViewSalary?: boolean };

export interface SelfOverview {
  profile: SelfServiceProfile;
  todayAttendance: HrAttendanceRecord | null;
  todayDate: string;
  pendingLeaveCount: number;
  latestPayroll: HrEmployeeProfilePayrollLine | null;
  activeContract: HrContract | null;
  expiringDocuments: HrDocument[];
  unreadNotifications: number;
  recentKnowledge: Array<{
    id: string;
    articleNumber: string;
    title: string;
    summary: string | null;
    publishedAt: string | null;
    category: { id: string; name: string } | null;
  }>;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

export interface SelfAttendanceResponse {
  data: HrAttendanceRecord[];
  summary: {
    present: number;
    remote: number;
    late: number;
    absent: number;
    halfDay: number;
    total: number;
  };
  today: HrAttendanceRecord | null;
  todayDate: string;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

export interface SelfContractResponse {
  data: HrContract | null;
  active: HrContract | null;
  history: HrContract[];
  hasAny: boolean;
}

export interface SelfDocumentRow extends HrDocument {
  canDownload: boolean;
  downloadPath: string;
}

export function useSelfOverview(enabled = true) {
  return useAsyncData(
    ["self-service", "overview"] as const,
    () => apiFetch<SelfOverview>("/self-service/me/overview"),
    { staleTime: STALE.dashboard, enabled }
  );
}

export function useSelfProfile(enabled = true) {
  return useAsyncData(
    ["self-service", "me"] as const,
    () => apiFetch<SelfServiceProfile>("/self-service/me"),
    { staleTime: STALE.reference, enabled }
  );
}

export function useUpdateSelfProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phone?: string | null }) =>
      apiFetch<SelfServiceProfile>("/self-service/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["self-service"] });
    },
  });
}

export function useUploadSelfAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UploadAvatarInput) =>
      apiFetch<SelfServiceProfile>("/self-service/me/avatar", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["self-service"] });
    },
  });
}

export function useRemoveSelfAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<SelfServiceProfile>("/self-service/me/avatar", { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["self-service"] });
    },
  });
}

export function useSelfAttendance(
  params: { from?: string; to?: string } = {},
  enabled = true
) {
  const { from, to } = params;
  return useAsyncData(
    ["self-service", "attendance", from, to] as const,
    () => {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const qs = q.toString();
      return apiFetch<SelfAttendanceResponse>(
        `/self-service/me/attendance${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, enabled }
  );
}

function invalidateAttendance(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["self-service", "attendance"] });
  void qc.invalidateQueries({ queryKey: ["self-service", "overview"] });
}

export function useSelfCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input?: { mode?: "PRESENT" | "REMOTE" | "HALF_DAY"; notes?: string }) =>
      apiFetch<{ data: HrAttendanceRecord; message: string }>(
        "/self-service/me/attendance/check-in",
        {
          method: "POST",
          body: JSON.stringify({
            mode: input?.mode ?? "PRESENT",
            ...(input?.notes ? { notes: input.notes } : {}),
          }),
        }
      ),
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useSelfCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ data: HrAttendanceRecord; message: string }>(
        "/self-service/me/attendance/check-out",
        { method: "POST", body: "{}" }
      ),
    onSuccess: () => invalidateAttendance(qc),
  });
}

export function useSelfLeaveRequests(enabled = true) {
  return useAsyncData(
    ["self-service", "leave"] as const,
    () => apiFetch<{ data: HrLeaveRequest[] }>("/self-service/me/leave-requests"),
    { staleTime: STALE.operational, enabled }
  );
}

export function useSelfLeaveRequest(id: string, enabled = true) {
  return useAsyncData(
    ["self-service", "leave", id] as const,
    () => apiFetch<HrLeaveRequest>(`/self-service/me/leave-requests/${id}`),
    { staleTime: STALE.operational, enabled: enabled && Boolean(id) }
  );
}

export function useCreateSelfLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      type: LeaveType;
      startDate: string;
      endDate: string;
      reason?: string;
      assignedApproverId?: string;
    }) =>
      apiFetch<HrLeaveRequest>("/self-service/me/leave-requests", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["self-service", "leave"] });
      void qc.invalidateQueries({ queryKey: ["self-service", "overview"] });
    },
  });
}

export function useCancelSelfLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<HrLeaveRequest>(`/self-service/me/leave-requests/${id}/cancel`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["self-service", "leave"] });
      void qc.invalidateQueries({ queryKey: ["self-service", "overview"] });
    },
  });
}

export function useSelfPayroll(enabled = true) {
  return useAsyncData(
    ["self-service", "payroll"] as const,
    () =>
      apiFetch<{ data: HrEmployeeProfilePayrollLine[]; latest: HrEmployeeProfilePayrollLine | null }>(
        "/self-service/me/payroll"
      ),
    { staleTime: STALE.operational, enabled }
  );
}

export function useSelfContract(enabled = true) {
  return useAsyncData(
    ["self-service", "contract"] as const,
    () => apiFetch<SelfContractResponse>("/self-service/me/contract"),
    { staleTime: STALE.reference, enabled }
  );
}

export function useSelfDocuments(enabled = true) {
  return useAsyncData(
    ["self-service", "documents"] as const,
    () => apiFetch<{ data: SelfDocumentRow[] }>("/self-service/me/documents"),
    { staleTime: STALE.operational, enabled }
  );
}

export async function downloadSelfDocument(downloadPath: string, fileName: string) {
  const path = downloadPath.replace(/^\/api/, "");
  const blob = await apiFetchBlob(path.startsWith("/") ? path : `/${path}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAuthorizedPath(downloadPath: string, fileName: string) {
  return downloadSelfDocument(downloadPath, fileName);
}

export function useSelfKnowledgeCategories(enabled = true) {
  return useAsyncData(
    ["self-service", "knowledge", "categories"] as const,
    () =>
      apiFetch<{ data: Array<{ id: string; code: string; name: string; description: string | null }> }>(
        "/self-service/knowledge/categories"
      ),
    { staleTime: STALE.reference, enabled }
  );
}

export function useSelfKnowledgeArticles(
  params: { search?: string; categoryId?: string } = {},
  enabled = true
) {
  const { search, categoryId } = params;
  return useAsyncData(
    ["self-service", "knowledge", "articles", search, categoryId] as const,
    () => {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (categoryId) q.set("categoryId", categoryId);
      const qs = q.toString();
      return apiFetch<{
        data: Array<{
          id: string;
          articleNumber: string;
          title: string;
          summary: string | null;
          publishedAt: string | null;
          visibility: string;
          category: { id: string; name: string } | null;
          tags: Array<{ id: string; name: string }>;
        }>;
      }>(`/self-service/knowledge/articles${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}

export function useSelfKnowledgeArticle(id: string, enabled = true) {
  return useAsyncData(
    ["self-service", "knowledge", "article", id] as const,
    () =>
      apiFetch<{
        id: string;
        articleNumber: string;
        title: string;
        summary: string | null;
        content: string;
        publishedAt: string | null;
        visibility: string;
        category: { id: string; name: string } | null;
        tags: Array<{ id: string; name: string }>;
        author: { id: string; name: string } | null;
      }>(`/self-service/knowledge/articles/${id}`),
    { staleTime: STALE.operational, enabled: enabled && Boolean(id) }
  );
}

export function useSelfCompanyDocuments(search = "", enabled = true) {
  return useAsyncData(
    ["self-service", "company-documents", search] as const,
    () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch<{
        data: Array<{
          id: string;
          fileNumber: string;
          title: string;
          description: string | null;
          mimeType: string;
          fileSize: number;
          expiryDate: string | null;
          uploadedAt: string;
          category: { id: string; code: string; name: string } | null;
          downloadPath: string;
        }>;
      }>(`/self-service/company-documents${qs}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}
