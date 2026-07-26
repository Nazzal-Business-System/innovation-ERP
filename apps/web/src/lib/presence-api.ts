import { AUTH_TOKEN_KEY } from "@ierp/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010/api";

/**
 * Best-effort offline mark. Captures the token up front so logout can clear
 * local storage without racing the heartbeat request.
 */
export async function markPresenceOffline(): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    await fetch(`${API_URL}/auth/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ offline: true }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}
