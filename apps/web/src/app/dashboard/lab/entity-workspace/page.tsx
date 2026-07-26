"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  FileDown,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CrmWorkspace,
  EntityActionBar,
  EntityAttachments,
  EntityAudit,
  EntityDangerZone,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntityNotes,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTableSection,
  EntityTimeline,
  EntityTitle,
  EntityWorkflow,
} from "@/components/entity-workspace";
import { useAppearanceStore } from "@/lib/appearance/store";
import {
  DETAILS_PAGE_LAYOUTS,
  type DetailsPageLayout,
  type EntityAction,
} from "@/lib/entity-workspace";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LabView = "demo" | "loading" | "error" | "empty";

const LONG_TITLE =
  "Sample Opportunity — Enterprise ERP Rollout for Northern Region Partners with Extended Support Package";

export default function EntityWorkspaceLabPage() {
  const { t, locale, setLocale } = useI18n();
  const detailsPageLayout = useAppearanceStore((s) => s.detailsPageLayout);
  const setDetailsPageLayout = useAppearanceStore((s) => s.setDetailsPageLayout);
  const [view, setView] = useState<LabView>("demo");
  const [restrictPermissions, setRestrictPermissions] = useState(false);
  const [lastAction, setLastAction] = useState<string>("—");

  const capabilities = useMemo(() => {
    if (restrictPermissions) return new Set(["read", "print", "export"]);
    return new Set([
      "read",
      "edit",
      "archive",
      "restore",
      "delete",
      "print",
      "export",
      "approve",
      "reverse",
      "assign",
    ]);
  }, [restrictPermissions]);

  const notify = (id: string) => setLastAction(id);

  const actions: EntityAction[] = useMemo(
    () => [
      {
        id: "edit",
        label: t("entityWorkspace.action.edit"),
        kind: "primary",
        capability: "edit",
        icon: <Pencil className="h-3.5 w-3.5" />,
        onSelect: () => notify("edit"),
      },
      {
        id: "approve",
        label: t("entityWorkspace.action.approve"),
        kind: "secondary",
        capability: "approve",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        confirm: "soft",
        confirmTitle: t("entityWorkspace.action.approve"),
        confirmDescription: t("entityWorkspace.lab.approveConfirm"),
        onSelect: () => notify("approve"),
      },
      {
        id: "print",
        label: t("entityWorkspace.action.print"),
        kind: "secondary",
        capability: "print",
        icon: <Printer className="h-3.5 w-3.5" />,
        onSelect: () => notify("print"),
      },
      {
        id: "export",
        label: t("entityWorkspace.action.export"),
        kind: "secondary",
        capability: "export",
        icon: <FileDown className="h-3.5 w-3.5" />,
        onSelect: () => notify("export"),
      },
      {
        id: "archive",
        label: t("entityWorkspace.action.archive"),
        kind: "overflow",
        capability: "archive",
        icon: <Archive className="h-3.5 w-3.5" />,
        confirm: "soft",
        onSelect: () => notify("archive"),
      },
      {
        id: "restore",
        label: t("entityWorkspace.action.restore"),
        kind: "overflow",
        capability: "restore",
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        disabled: true,
        disabledReason: t("entityWorkspace.lab.restoreDisabled"),
        onSelect: () => notify("restore"),
      },
      {
        id: "reverse",
        label: t("entityWorkspace.action.reverse"),
        kind: "overflow",
        capability: "reverse",
        icon: <Undo2 className="h-3.5 w-3.5" />,
        confirm: "hard",
        confirmDescription: t("entityWorkspace.lab.reverseConfirm"),
        onSelect: () => notify("reverse"),
      },
      {
        id: "delete",
        label: t("entityWorkspace.action.delete"),
        kind: "destructive",
        capability: "delete",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        confirm: "hard",
        confirmTitle: t("entityWorkspace.action.delete"),
        confirmDescription: t("entityWorkspace.lab.deleteConfirm"),
        onSelect: () => notify("delete"),
      },
    ],
    [t]
  );

  return (
    <ModuleLayout>
      <header className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--card)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          {t("entityWorkspace.lab.eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{t("entityWorkspace.lab.title")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          {t("entityWorkspace.lab.description")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">{t("entityWorkspace.lab.lastAction")}: {lastAction}</Badge>
          <Badge variant="secondary">
            {t("appearance.detailsLayout")}: {detailsPageLayout}
          </Badge>
        </div>
      </header>

      <section
        className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--card)] p-4"
        aria-label={t("entityWorkspace.lab.controls")}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("entityWorkspace.lab.controls")}
        </p>
        <div className="flex flex-wrap gap-2">
          {DETAILS_PAGE_LAYOUTS.map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={detailsPageLayout === mode ? "default" : "secondary"}
              onClick={() => setDetailsPageLayout(mode as DetailsPageLayout)}
            >
              {t(`appearance.detailsLayout.${mode}`)}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["demo", "loading", "error", "empty"] as LabView[]).map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? "outline" : "ghost"}
              onClick={() => setView(v)}
            >
              {t(`entityWorkspace.lab.view.${v}`)}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={restrictPermissions ? "outline" : "ghost"}
            onClick={() => setRestrictPermissions((x) => !x)}
          >
            {restrictPermissions
              ? t("entityWorkspace.lab.permissionsRestricted")
              : t("entityWorkspace.lab.permissionsFull")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          >
            {locale === "ar" ? "English" : "العربية"}
          </Button>
        </div>
      </section>

      <CrmWorkspace
        entityType="lab-opportunity"
        entityId="lab-opp-001"
        loading={view === "loading"}
        error={view === "error" ? t("entityWorkspace.lab.errorMessage") : null}
        onRetry={() => setView("demo")}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("entityWorkspace.lab.module"), href: "/dashboard/lab/entity-workspace" },
              { label: t("entityWorkspace.lab.list"), href: "/dashboard/lab/entity-workspace" },
              { label: "OPP-LAB-001" },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={LONG_TITLE}
                  subtitle={t("entityWorkspace.lab.subtitle")}
                  trailing={<EntityStatus label={t("entityWorkspace.lab.status")} variant="info" />}
                />
              </div>
              <EntityActionBar actions={actions} capabilities={capabilities} />
            </div>
          </EntityHeader>
        }
        metrics={
          view === "empty" ? null : (
            <EntityMetrics
              items={[
                { id: "value", label: t("entityWorkspace.lab.metricValue"), value: "JOD 48,500" },
                { id: "prob", label: t("entityWorkspace.lab.metricProb"), value: "65%" },
                { id: "close", label: t("entityWorkspace.lab.metricClose"), value: "2026-08-15" },
                { id: "owner", label: t("entityWorkspace.lab.metricOwner"), value: "Sara Ahmed" },
              ]}
            />
          )
        }
        main={
          view === "empty" ? (
            <EntitySection id="empty-main" title={t("entityWorkspace.lab.view.empty")}>
              <p className="text-sm text-[var(--muted)]">{t("entityWorkspace.lab.emptyHint")}</p>
            </EntitySection>
          ) : (
            <>
              <EntitySection id="summary" title={t("entityWorkspace.summary")} defaultOpen>
                <EntityFieldGrid
                  fields={[
                    { id: "number", label: t("entityWorkspace.lab.fieldNumber"), value: "OPP-LAB-001", mono: true },
                    { id: "customer", label: t("entityWorkspace.lab.fieldCustomer"), value: "Northern Partners Co." },
                    { id: "stage", label: t("entityWorkspace.lab.fieldStage"), value: "Negotiation" },
                    {
                      id: "email",
                      label: t("entityWorkspace.lab.fieldEmail"),
                      value: "ops@northern-partners.example",
                      mono: true,
                    },
                    {
                      id: "desc",
                      label: t("entityWorkspace.lab.fieldDesc"),
                      value: t("entityWorkspace.lab.fieldDescValue"),
                      span: 2,
                    },
                  ]}
                />
              </EntitySection>

              <EntityTableSection title={t("entityWorkspace.lab.linesTitle")}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("entityWorkspace.lab.colItem")}</TableHead>
                      <TableHead>{t("entityWorkspace.lab.colQty")}</TableHead>
                      <TableHead>{t("entityWorkspace.lab.colAmount")}</TableHead>
                      <TableHead className="min-w-[14rem]">
                        {t("entityWorkspace.lab.colNote")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ["ERP Core License", "12", "24,000", "Annual seats"],
                      ["Implementation", "1", "18,000", "Phase 1–2"],
                      ["Support retainer", "1", "6,500", "Priority SLA"],
                    ].map((row) => (
                      <TableRow key={row[0]}>
                        <TableCell>{row[0]}</TableCell>
                        <TableCell>
                          <span className="ew-ltr-isolate">{row[1]}</span>
                        </TableCell>
                        <TableCell>
                          <span className="ew-ltr-isolate">{row[2]}</span>
                        </TableCell>
                        <TableCell>{row[3]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </EntityTableSection>

              <EntityNotes
                notes={[
                  {
                    id: "n1",
                    body: t("entityWorkspace.lab.noteBody"),
                    author: "Sara Ahmed",
                    at: "2026-07-18 14:22",
                  },
                ]}
              />

              <EntityTimeline
                events={[
                  {
                    id: "e1",
                    title: t("entityWorkspace.lab.eventCreated"),
                    at: "2026-07-10 09:00",
                    actor: "System",
                  },
                  {
                    id: "e2",
                    title: t("entityWorkspace.lab.eventAssigned"),
                    description: "Sara Ahmed",
                    at: "2026-07-10 09:05",
                    actor: "Admin",
                  },
                  {
                    id: "e3",
                    title: t("entityWorkspace.lab.eventStage"),
                    description: "Qualification → Negotiation",
                    at: "2026-07-15 11:40",
                    actor: "Sara Ahmed",
                  },
                ]}
              />
            </>
          )
        }
        sidebar={
          view === "empty" ? undefined : (
            <>
              <EntityOwner
                name="Sara Ahmed"
                role={t("entityWorkspace.lab.ownerRole")}
                onReassign={
                  capabilities.has("assign") ? () => notify("reassign") : undefined
                }
              />
              <EntityWorkflow
                statusLabel={t("entityWorkspace.lab.status")}
                steps={[
                  { id: "q", label: "Qualification", done: true },
                  { id: "n", label: "Negotiation", active: true },
                  { id: "w", label: "Won" },
                ]}
              />
              <EntityRelations
                items={[
                  {
                    id: "r1",
                    label: t("entityWorkspace.lab.relatedCustomer"),
                    description: "Northern Partners Co.",
                    meta: "CUS-1042",
                    href: "/dashboard/lab/entity-workspace",
                  },
                  {
                    id: "r2",
                    label: t("entityWorkspace.lab.relatedLead"),
                    meta: "LEAD-889",
                    href: "/dashboard/lab/entity-workspace",
                  },
                ]}
              />
              <EntityAttachments empty />
            </>
          )
        }
        footer={
          view === "empty" || view === "error" || view === "loading" ? null : (
            <>
              <EntityAudit
                meta={{
                  id: "lab-opp-001",
                  createdAt: "2026-07-10 09:00",
                  createdBy: "Admin",
                  updatedAt: "2026-07-18 14:22",
                  updatedBy: "Sara Ahmed",
                }}
              />
              <EntityDangerZone>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className={cn(!capabilities.has("delete") && "hidden")}
                  onClick={() => notify("danger-delete")}
                >
                  {t("entityWorkspace.action.delete")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(!capabilities.has("archive") && "hidden")}
                  onClick={() => notify("danger-archive")}
                >
                  {t("entityWorkspace.action.archive")}
                </Button>
              </EntityDangerZone>
            </>
          )
        }
      />
    </ModuleLayout>
  );
}
