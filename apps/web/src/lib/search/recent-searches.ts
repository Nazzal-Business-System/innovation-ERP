"use client";

import { useAuthStore } from "@/lib/auth-store";

const MAX_RECENT = 8;

function storageKey(organizationId: string | undefined, userId: string | undefined): string | null {
  if (!organizationId || !userId) return null;
  return `ierp_recent_searches:${organizationId}:${userId}`;
}

function readRaw(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getRecentSearchesForUser(
  organizationId: string | undefined,
  userId: string | undefined
): string[] {
  if (typeof window === "undefined") return [];
  const key = storageKey(organizationId, userId);
  if (!key) return [];
  return readRaw(key).slice(0, MAX_RECENT);
}

export function addRecentSearchForUser(
  organizationId: string | undefined,
  userId: string | undefined,
  query: string
): string[] {
  if (typeof window === "undefined") return [];
  const key = storageKey(organizationId, userId);
  if (!key) return [];
  const trimmed = query.trim();
  if (!trimmed) return readRaw(key);
  const next = [trimmed, ...readRaw(key).filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_RECENT
  );
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

export function removeRecentSearchForUser(
  organizationId: string | undefined,
  userId: string | undefined,
  query: string
): string[] {
  if (typeof window === "undefined") return [];
  const key = storageKey(organizationId, userId);
  if (!key) return [];
  const next = readRaw(key).filter((q) => q.toLowerCase() !== query.trim().toLowerCase());
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

export function clearRecentSearchesForUser(
  organizationId: string | undefined,
  userId: string | undefined
): string[] {
  if (typeof window === "undefined") return [];
  const key = storageKey(organizationId, userId);
  if (!key) return [];
  localStorage.removeItem(key);
  return [];
}

/** Hook-friendly accessors bound to the signed-in user. */
export function useRecentSearchIdentity() {
  const organizationId = useAuthStore((s) => s.organization?.id);
  const userId = useAuthStore((s) => s.user?.id);
  return { organizationId, userId };
}
