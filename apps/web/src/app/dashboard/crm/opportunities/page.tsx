"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { opportunityColumns } from "@/components/crm/crm-columns";
import { useCrmOpportunities } from "@/lib/hooks/use-crm";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import type { CrmOpportunity, OpportunityStage } from "@ierp/shared";

const TABLE_PAGE_SIZE = 10;

const STAGE_OPTIONS = [
  { value: "", label: "All stages" },
  { value: "PROSPECTING", label: "Prospecting" },
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const PIPELINE_STAGES: OpportunityStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
];


export default function OpportunitiesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stage, setStage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, stage]);

  // Paginated table — never loads the full CRM opportunity set.
  const { data, loading, error, refetch, isFetching } = useCrmOpportunities({
    search: debouncedSearch || undefined,
    stage: stage || undefined,
    page,
    limit: TABLE_PAGE_SIZE,
    scope: "table",
  });

  // Separate pipeline board query — open stages only, distinct cache key.
  const { data: pipelineData } = useCrmOpportunities({
    openOnly: true,
    page: 1,
    limit: 100,
    scope: "pipeline",
  });

  const pipeline = useMemo(() => {
    const items = pipelineData?.data ?? [];
    return PIPELINE_STAGES.map((s) => ({
      stage: s,
      items: items.filter((o) => o.stage === s),
    }));
  }, [pipelineData?.data]);

  function handleRowClick(row: CrmOpportunity) {
    const href = `/dashboard/crm/opportunities/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <CrmTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load opportunities"
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(
    data?.pagination,
    onPageChange,
    loading || isFetching
  );

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("crm.opportunitiesTitle")}
          description={t("crm.opportunitiesDesc")}
          badge={
            data ? (
              <Badge variant="secondary">{data.pagination.total} opportunities</Badge>
            ) : undefined
          }
          actions={
            <Button asChild className="cursor-pointer gap-2">
              <Link href="/dashboard/crm/opportunities/new">
                <Plus className="h-4 w-4" aria-hidden />
                {t("crm.newOpportunity")}
              </Link>
            </Button>
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <CrmNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <h2 className="mb-3 text-sm font-semibold text-[var(--muted)]">
          {t("crm.pipelineBoard")}
        </h2>
        <div className="mb-8 grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
          {pipeline.map((col) => (
            <Card
              key={col.stage}
              className="min-w-[220px] border-[var(--border-subtle)] bg-[var(--card)]"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {col.stage.replace(/_/g, " ")} ({col.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {col.items.slice(0, 4).map((opp) => (
                  <Link
                    key={opp.id}
                    href={`/dashboard/crm/opportunities/${opp.id}`}
                    className="ierp-card-hover block cursor-pointer rounded-lg border border-[var(--border-subtle)] p-3"
                  >
                    <p className="text-sm font-medium">{opp.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {opp.customer?.name ?? opp.lead?.companyName
                        ? `${opp.customer?.name ?? opp.lead?.companyName} · `
                        : ""}
                      {opp.estimatedValue} · {opp.probability}%
                    </p>
                  </Link>
                ))}
                {col.items.length === 0 && (
                  <p className="text-xs text-[var(--muted)]">No deals</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search opportunities…"
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading || isFetching}
            />
          }
          actions={
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className={selectClassName}
              aria-label="Filter by stage"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          }
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <DataTable
          columns={opportunityColumns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>
    </ModuleLayout>
  );
}
