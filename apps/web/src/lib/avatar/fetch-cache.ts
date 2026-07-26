import { AUTH_TOKEN_KEY } from "@ierp/shared";
import { getApiBaseUrl } from "@/lib/api-client";

type CacheEntry = { url: string; refs: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

function cacheKey(kind: string, id: string, version?: string | null): string {
  return `${kind}:${id}:${version ?? "0"}`;
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

async function fetchBlobUrl(path: string): Promise<string | null> {
  const token = readToken();
  if (!token) return null;
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Shared authenticated avatar blob cache.
 * Callers must release() when unmounting to avoid leaking object URLs.
 */
export async function acquireAvatarObjectUrl(input: {
  kind: "self-user" | "user" | "employee" | "self-employee";
  id?: string;
  version?: string | null;
}): Promise<string | null> {
  const id = input.id ?? "me";
  const key = cacheKey(input.kind, id, input.version);
  const hit = cache.get(key);
  if (hit) {
    hit.refs += 1;
    return hit.url;
  }

  let pending = inflight.get(key);
  if (!pending) {
    const bust = input.version ? `?v=${encodeURIComponent(input.version)}` : "";
    const path =
      input.kind === "self-user"
        ? `/api/auth/avatar${bust}`
        : input.kind === "user"
          ? `/api/auth/users/${id}/avatar${bust}`
          : input.kind === "self-employee"
            ? `/api/self-service/me/avatar${bust}`
            : `/api/hr/employees/${id}/avatar${bust}`;

    pending = fetchBlobUrl(path)
      .then((url) => {
        inflight.delete(key);
        if (!url) return null;
        cache.set(key, { url, refs: 0 });
        return url;
      })
      .catch(() => {
        inflight.delete(key);
        return null;
      });
    inflight.set(key, pending);
  }

  const url = await pending;
  if (!url) return null;
  const entry = cache.get(key);
  if (entry) {
    entry.refs += 1;
    return entry.url;
  }
  return url;
}

export function releaseAvatarObjectUrl(input: {
  kind: "self-user" | "user" | "employee" | "self-employee";
  id?: string;
  version?: string | null;
}): void {
  const id = input.id ?? "me";
  const key = cacheKey(input.kind, id, input.version);
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs === 0) {
    URL.revokeObjectURL(entry.url);
    cache.delete(key);
  }
}
