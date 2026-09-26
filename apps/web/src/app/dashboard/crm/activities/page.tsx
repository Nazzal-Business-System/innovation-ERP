"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CrmNavLinks } from "@/components/crm/crm-gate";
import { CrmTableSkeleton } from "@/components/crm/crm-page-skeleton";
import { activityColumns, ACTIVITY_TYPE_LABELS } from "@/components/crm/crm-columns";
import { useCompleteActivity, useCrmActivities } from "@/lib/hooks/use-crm";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { CRM_PERMISSIONS, type CrmActivity } from "@ierp/shared";

const TYPE_OPTIONS = [{ value: "", label: "All types" }, ...Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => ({ value, label }))];
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];


export default function ActivitiesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(CRM_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const completeMutation = useCompleteActivity();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, type, status]);

  const { data, loading, error, refetch } = useCrmActivities({
    search: debouncedSearch || undefined,
    type: type || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(row: CrmActivity) {
    const href = `/dashboard/crm/activities/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  async function handleComplete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setCompletingId(id);
    try {
      await completeMutation.mutateAsync({ id });
    } finally {
      setCompletingId(null);
    }
  }

  const columns = [
    ...activityColumns,
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: { original: CrmActivity } }) =>
        canWrite && !row.original.isCompleted ? (
          <Button
            size="sm"
            variant="secondary"
            className="cursor-pointer"
            loading={completingId === row.original.id}
            onClick={(e) => void handleComplete(e, row.original.id)}
          >
            {t("crm.completeActivity")}
          </Button>
        ) : null,
    },
  ];

  if (loading && !data) return <CrmTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load activities" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("crm.activitiesTitle")}
          description={t("crm.activitiesDesc")}
          badge={data ? <Badge variant="secondary">{data.pagination.total} activities</Badge> : undefined}
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link href="/dashboard/crm/activities/new">
                <Plus className="h-4 w-4" aria-hidden />
                {t("crm.newActivity")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}><CrmNavLinks /></FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search activities…"
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectClassName} aria-label="Filter by type">
                {TYPE_OPTIONS.map((opt) => (<option key={opt.value || "all"} value={opt.value}>{opt.label}</option>))}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClassName} aria-label="Filter by status">
                {STATUS_OPTIONS.map((opt) => (<option key={opt.value || "all"} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08}>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>
    </ModuleLayout>
  );
}
