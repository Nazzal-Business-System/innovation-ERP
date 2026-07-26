"use client";

import type { QueryClient } from "@tanstack/react-query";
import type {
  ExecutiveDashboardResponse,
  FinanceOverview,
  HrOverview,
  InventoryOverview,
  InventoryProduct,
  KnowledgeOverview,
  PaginatedKnowledgeArticles,
  PaginatedResponse,
  ProcurementOverview,
  SalesCustomer,
  SalesOverview,
  HrPayrollRun,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { queryKeys, STALE } from "@/lib/query/client";

type PrefetchRouter = { prefetch: (href: string) => void };

/** Default products list key — must match InventoryProductsPage initial filters. */
export const DEFAULT_PRODUCTS_QUERY = {
  search: undefined,
  category: undefined,
  status: undefined,
  archived: false as boolean | undefined,
  page: 1,
};

/** Default customers list key — must match CustomersPage initial filters. */
export const DEFAULT_CUSTOMERS_QUERY = {
  search: undefined as string | undefined,
  customerType: undefined as string | undefined,
  active: true as boolean | undefined,
  sort: "NEWEST" as const,
  pageSize: 10,
  page: 1,
};

type PrefetchJob = {
  id: string;
  route?: string;
  run: () => Promise<unknown>;
};

const inflight = new Set<string>();
const completed = new Set<string>();

function connectionAllowsPrefetch(): boolean {
  if (typeof navigator === "undefined") return true;
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") return false;
  return true;
}

async function runPool(jobs: PrefetchJob[], concurrency: number): Promise<void> {
  const queue = [...jobs];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) return;
      if (completed.has(job.id) || inflight.has(job.id)) continue;
      inflight.add(job.id);
      try {
        await job.run();
        completed.add(job.id);
      } catch {
        // Prefetch is best-effort; ignore failures.
      } finally {
        inflight.delete(job.id);
      }
    }
  });
  await Promise.all(workers);
}

function productsQueryKey() {
  return queryKeys.inventory.products(DEFAULT_PRODUCTS_QUERY);
}

function customersQueryKey() {
  const { search, customerType, active, sort, pageSize, page } = DEFAULT_CUSTOMERS_QUERY;
  return ["sales-2", search, customerType, active, sort, pageSize, page] as const;
}

function payrollListQueryKey() {
  return [...queryKeys.hr.payrollRuns, undefined, undefined, "NEWEST", 1] as const;
}

function articlesListQueryKey() {
  return ["knowledge-2", undefined, undefined, undefined, undefined, 1] as const;
}

