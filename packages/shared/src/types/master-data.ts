export interface MasterDataTimelineEvent {
  id: string;
  action: string;
  title: string;
  description?: string;
  actor?: string;
  createdAt: string;
}

export interface MasterDataAuditMeta {
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  restoredAt?: string | null;
  deactivatedAt?: string | null;
  reactivatedAt?: string | null;
  lastActor?: string | null;
}

export interface MasterDataLifecycle {
  audit: MasterDataAuditMeta;
  timeline: MasterDataTimelineEvent[];
}

export interface SetLifecycleInput {
  active: boolean;
}
