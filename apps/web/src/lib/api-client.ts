import { AUTH_TOKEN_KEY } from "@ierp/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiFetchOptions = RequestInit & { skipAuth?: boolean };

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuth, headers, signal, ...rest } = options;
  const token =
    !skipAuth && typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new ApiError(
      message,
      res.status,
      typeof data.code === "string" ? data.code : undefined,
      typeof data === "object" && data !== null ? (data as Record<string, unknown>) : undefined
    );
  }

  return data as T;
}

/** Authenticated binary fetch (avatars, downloads). */
export async function apiFetchBlob(path: string, options: ApiFetchOptions = {}): Promise<Blob> {
  const { skipAuth, headers, signal, ...rest } = options;
  const token =
    !skipAuth && typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    signal,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, typeof data.code === "string" ? data.code : undefined);
  }

  return res.blob();
}

export function getApiBaseUrl() {
  return API_URL.replace(/\/api\/?$/, "");
}
