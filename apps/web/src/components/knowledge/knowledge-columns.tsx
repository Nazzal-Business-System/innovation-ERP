import type { KnowledgeArticle, KnowledgeArticleStatus, KnowledgeVisibility } from "@ierp/shared";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDateTime } from "@/lib/date";
import type { Locale } from "@/lib/i18n/types";

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeArticleStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "In Review",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const KNOWLEDGE_VISIBILITY_LABELS: Record<KnowledgeVisibility, string> = {
  INTERNAL: "Internal",
  PUBLIC: "Public",
  SUPPORT_ONLY: "Support Only",
};

export function knowledgeStatusVariant(
  status: KnowledgeArticleStatus
): "active" | "pending" | "draft" | "inactive" {
  if (status === "PUBLISHED") return "active";
  if (status === "REVIEW") return "pending";
  if (status === "ARCHIVED") return "inactive";
  return "draft";
}

export function articleColumns(
  t: (key: string) => string,
  locale: Locale = "en"
): ColumnDef<KnowledgeArticle>[] {
  return [
    {
      accessorKey: "articleNumber",
      header: t("knowledge.articleNumber"),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.articleNumber}</span>
      ),
    },
    {
      accessorKey: "title",
      header: t("knowledge.articleTitle"),
      cell: ({ row }) => (
        <div className="min-w-0 max-w-[18rem] sm:max-w-[22rem]">
          <p className="truncate font-medium" title={row.original.title}>
            {row.original.title}
          </p>
          {row.original.summary && (
            <p className="truncate text-xs text-[var(--muted)]" title={row.original.summary}>
              {row.original.summary}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: t("knowledge.category"),
      cell: ({ row }) => row.original.category?.name ?? "—",
    },
    {
      accessorKey: "status",
      header: t("knowledge.status"),
      cell: ({ row }) => (
        <StatusBadge
          status={knowledgeStatusVariant(row.original.status)}
          label={KNOWLEDGE_STATUS_LABELS[row.original.status]}
        />
      ),
    },
    {
      accessorKey: "visibility",
      header: t("knowledge.visibility"),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {KNOWLEDGE_VISIBILITY_LABELS[row.original.visibility]}
        </Badge>
      ),
    },
    {
      id: "author",
      header: t("knowledge.author"),
      cell: ({ row }) => row.original.author?.name ?? "—",
    },
    {
      accessorKey: "updatedAt",
      header: t("knowledge.updatedAt"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums text-xs text-[var(--muted)]">
          {formatDisplayDateTime(row.original.updatedAt, locale)}
        </span>
      ),
    },
    {
      id: "tags",
      header: t("knowledge.tags"),
      cell: ({ row }) => (
        <div className="flex max-w-[9rem] flex-wrap gap-1 overflow-hidden">
          {row.original.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="max-w-full truncate text-[10px]">
              {tag}
            </Badge>
          ))}
          {row.original.tags.length > 2 && (
            <span className="text-[10px] text-[var(--muted)]">+{row.original.tags.length - 2}</span>
          )}
        </div>
      ),
    },
  ];
}
