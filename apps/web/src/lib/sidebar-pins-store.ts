"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SidebarPin, UserUiPreferences } from "@ierp/shared";
import {
  DEFAULT_USER_UI_PREFERENCES,
  getNavItemById,
  isKnownNavGroupId,
  isKnownNavItemId,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { canAccessNavItem } from "@/lib/nav-permissions";

const STORAGE_KEY = "ierp_ui_preferences";

type UserUiPreferencesResponse = { preferences: UserUiPreferences };

type SidebarPinsStore = UserUiPreferences & {
  hydrated: boolean;
  syncing: boolean;
  userId: string | null;
  loadError: string | null;
  /** Load from server for the signed-in user; uses local cache immediately. */
  hydrateForUser: (userId: string) => Promise<void>;
  /** Clear local pins when signing out (keeps cache keyed by last user via persist). */
  resetSession: () => void;
  setShowPinnedSection: (show: boolean) => void;
  pinItem: (itemId: string) => void;
  unpinItem: (itemId: string) => void;
  movePin: (itemId: string, direction: "up" | "down") => void;
  reorderPins: (orderedIds: string[]) => void;
  clearPins: () => void;
  isPinned: (itemId: string) => boolean;
  /** Collapsible sidebar module groups (IDE explorer style). */
  toggleGroup: (groupId: string) => void;
  /** Auto-expand a group (e.g. the active route's owner) without collapsing it if already open. */
  ensureGroupExpanded: (groupId: string) => void;
  isGroupExpanded: (groupId: string) => boolean;
};

function normalizeGroups(groups: string[] | undefined): string[] {
  if (!Array.isArray(groups)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of groups) {
    if (typeof id !== "string" || !isKnownNavGroupId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistGeneration = 0;

function sortPins(pins: SidebarPin[]): SidebarPin[] {
  return [...pins].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * Assign sequential `order` from array position.
 * Do NOT sort by existing order first — that would undo an in-memory reorder
 * that still carries stale order values on each pin object.
 */
function reindex(pins: SidebarPin[]): SidebarPin[] {
  return pins.map((p, order) => ({ ...p, order }));
}

function dedupePins(pins: SidebarPin[]): SidebarPin[] {
  const seen = new Set<string>();
  const out: SidebarPin[] = [];
  for (const pin of sortPins(pins)) {
    if (seen.has(pin.id)) continue;
    seen.add(pin.id);
    out.push(pin);
  }
  return reindex(out);
}

async function patchPreferences(body: Partial<UserUiPreferences>): Promise<UserUiPreferences> {
  const res = await apiFetch<UserUiPreferencesResponse>("/auth/preferences", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.preferences;
}

function schedulePersist(
  getState: () => SidebarPinsStore,
  setState: (partial: Partial<SidebarPinsStore>) => void,
  payload: Partial<UserUiPreferences>,
  debounceMs = 0
) {
  const generation = ++persistGeneration;
  if (persistTimer) clearTimeout(persistTimer);

  const run = async () => {
    setState({ syncing: true, loadError: null });
    try {
      const preferences = await patchPreferences(payload);
      if (generation !== persistGeneration) return;
      setState({
        sidebarPins: dedupePins(preferences.sidebarPins),
        showPinnedSection: preferences.showPinnedSection,
        sidebarExpandedGroups: normalizeGroups(preferences.sidebarExpandedGroups),
        syncing: false,
      });
    } catch (err) {
      if (generation !== persistGeneration) return;
      setState({
        syncing: false,
        loadError: err instanceof Error ? err.message : "Failed to save preferences",
      });
      // Reload authoritative state from server on failure.
      try {
        const res = await apiFetch<UserUiPreferencesResponse>("/auth/preferences");
        if (generation !== persistGeneration) return;
        setState({
          sidebarPins: dedupePins(res.preferences.sidebarPins),
          showPinnedSection: res.preferences.showPinnedSection,
          sidebarExpandedGroups: normalizeGroups(res.preferences.sidebarExpandedGroups),
        });
      } catch {
        /* keep optimistic until next hydrate */
      }
    }
  };

  if (debounceMs > 0) {
    persistTimer = setTimeout(() => {
      void run();
    }, debounceMs);
  } else {
    void run();
  }
}

export const useSidebarPinsStore = create<SidebarPinsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_USER_UI_PREFERENCES,
      hydrated: false,
      syncing: false,
      userId: null,
      loadError: null,

      hydrateForUser: async (userId: string) => {
        if (get().userId !== userId) {
          set({
            ...DEFAULT_USER_UI_PREFERENCES,
            userId,
            hydrated: false,
            syncing: false,
            loadError: null,
          });
        } else {
          set({ userId });
        }

        try {
          const res = await apiFetch<UserUiPreferencesResponse>("/auth/preferences");
          set({
            userId,
            sidebarPins: dedupePins(res.preferences.sidebarPins),
            showPinnedSection: res.preferences.showPinnedSection,
            sidebarExpandedGroups: normalizeGroups(res.preferences.sidebarExpandedGroups),
            hydrated: true,
            loadError: null,
          });
        } catch (err) {
          set({
            hydrated: true,
            loadError: err instanceof Error ? err.message : "Failed to load preferences",
          });
        }
      },

      resetSession: () => {
        persistGeneration += 1;
        if (persistTimer) clearTimeout(persistTimer);
        set({
          ...DEFAULT_USER_UI_PREFERENCES,
          syncing: false,
          loadError: null,
          userId: null,
          hydrated: false,
        });
      },

      setShowPinnedSection: (show) => {
        const previous = get().showPinnedSection;
        set({ showPinnedSection: show });
        schedulePersist(get, set, { showPinnedSection: show });
        // Rollback handled by schedulePersist reload on failure; stash previous if needed:
        void previous;
      },

      pinItem: (itemId) => {
        if (!isKnownNavItemId(itemId) || !getNavItemById(itemId)) return;
        if (get().sidebarPins.some((p) => p.id === itemId)) return;
        const next = reindex([
          ...get().sidebarPins,
          { id: itemId, order: get().sidebarPins.length, createdAt: new Date().toISOString() },
        ]);
        set({ sidebarPins: next });
        schedulePersist(get, set, { sidebarPins: next });
      },

      unpinItem: (itemId) => {
        const previous = get().sidebarPins;
        if (!previous.some((p) => p.id === itemId)) return;
        const next = reindex(previous.filter((p) => p.id !== itemId));
        set({ sidebarPins: next });
        schedulePersist(get, set, { sidebarPins: next });
      },

      movePin: (itemId, direction) => {
        const pins = sortPins(get().sidebarPins);
        const index = pins.findIndex((p) => p.id === itemId);
        if (index < 0) return;
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= pins.length) return;
        const swapped = [...pins];
        const a = swapped[index]!;
        const b = swapped[target]!;
        swapped[index] = b;
        swapped[target] = a;
        const next = reindex(swapped);
        set({ sidebarPins: next });
        schedulePersist(get, set, { sidebarPins: next }, 250);
      },

      reorderPins: (orderedIds) => {
        const byId = new Map(get().sidebarPins.map((p) => [p.id, p]));
        const ordered: SidebarPin[] = [];
        for (const id of orderedIds) {
          const existing = byId.get(id);
          if (!existing) continue;
          ordered.push(existing);
          byId.delete(id);
        }
        // Preserve inaccessible / leftover pins after the reordered visible set.
        for (const leftover of sortPins([...byId.values()])) {
          ordered.push(leftover);
        }
        const next = reindex(ordered);
        set({ sidebarPins: next });
        schedulePersist(get, set, { sidebarPins: next }, 400);
      },

      clearPins: () => {
        set({ sidebarPins: [] });
        schedulePersist(get, set, { sidebarPins: [] });
      },

      isPinned: (itemId) => get().sidebarPins.some((p) => p.id === itemId),

      toggleGroup: (groupId) => {
        if (!isKnownNavGroupId(groupId)) return;
        const current = get().sidebarExpandedGroups;
        const next = current.includes(groupId)
          ? current.filter((id) => id !== groupId)
          : [...current, groupId];
        set({ sidebarExpandedGroups: next });
        schedulePersist(get, set, { sidebarExpandedGroups: next }, 300);
      },

      ensureGroupExpanded: (groupId) => {
        if (!isKnownNavGroupId(groupId)) return;
        const current = get().sidebarExpandedGroups;
        if (current.includes(groupId)) return;
        const next = [...current, groupId];
        set({ sidebarExpandedGroups: next });
        schedulePersist(get, set, { sidebarExpandedGroups: next }, 400);
      },

      isGroupExpanded: (groupId) => get().sidebarExpandedGroups.includes(groupId),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        sidebarPins: s.sidebarPins,
        showPinnedSection: s.showPinnedSection,
        sidebarExpandedGroups: s.sidebarExpandedGroups,
        userId: s.userId,
      }),
    }
  )
);

/** Pins that are known nav items and currently permitted for the user. */
export function selectVisiblePins(
  pins: SidebarPin[],
  permissions: string[]
): SidebarPin[] {
  return sortPins(pins).filter(
    (pin) => isKnownNavItemId(pin.id) && canAccessNavItem(pin.id, permissions)
  );
}

export function isNavItemPinnable(itemId: string, href: string, permissions: string[]): boolean {
  if (!isKnownNavItemId(itemId)) return false;
  if (!href || href === "#") return false;
  if (!canAccessNavItem(itemId, permissions)) return false;
  return Boolean(getNavItemById(itemId));
}
