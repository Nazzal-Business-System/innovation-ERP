"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { EntityNotes } from "./entity-notes";
import { EntityEmptyState } from "./entity-empty-state";
import { textareaClassName } from "@/lib/form-utils";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useI18n } from "@/lib/i18n";
import { useEntityLayout } from "./context/entity-layout-context";

/**
 * Editable single-field notes editor for master data (and similar) workspaces.
 * Parent owns persistence via `onSave`.
 */
export function EntityNotesEditor({
  value,
  canEdit,
  onSave,
  title,
  defaultOpen,
  placeholder,
  disabledReason,
}: {
  value: string | null | undefined;
  canEdit: boolean;
  onSave: (next: string | null) => Promise<void>;
  title?: string;
  defaultOpen?: boolean;
  placeholder?: string;
  /** Shown when notes are visible but not editable (e.g. locked status). */
  disabledReason?: string;
}) {
  const { t } = useI18n();
  const { layout } = useEntityLayout();
  const persisted = value ?? "";
  const [draft, setDraft] = useState(persisted);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!touched) setDraft(persisted);
  }, [persisted, touched]);

  const dirty = draft !== persisted;
  const compact = layout === "compact" || layout === "focus";
  const empty = !persisted.trim() && !dirty;

  async function handleSave() {
    if (!canEdit || !dirty || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next = draft.trim() ? draft.trim() : null;
      await onSave(next);
      setTouched(false);
      setSuccess(t("masterData.notesSaved"));
    } catch (err) {
      setError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit && empty) {
    return (
      <EntityNotes title={title} defaultOpen={defaultOpen ?? !compact}>
        <EntityEmptyState
          variant="empty"
          density="compact"
          title={t("entityWorkspace.noNotes")}
          description={disabledReason}
        />
      </EntityNotes>
    );
  }

  return (
    <EntityNotes title={title} defaultOpen={defaultOpen ?? true}>
      <div className="space-y-3">
        <ActionFeedback success={success} error={error} />
        {canEdit ? (
          <>
            <textarea
              className={textareaClassName}
              rows={compact ? 3 : 4}
              value={draft}
              placeholder={placeholder ?? t("masterData.notesPlaceholder")}
              disabled={saving}
              onChange={(e) => {
                setTouched(true);
                setDraft(e.target.value);
                setSuccess(null);
              }}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="cursor-pointer"
                loading={saving}
                loadingText={t("form.saving", "Saving…")}
                disabled={!dirty || saving}
                onClick={() => void handleSave()}
              >
                {t("masterData.saveNotes")}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
              {persisted || t("entityWorkspace.noNotes")}
            </p>
            {disabledReason ? (
              <p className="text-xs text-[var(--muted)]">{disabledReason}</p>
            ) : null}
          </div>
        )}
      </div>
    </EntityNotes>
  );
}
