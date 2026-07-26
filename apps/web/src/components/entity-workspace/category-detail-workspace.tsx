"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Archive, ArrowLeft, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EntityActionBar,
  EntityAudit,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntitySection,
  EntityStatus,
  EntityTitle,
  OperationalWorkspace,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { formatDisplayDateTime } from "@/lib/date";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";

export interface CategoryWorkspaceRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryDetailWorkspaceProps {
  category: CategoryWorkspaceRecord;
  count: number;
  countLabel: string;
  backHref: string;
  backLabel: string;
  breadcrumbLabel: string;
  nav: ReactNode;
  canWrite: boolean;
  onUpdate: (input: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
  }) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onDeleted: () => void;
}

export function CategoryDetailWorkspace({
  category,
  count,
  countLabel,
  backHref,
  backLabel,
  breadcrumbLabel,
  nav,
  canWrite,
  onUpdate,
  onDelete,
  onDeleted,
}: CategoryDetailWorkspaceProps) {
  const { t, locale } = useI18n();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [acting, setActing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  function openEditDialog() {
    setName(category.name);
    setDescription(category.description ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  function handleEditOpenChange(nextOpen: boolean) {
    if (!shouldAllowEditDialogClose(submitting, nextOpen)) return;
    setEditOpen(nextOpen);
    if (!nextOpen) setEditError(null);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;
    setSubmitting(true);
    setEditError(null);
    try {
      await onUpdate({
        name: trimmedName,
        description: description.trim() || null,
      });
      setEditOpen(false);
      setActionSuccess("Category updated.");
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActiveChange() {
    if (acting) return;
    setActing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await onUpdate({ isActive: !category.isActive });
      setActionSuccess(category.isActive ? "Category archived." : "Category restored.");
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (acting || count > 0) return;
    setActing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await onDelete();
      onDeleted();
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setActing(false);
    }
  }

  const actions: EntityAction[] = canWrite
    ? [
        {
          id: "edit",
          label: "Edit category",
          kind: "primary",
          capability: "edit",
          icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
          onSelect: openEditDialog,
        },
        {
          id: category.isActive ? "archive" : "restore",
          label: category.isActive ? "Archive" : "Restore",
          kind: "secondary",
          capability: category.isActive ? "archive" : "restore",
          icon: category.isActive ? (
            <Archive className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          ),
          pending: acting,
          confirm: "soft",
          confirmTitle: `${category.isActive ? "Archive" : "Restore"} — ${category.name}`,
          confirmDescription: category.isActive
            ? "The category will become inactive. Existing records remain linked."
            : "The category will become available for new records again.",
          onSelect: () => void handleActiveChange(),
        },
        {
          id: "delete",
          label: "Delete category",
          kind: "destructive",
          capability: "delete",
          icon: <Trash2 className="h-3.5 w-3.5" aria-hidden />,
          disabled: count > 0,
          disabledReason:
            count > 0 ? `Archive this category instead; ${count} ${countLabel} still depend on it.` : undefined,
          pending: acting,
          confirm: "hard",
          confirmTitle: `Delete — ${category.name}`,
          confirmDescription: "This permanently deletes the empty category.",
          onSelect: () => void handleDelete(),
        },
      ]
    : [];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {backLabel}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      {nav}

      <OperationalWorkspace
        entityType="category"
        entityId={category.id}
        readOnly={!canWrite}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: breadcrumbLabel, href: backHref },
              { label: category.code },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <EntityTitle
                title={category.name}
                subtitle={<span className="ew-ltr-isolate font-mono text-xs">{category.code}</span>}
                trailing={
                  <EntityStatus
                    label={category.isActive ? "Active" : "Inactive"}
                    variant={category.isActive ? "success" : "secondary"}
                  />
                }
              />
              <EntityActionBar
                actions={actions}
                capabilities={canWrite ? ["edit", "archive", "restore", "delete"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "dependents", label: countLabel, value: String(count) },
              {
                id: "updated",
                label: "Updated",
                value: formatDisplayDateTime(category.updatedAt, locale),
              },
            ]}
          />
        }
        main={
          <EntitySection id="category-details" title="Category details" defaultOpen>
            <EntityFieldGrid
              fields={[
                { id: "code", label: "Code", value: category.code, mono: true, span: "sm" },
                {
                  id: "status",
                  label: "Status",
                  value: category.isActive ? "Active" : "Inactive",
                  span: "sm",
                },
                {
                  id: "description",
                  label: "Description",
                  value: category.description ?? "—",
                  span: "full",
                },
              ]}
            />
          </EntitySection>
        }
        footer={
          <EntityAudit
            meta={{
              id: category.id,
              createdAt: formatDisplayDateTime(category.createdAt, locale),
              updatedAt: formatDisplayDateTime(category.updatedAt, locale),
            }}
          />
        }
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleEdit(e)} className="space-y-4">
            <ActionFeedback error={editError} />
            <FormField label="Name" htmlFor="category-name" required>
              <input
                id="category-name"
                className={inputClassName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
              />
            </FormField>
            <FormField label="Description" htmlFor="category-description">
              <textarea
                id="category-description"
                className={cn(textareaClassName, "min-h-24")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
              />
            </FormField>
            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("common.save")}
              loading={submitting}
              disabled={submitting || !name.trim()}
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
