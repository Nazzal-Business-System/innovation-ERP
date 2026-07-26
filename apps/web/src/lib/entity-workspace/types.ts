import type { ReactNode } from "react";
import type { DetailsPageLayout } from "../i18n/types";

export type { DetailsPageLayout };
export { DEFAULT_DETAILS_PAGE_LAYOUT, DETAILS_PAGE_LAYOUTS, normalizeDetailsPageLayout } from "./layout";

export type EntityActionKind = "primary" | "secondary" | "overflow" | "destructive";

export type EntityActionConfirm = false | "soft" | "hard";

export type EntityCapability =
  | "read"
  | "edit"
  | "archive"
  | "restore"
  | "delete"
  | "print"
  | "export"
  | "assign"
  | "transition"
  | "comment"
  | "attach"
  | "createRelated"
  | "approve"
  | "reverse";

export interface EntityAction {
  id: string;
  label: string;
  kind: EntityActionKind;
  onSelect: () => void;
  icon?: ReactNode;
  /** When set, action is hidden unless this capability is present. */
  capability?: EntityCapability | string;
  hidden?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  pending?: boolean;
  /** Explicit pending button label (e.g. "Posting…"). Overrides id/capability resolution. */
  pendingLabel?: string;
  confirm?: EntityActionConfirm;
  confirmTitle?: string;
  confirmDescription?: string;
}

export interface ResolvedEntityActions {
  primary: EntityAction | null;
  secondary: EntityAction[];
  overflow: EntityAction[];
  destructive: EntityAction[];
}

export interface EntityBreadcrumbItem {
  label: string;
  href?: string;
}

export interface EntityMetricItem {
  id: string;
  label: string;
  value: ReactNode;
  hint?: string;
}

/** Responsive field width within EntityFieldGrid (12-column). Default: md. */
export type EntityFieldSpan = "sm" | "md" | "lg" | "full";

export interface EntityFieldItem {
  id: string;
  label: string;
  value: ReactNode;
  /** Keep codes/IDs LTR in RTL layouts */
  mono?: boolean;
  /**
   * Grid span. Prefer sm|md|lg|full.
   * Legacy: `1` → md, `2` → lg.
   */
  span?: EntityFieldSpan | 1 | 2;
}

export interface EntityRelationItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  meta?: string;
}

export interface EntityTimelineEvent {
  id: string;
  title: string;
  description?: string;
  at: string;
  actor?: string;
}

export interface EntityNoteItem {
  id: string;
  body: string;
  author?: string;
  at?: string;
}

export interface EntityAuditMeta {
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  archivedAt?: string;
  restoredAt?: string;
  deactivatedAt?: string;
  reactivatedAt?: string;
  /** Last authentication timestamp (used by the user profile page). */
  lastLoginAt?: string;
  lifecycleActor?: string;
  id?: string;
}
