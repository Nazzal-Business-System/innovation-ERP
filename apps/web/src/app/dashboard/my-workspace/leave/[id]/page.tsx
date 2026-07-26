"use client";

import Link from "next/link";
import { use, useState } from "react";
import { HR_SELF_PERMISSIONS } from "@ierp/shared";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { LeaveStatusBadge, LEAVE_TYPE_LABELS } from "@/components/hr/hr-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  useCancelSelfLeaveRequest,
  useSelfLeaveRequest,
} from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth-store";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[var(--border-subtle)] py-3 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="text-sm text-[var(--foreground)]">{value || "—"}</dd>
    </div>
  );
}

export default function MyLeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const permissions = useAuthStore((s) => s.permissions);
  const canWrite = permissions.includes(HR_SELF_PERMISSIONS.WRITE);
  const { data: leave, loading, error, refetch } = useSelfLeaveRequest(id);
  const cancelMutation = useCancelSelfLeaveRequest();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function handleCancel() {
    if (!leave || !canWrite || cancelMutation.isPending) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await cancelMutation.mutateAsync(leave.id);
      setActionSuccess(t("selfService.leaveCancelled", "Leave request cancelled"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    }
  }

  if (loading && !leave) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !leave) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("selfService.loadFailed", "Unable to load workspace")}
          description={error ?? undefined}
          onRetry={() => void refetch()}
        />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/my-workspace/leave">
              {t("selfService.backToLeave", "Back to leave")}
            </Link>
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  const decisionActor =
    leave.decidedBy?.name ?? leave.approvedBy?.fullName ?? null;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.leaveDetailTitle", "Leave request")}
          description={t(
            "selfService.leaveDetailDesc",
            "Request details and approval status."
          )}
          badge={<LeaveStatusBadge status={leave.status} />}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard/my-workspace/leave">
                  {t("selfService.backToLeave", "Back to leave")}
                </Link>
              </Button>
              {leave.status === "PENDING" && canWrite ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={cancelMutation.isPending}
                  onClick={() => void handleCancel()}
                >
                  {t("selfService.cancelLeave", "Cancel request")}
                </Button>
              ) : null}
            </div>
          }
        />
      </FadeIn>

      <ActionFeedback error={actionError} success={actionSuccess} />

      <FadeIn delay={0.04}>
        <section className="rounded-2xl border border-[var(--border-subtle)] p-5">
          <dl>
            <DetailRow
              label={t("hr.leaveType", "Type")}
              value={t(`hr.leaveType.${leave.type}`, LEAVE_TYPE_LABELS[leave.type] ?? leave.type)}
            />
            <DetailRow
              label={t("hr.startDate", "Start")}
              value={
                <span className="ew-ltr-isolate">
                  {formatDisplayDate(leave.startDate, locale)}
                </span>
              }
            />
            <DetailRow
              label={t("hr.endDate", "End")}
              value={
                <span className="ew-ltr-isolate">{formatDisplayDate(leave.endDate, locale)}</span>
              }
            />
            <DetailRow label={t("hr.days", "Days")} value={leave.days} />
            <DetailRow label={t("hr.status", "Status")} value={<LeaveStatusBadge status={leave.status} />} />
            <DetailRow label={t("hr.reason", "Reason")} value={leave.reason} />
            <DetailRow
              label={t("selfService.approvalInfo", "Approval")}
              value={
                <div className="space-y-1">
                  <p>
                    {t("hr.assignedApprover", "Assigned approver")}:{" "}
                    {leave.assignedApprover?.fullName ??
                      t("selfService.noApprover", "No approver assigned")}
                  </p>
                  {decisionActor ? (
                    <p>
                      {t("hr.decidedBy", "Decided by")}: {decisionActor}
                      {leave.decidedAt
                        ? ` · ${formatDisplayDateTime(leave.decidedAt, locale)}`
                        : null}
                    </p>
                  ) : null}
                </div>
              }
            />
            <DetailRow
              label={t("common.created", "Created")}
              value={
                <span className="ew-ltr-isolate">
                  {formatDisplayDateTime(leave.createdAt, locale)}
                </span>
              }
            />
          </dl>
        </section>
      </FadeIn>
    </ModuleLayout>
  );
}
