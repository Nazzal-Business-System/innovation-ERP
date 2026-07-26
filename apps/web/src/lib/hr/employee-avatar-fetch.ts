import { AUTH_TOKEN_KEY } from "@ierp/shared";
import { getApiBaseUrl } from "@/lib/api-client";

export async function fetchEmployeeAvatarObjectUrl(
  employeeId: string,
  avatarUpdatedAt?: string | null
): Promise<string | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  if (!token) return null;
  const bust = avatarUpdatedAt ? `?v=${encodeURIComponent(avatarUpdatedAt)}` : "";
  const res = await fetch(`${getApiBaseUrl()}/api/hr/employees/${employeeId}/avatar${bust}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
