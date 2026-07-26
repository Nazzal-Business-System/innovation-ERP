"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { ProjectsNavLinks } from "@/components/projects/projects-gate";
import { milestoneColumns } from "@/components/projects/projects-columns";
import { ProjectsTableSkeleton } from "@/components/projects/projects-page-skeleton";
import { useProjectMilestones } from "@/lib/hooks/use-projects";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import type { ProjectMilestone } from "@ierp/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "MISSED", label: "Missed" },
];


export default function MilestonesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status]);

  const { data, loading, error, refetch } = useProjectMilestones({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(row: ProjectMilestone) {
    const href = `/dashboard/projects/${row.projectId}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <ProjectsTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("projects.milestonesLoadError")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("projects.milestonesTitle")}
          description={t("projects.milestonesDesc")}
          badge={
            data ? (
              <Badge variant="secondary">
                {data.pagination.total} {t("nav.milestones").toLowerCase()}
              </Badge>
            ) : undefined
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <ProjectsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("projects.searchMilestones")}
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
          actions={
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClassName}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08}>
        <DataTable
          columns={milestoneColumns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>
    </ModuleLayout>
  );
}
