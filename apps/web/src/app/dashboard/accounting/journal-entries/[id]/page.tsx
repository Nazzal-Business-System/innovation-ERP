"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { ModuleLayout } from "@/components/layout/module-layout";
import { AccountingNavLinks } from "@/components/accounting/accounting-gate";
import { AccountingDetailSkeleton } from "@/components/accounting/accounting-page-skeleton";
import { BalancedIndicator } from "@/components/accounting/accounting-columns";
import {
  EntityActionBar,
  EntityAudit,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTimeline,
  EntityTitle,
  EntityWorkflow,
  FinancialWorkspace,
  TransactionalLineTable,
} from "@/components/entity-workspace";
import { journalEntryLineColumns } from "@/components/entity-workspace/transactional-line-columns";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { useJournalEntry, usePostJournalEntry } from "@/lib/hooks/use-accounting";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { ACCOUNTING_PERMISSIONS } from "@ierp/shared";

const JE_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "POSTED", label: "Posted" },
];

export default function JournalEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(ACCOUNTING_PERMISSIONS.WRITE);
  const canLinkAccounts = has(ACCOUNTING_PERMISSIONS.READ);
  const { data: entry, loading, error, refetch } = useJournalEntry(id);
  const postMutation = usePostJournalEntry();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const lineColumns = useMemo(
    () => journalEntryLineColumns(canLinkAccounts),
    [canLinkAccounts]
  );

  async function handlePost() {
    if (postMutation.isPending) return;
    setPending(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await postMutation.mutateAsync({ id });
      setActionSuccess(t("action.journalPosted", "Journal entry posted"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <AccountingDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !entry) {
    return (
      <ModuleLayout maxWidth="lg">
        <FinancialWorkspace
          entityType="journal_entry"
          entityId={id}
          error={error ?? t("finance.journalNotFound", "Journal entry not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canPost = canWrite && (entry.canPost ?? (entry.status === "DRAFT" && entry.isBalanced));
  const readOnly = entry.status !== "DRAFT";

  const headerActions: EntityAction[] = canPost
    ? [
        {
          id: "post-entry",
          label: t("action.postJournal", "Post draft"),
          icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
          kind: "primary",
          capability: "transition",
          pending,
          disabled: !entry.isBalanced,
          disabledReason: !entry.isBalanced
            ? t("finance.unbalancedEntry", "Debits must equal credits before posting")
            : undefined,
          confirm: "soft",
          confirmTitle: t("action.postJournal", "Post draft"),
          confirmDescription: t(
            "action.postJournalConfirm",
            "Posting makes this entry immutable and updates account balances."
          ),
          onSelect: () => void handlePost(),
        },
      ]
    : [];

  const relationItems = [
    ...entry.lines.map((line) => ({
      id: `account-${line.accountId}`,
      label: `${line.accountCode} · ${line.accountName}`,
      description: t("finance.account", "Account"),
      href: `/dashboard/accounting/chart-of-accounts/${line.accountId}`,
    })),
  ];

  // Dedupe account relations by accountId
  const uniqueRelations = Array.from(
    new Map(relationItems.map((item) => [item.id, item])).values()
  );

  const workflowCurrent =
    entry.status === "VOID" ? "DRAFT" : entry.status === "POSTED" ? "POSTED" : "DRAFT";

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/accounting/journal-entries">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("finance.backToJournal", "Back to journal entries")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <AccountingNavLinks />

      <FinancialWorkspace
        entityType="journal_entry"
        entityId={entry.id}
        readOnly={readOnly}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.journalEntries", "Journal entries"),
                href: "/dashboard/accounting/journal-entries",
              },
              { label: entry.entryNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{entry.entryNumber}</span>}
                  subtitle={entry.description}
                  trailing={
                    <div className="flex flex-wrap items-center gap-2">
                      <EntityStatus
                        label={statusLabel(entry.status)}
                        variant={transactionStatusVariant(entry.status)}
                      />
                      <BalancedIndicator isBalanced={entry.isBalanced} />
                    </div>
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["transition"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "debit", label: t("finance.totalDebit", "Total debit"), value: entry.totalDebit },
              { id: "credit", label: t("finance.totalCredit", "Total credit"), value: entry.totalCredit },
              {
                id: "difference",
                label: t("finance.difference", "Difference"),
                value: entry.isBalanced ? t("finance.balanced", "Balanced") : t("finance.unbalanced", "Unbalanced"),
              },
              {
                id: "lines",
                label: t("transaction.lineItems", "Line items"),
                value: String(entry.lines.length),
              },
              {
                id: "date",
                label: t("finance.entryDate", "Entry date"),
                value: formatDisplayDate(entry.entryDate, locale),
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="overview" title={t("entityWorkspace.summary")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "entry-date",
                    label: t("finance.entryDate", "Entry date"),
                    value: formatDisplayDate(entry.entryDate, locale),
                    mono: true,
                  },
                  {
                    id: "source-module",
                    label: t("finance.sourceModule", "Source module"),
                    value: entry.sourceModule ?? "—",
                  },
                  {
                    id: "source-ref",
                    label: t("finance.sourceReference", "Source reference"),
                    value: entry.sourceReference ?? "—",
                    mono: true,
                  },
                  {
                    id: "balance",
                    label: t("finance.balanceCheck", "Balance check"),
                    value: entry.isBalanced
                      ? t("finance.balanced", "Balanced")
                      : t("finance.unbalanced", "Unbalanced"),
                  },
                ]}
              />
            </EntitySection>

            <TransactionalLineTable
              title={t("finance.journalLines", "Journal lines")}
              description={t("finance.journalLinesDesc", "Debit and credit lines for this entry")}
              columns={lineColumns}
              data={entry.lines}
              totals={
                <div className="flex flex-wrap justify-end gap-4 tabular-nums">
                  <span>
                    {t("finance.totalDebit", "Total debit")}:{" "}
                    <strong className="ew-ltr-isolate">{entry.totalDebit}</strong>
                  </span>
                  <span>
                    {t("finance.totalCredit", "Total credit")}:{" "}
                    <strong className="ew-ltr-isolate">{entry.totalCredit}</strong>
                  </span>
                </div>
              }
            />

            <EntityTimeline
              events={[
                ...(entry.createdAt
                  ? [
                      {
                        id: "created",
                        title: t("finance.created", "Created"),
                        at: formatDisplayDateTime(entry.createdAt, locale),
                        actor: entry.createdBy?.name,
                      },
                    ]
                  : []),
                ...(entry.status === "POSTED"
                  ? [
                      {
                        id: "posted",
                        title: t("finance.posted", "Posted"),
                        at: entry.updatedAt
                          ? formatDisplayDateTime(entry.updatedAt, locale)
                          : formatDisplayDate(entry.entryDate, locale),
                      },
                    ]
                  : []),
              ]}
            />

            <EntityAudit
              meta={{
                id: entry.id,
                createdAt: entry.createdAt
                  ? formatDisplayDateTime(entry.createdAt, locale)
                  : formatDisplayDate(entry.entryDate, locale),
                updatedAt: entry.updatedAt
                  ? formatDisplayDateTime(entry.updatedAt, locale)
                  : undefined,
                createdBy: entry.createdBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(entry.status)}
              steps={
                entry.status === "VOID"
                  ? [{ id: "VOID", label: "Void", active: true }]
                  : buildLinearWorkflowSteps(JE_WORKFLOW, workflowCurrent)
              }
              defaultOpen
            />
            {entry.createdBy ? (
              <EntityOwner
                name={entry.createdBy.name}
                role={t("transaction.createdBy", "Created by")}
              />
            ) : null}
            <EntityRelations items={uniqueRelations} />
            {entry.sourceModule ? (
              <EntitySection id="origin" title={t("finance.origin", "Origin")}>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {entry.sourceModule}
                  {entry.sourceReference ? ` · ${entry.sourceReference}` : ""}
                </p>
              </EntitySection>
            ) : null}
          </>
        }
      />
    </ModuleLayout>
  );
}
