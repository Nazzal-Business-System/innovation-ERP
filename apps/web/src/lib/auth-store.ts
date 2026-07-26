"use client";

import { create } from "zustand";
import type {
  AuthOrganization,
  AuthRole,
  AuthUser,
  ChangePasswordInput,
  ChangePasswordResponse,
  LoginResponse,
  MeResponse,
  UpdateProfileInput,
  UploadAvatarInput,
  UserProfile,
} from "@ierp/shared";
import { AUTH_TOKEN_KEY } from "@ierp/shared";
import { apiFetch } from "./api-client";
import { markPresenceOffline } from "./presence-api";

const AUTH_SESSION_KEY = "ierp_auth_session";

interface AuthSessionSnapshot {
  user: AuthUser;
  organization: AuthOrganization;
  roles: AuthRole[];
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  roles: AuthRole[];
  permissions: string[];
  initialized: boolean;
  /** Session confirmed via login or /auth/me */
  authReady: boolean;
  /** Session restore / fetchMe in progress */
  loading: boolean;
  /** Login form submit in progress (includes session confirmation) */
  loginLoading: boolean;
  error: string | null;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<void>;
  fetchMe: (force?: boolean) => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  /** Patch the session `user` (e.g. after profile/avatar update) without touching roles/permissions. */
  applyUserPatch: (user: AuthUser) => void;
  /**
   * Replace the full session (user/org/roles/permissions + optional new token).
   * Used after password change, where other sessions are revoked and the current
   * client is re-issued a fresh token.
   */
  applySessionPayload: (payload: {
    token?: string;
    user: AuthUser;
    organization: AuthOrganization;
    roles: AuthRole[];
    permissions: string[];
  }) => void;
}

/** Response shape shared by GET/PATCH /auth/profile and POST/DELETE /auth/avatar. */
export interface ProfileMutationResponse {
  profile: UserProfile;
  user: AuthUser;
  organization: AuthOrganization;
  roles: AuthRole[];
  permissions: string[];
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function writeToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

function readSessionSnapshot(): AuthSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSessionSnapshot;
    if (!parsed?.user?.id || !parsed?.organization?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionSnapshot(snapshot: AuthSessionSnapshot | null) {
  if (typeof window === "undefined") return;
  if (!snapshot) {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(snapshot));
}

function applySession(
  set: (partial: Partial<AuthState>) => void,
  data: LoginResponse | MeResponse,
  token?: string
) {
  if (token) writeToken(token);
  const snapshot: AuthSessionSnapshot = {
    user: data.user,
    organization: data.organization,
    roles: data.roles,
    permissions: data.permissions,
  };
  writeSessionSnapshot(snapshot);
  set({
    token: token ?? readToken(),
    user: data.user,
    organization: data.organization,
    roles: data.roles,
    permissions: data.permissions,
    error: null,
    authReady: true,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  organization: null,
  roles: [],
  permissions: [],
  initialized: false,
  authReady: false,
  loading: false,
  loginLoading: false,
  error: null,

  hydrate() {
    const token = readToken();
    const snapshot = token ? readSessionSnapshot() : null;
    if (token && snapshot) {
      set({
        token,
        user: snapshot.user,
        organization: snapshot.organization,
        roles: snapshot.roles,
        permissions: snapshot.permissions,
        initialized: true,
        authReady: true,
      });
      return;
    }
    if (!token) writeSessionSnapshot(null);
    set({ token, initialized: true, authReady: false });
  },

  clearError() {
    set({ error: null });
  },

  async login(email, password) {
    set({ loginLoading: true, error: null, authReady: false });
    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      applySession(set, res, res.token);
      set({ initialized: true, loginLoading: false });
    } catch (err) {
      writeToken(null);
      writeSessionSnapshot(null);
      const message = err instanceof Error ? err.message : "Login failed";
      set({
        error: message,
        loginLoading: false,
        authReady: false,
        token: null,
        user: null,
        organization: null,
        roles: [],
        permissions: [],
      });
      throw err;
    }
  },

  async fetchMe(force = false) {
    const token = get().token ?? readToken();
    if (!token) {
      writeSessionSnapshot(null);
      set({
        user: null,
        organization: null,
        roles: [],
        permissions: [],
        loading: false,
        authReady: false,
      });
      return false;
    }

    if (!force && get().loading) {
      return get().authReady;
    }

    if (!force && get().authReady && get().user) {
      return true;
    }

    const softRevalidate = force && get().authReady;
    if (!softRevalidate) {
      set({ loading: true, error: null, token });
    } else {
      set({ token });
    }

    try {
      const data = await apiFetch<MeResponse>("/auth/me");
      applySession(set, data);
      return true;
    } catch {
      writeToken(null);
      writeSessionSnapshot(null);
      set({
        token: null,
        user: null,
        organization: null,
        roles: [],
        permissions: [],
        authReady: false,
      });
      return false;
    } finally {
      if (!softRevalidate) {
        set({ loading: false });
      }
    }
  },

  async refreshSession() {
    return get().fetchMe(true);
  },

  logout() {
    void markPresenceOffline();
    writeToken(null);
    writeSessionSnapshot(null);
    set({
      token: null,
      user: null,
      organization: null,
      roles: [],
      permissions: [],
      error: null,
      authReady: false,
      loginLoading: false,
      loading: false,
    });
  },

  applyUserPatch(user) {
    const { organization, roles, permissions } = get();
    set({ user });
    if (organization) {
      writeSessionSnapshot({ user, organization, roles, permissions });
    }
  },

  applySessionPayload(payload) {
    applySession(set, payload, payload.token);
  },
}));

export function getStoredToken(): string | null {
  return useAuthStore.getState().token ?? readToken();
}

/** GET the authenticated user's full profile (roles, permissions, org, lifecycle metadata). */
export async function fetchUserProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/profile");
}

/** PATCH name/phone/jobTitle. Caller applies the returned session patch on success. */
export async function updateUserProfile(input: UpdateProfileInput): Promise<ProfileMutationResponse> {
  return apiFetch<ProfileMutationResponse>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Change password. Revokes other sessions server-side and re-issues a token for this client. */
export async function changeUserPassword(input: ChangePasswordInput): Promise<ChangePasswordResponse> {
  return apiFetch<ChangePasswordResponse>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Upload/replace the avatar. `data` may be a raw base64 string or a data: URL. */
export async function uploadUserAvatar(input: UploadAvatarInput): Promise<ProfileMutationResponse> {
  return apiFetch<ProfileMutationResponse>("/auth/avatar", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Remove the current avatar. */
export async function removeUserAvatar(): Promise<ProfileMutationResponse> {
  return apiFetch<ProfileMutationResponse>("/auth/avatar", { method: "DELETE" });
}
