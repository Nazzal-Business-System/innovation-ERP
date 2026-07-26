/** Ordered personal sidebar pin referencing a stable NAV_GROUPS item id. */
export interface SidebarPin {
  id: string;
  order: number;
  createdAt?: string;
}

/** Per-user UI preferences stored on User.uiPreferences (not org SystemPreference). */
export interface UserUiPreferences {
  sidebarPins: SidebarPin[];
  /** When false, hide the Pinned section even if pins exist. Default true. */
  showPinnedSection: boolean;
  /**
   * Module/group IDs (from NAV_GROUPS) the user has expanded in the sidebar.
   * Absent groups render collapsed by default; the active route's owning group
   * is always auto-expanded on navigation regardless of this list.
   */
  sidebarExpandedGroups: string[];
}

export const DEFAULT_USER_UI_PREFERENCES: UserUiPreferences = {
  sidebarPins: [],
  showPinnedSection: true,
  sidebarExpandedGroups: [],
};

export interface UserUiPreferencesResponse {
  preferences: UserUiPreferences;
}

export interface UpdateUserUiPreferencesInput {
  sidebarPins?: SidebarPin[];
  showPinnedSection?: boolean;
  sidebarExpandedGroups?: string[];
}
