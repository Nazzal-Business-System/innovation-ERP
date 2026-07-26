import type { EntityAction } from "./types";

type Translate = (key: string, fallback?: string) => string;

/** Maps action id / capability tokens to verb-specific pending copy. */
const PENDING_BY_TOKEN: Record<string, { key: string; fallback: string }> = {
  archive: { key: "masterData.archiving", fallback: "Archiving…" },
  restore: { key: "masterData.restoring", fallback: "Restoring…" },
  deactivate: { key: "masterData.deactivating", fallback: "Deactivating…" },
  reactivate: { key: "masterData.reactivating", fallback: "Reactivating…" },
  approve: { key: "action.approving", fallback: "Approving…" },
  reject: { key: "action.rejecting", fallback: "Rejecting…" },
  post: { key: "action.posting", fallback: "Posting…" },
  send: { key: "action.sending", fallback: "Sending…" },
  "send-invoice": { key: "action.sending", fallback: "Sending…" },
  "send-po": { key: "action.sending", fallback: "Sending…" },
  receive: { key: "action.receiving", fallback: "Receiving…" },
  "receive-bill": { key: "action.receiving", fallback: "Receiving…" },
  confirm: { key: "action.confirming", fallback: "Confirming…" },
  "confirm-delivery": { key: "action.confirming", fallback: "Confirming…" },
  cancel: { key: "action.cancelling", fallback: "Cancelling…" },
  complete: { key: "action.completing", fallback: "Completing…" },
  process: { key: "action.processing", fallback: "Processing…" },
  publish: { key: "action.publishing", fallback: "Publishing…" },
  delete: { key: "action.deleting", fallback: "Deleting…" },
  pay: { key: "action.paying", fallback: "Paying…" },
  assign: { key: "action.assigning", fallback: "Assigning…" },
  reverse: { key: "action.reversing", fallback: "Reversing…" },
  save: { key: "form.saving", fallback: "Saving…" },
  edit: { key: "form.saving", fallback: "Saving…" },
};

function tokensFor(action: Pick<EntityAction, "id" | "capability">): string[] {
  const tokens: string[] = [];
  if (action.id) tokens.push(action.id.toLowerCase());
  if (action.capability) tokens.push(String(action.capability).toLowerCase());

  // Hyphenated ids: "send-invoice" already exact; also try first segment ("send").
  for (const id of [...tokens]) {
    if (id.includes("-")) {
      tokens.push(id.split("-")[0]!);
    }
  }
  return tokens;
}

/**
 * Resolves pending button copy for an entity action.
 * Prefer explicit `pendingLabel`, then id/capability map, then Saving…
 */
export function resolveActionPendingLabel(
  action: Pick<EntityAction, "id" | "capability" | "pendingLabel"> | null | undefined,
  t: Translate
): string {
  if (!action) return t("form.saving", "Saving…");
  if (action.pendingLabel?.trim()) return action.pendingLabel.trim();

  for (const token of tokensFor(action)) {
    const match = PENDING_BY_TOKEN[token];
    if (match) return t(match.key, match.fallback);
  }

  return t("form.saving", "Saving…");
}

/** Exported for unit tests — known pending tokens. */
export const ACTION_PENDING_TOKENS = Object.keys(PENDING_BY_TOKEN);