function buildJobsForHref(href: string, queryClient: QueryClient): PrefetchJob[] {
  const jobs: PrefetchJob[] = [];

  const add = (id: string, run: () => Promise<unknown>) => {
    jobs.push({ id: `${href}:${id}`, route: href, run });
  };

  if (href === "/dashboard" || href.startsWith("/dashboard?")) {
    add("executive", () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.executiveDashboard,
        queryFn: () => apiFetch<ExecutiveDashboardResponse>("/dashboard/executive"),
        staleTime: STALE.dashboard,
      })
    );
  }

  if (href === "/dashboard/inventory" || href.startsWith("/dashboard/inventory?")) {
    add("inv-overview", () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.inventory.overview,
        queryFn: () => apiFetch<InventoryOverview>("/inventory/overview"),
        staleTime: STALE.dashboard,
      })
    );
  }

  if (href.startsWith("/dashboard/inventory/products")) {
    add("products", () =>
      queryClient.prefetchQuery({
        queryKey: productsQueryKey(),
        queryFn: () =>
          apiFetch<PaginatedResponse<InventoryProduct>>("/inventory/products?archived=false&page=1"),
        staleTime: STALE.operational,
      })
    );
  }

  if (href === "/dashboard/sales" || href.startsWith("/dashboard/sales?")) {
    add("sales-overview", () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.sales.overview,
        queryFn: () => apiFetch<SalesOverview>("/sales/overview"),
        staleTime: STALE.dashboard,
      })
    );
  }

  if (href.startsWith("/dashboard/sales/customers")) {
    add("customers", () => {
      const q = new URLSearchParams();
      q.set("active", "true");
      q.set("sort", "NEWEST");
      q.set("limit", "10");
      q.set("page", "1");
      return queryClient.prefetchQuery({
        queryKey: customersQueryKey(),
        queryFn: () =>
          apiFetch<PaginatedResponse<SalesCustomer>>(`/sales/customers?${q.toString()}`),
        staleTime: STALE.operational,
      });
    });
  }

  if (href === "/dashboard/procurement" || href.startsWith("/dashboard/procurement?")) {
    add("proc-overview", () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.procurement.overview,
        queryFn: () => apiFetch<ProcurementOverview>("/procurement/overview"),
        staleTime: STALE.dashboard,
      })
    );
  }

  if (href === "/dashboard/finance" || href.startsWith("/dashboard/finance?")) {
    add("finance-overview", () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.finance.overview,
        queryFn: () => apiFetch<FinanceOverview>("/finance/overview"),
        staleTime: STALE.dashboard,
      })
    );
  }

  if (href === "/dashboard/hr" || href.startsWith("/dashboard/hr?")) {
    add("hr-overview", () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.hr.overview,
        queryFn: () => apiFetch<HrOverview>("/hr/overview"),
        staleTime: STALE.dashboard,
      })
    );
  }

  if (href.startsWith("/dashboard/hr/payroll")) {
    add("payroll-list", () =>
      queryClient.prefetchQuery({
        queryKey: payrollListQueryKey(),
        queryFn: () => apiFetch<PaginatedResponse<HrPayrollRun>>("/hr/payroll?sort=NEWEST&page=1"),
        staleTime: STALE.operational,
      })
    );
  }

  if (href === "/dashboard/knowledge" || href.startsWith("/dashboard/knowledge?")) {
    add("knowledge-overview", () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.knowledge.overview,
        queryFn: () => apiFetch<KnowledgeOverview>("/knowledge/overview"),
        staleTime: STALE.dashboard,
      })
    );
  }

  if (href.startsWith("/dashboard/knowledge/articles")) {
    add("articles", () =>
      queryClient.prefetchQuery({
        queryKey: articlesListQueryKey(),
        queryFn: () => apiFetch<PaginatedKnowledgeArticles>("/knowledge/articles?page=1"),
        staleTime: STALE.reference,
      })
    );
  }

  return jobs;
}

/** Prefetch Next.js RSC/JS for a route and matching TanStack Query data. */
export async function prefetchRouteDestination(
  href: string,
  opts: {
    router: PrefetchRouter;
    queryClient: QueryClient;
    concurrency?: number;
    includeData?: boolean;
  }
): Promise<void> {
  if (!connectionAllowsPrefetch()) return;
  const path = href.split("?")[0] || href;
  try {
    opts.router.prefetch(path);
  } catch {
    // ignore
  }
  if (opts.includeData === false) return;
  const jobs = buildJobsForHref(path, opts.queryClient);
  if (jobs.length === 0) return;
  await runPool(jobs, opts.concurrency ?? 2);
}

/**
 * Idle startup prefetch after shell ready.
 * Route JS: dashboard + pinned destinations only (no speculative module storm).
 * Data: executive dashboard + at most a few pinned destinations (cap 4).
 */
export async function prefetchShellWarmup(
  router: PrefetchRouter,
  queryClient: QueryClient,
  pinnedHrefs: string[]
): Promise<void> {
  if (!connectionAllowsPrefetch()) return;

  const pinned = pinnedHrefs.filter(Boolean).slice(0, 6);
  const ordered = [...new Set(["/dashboard", ...pinned])];
  const routeJobs: PrefetchJob[] = ordered.map((href) => ({
    id: `route:${href}`,
    route: href,
    run: async () => {
      try {
        router.prefetch(href);
      } catch {
        // ignore
      }
    },
  }));

  await runPool(routeJobs, 3);

  const dataJobs = ordered.flatMap((href) => buildJobsForHref(href, queryClient));
  await runPool(dataJobs.slice(0, 4), 2);
}
