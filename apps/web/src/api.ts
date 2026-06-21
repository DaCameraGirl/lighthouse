import type { Directory, PressKit, Submission } from "@lighthouse/core";

/**
 * Thin API client with JWT auth. The token is held in memory + localStorage so a
 * refresh keeps the session. Every request sends `Authorization: Bearer <token>`;
 * a 401 clears the token so the app falls back to the login screen.
 */
const TOKEN_KEY = "lighthouse_token";

let token: string | null = localStorage.getItem(TOKEN_KEY);

export function getToken(): string | null {
  return token;
}
export function setToken(value: string | null) {
  token = value;
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    setToken(null);
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface CatalogStats {
  total: number;
  byClass: { auto: number; assisted: number; manual: number };
  avgDomainAuthority: number;
  freeCount: number;
}

export interface AnalyticsOverview {
  total: number;
  byStatus: Record<string, number>;
  liveListings: number;
  referringDomains: number;
  backlinkAuthority: number;
}

export interface AuthResult {
  token: string;
  user: { id: string; name: string; email: string; role: string };
  org?: { id: string; name: string };
}

export const api = {
  signup: (data: { orgName: string; name: string; email: string; password: string }) =>
    req<AuthResult>("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    req<AuthResult>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => req<{ user: AuthResult["user"]; org: { id: string; name: string } }>("/auth/me"),

  directories: (ranked = false) => req<Directory[]>(`/directories?ranked=${ranked}`),
  catalogStats: () => req<CatalogStats>("/directories/stats"),
  pressKits: () => req<PressKit[]>("/press-kits"),
  createPressKit: (data: unknown) =>
    req<PressKit>("/press-kits", { method: "POST", body: JSON.stringify(data) }),
  submissions: () => req<Submission[]>("/submissions"),
  launchCampaign: (data: { pressKitId: string; freeOnly?: boolean; limit?: number; directoryIds?: string[] }) =>
    req<{ launched: number }>("/campaigns", { method: "POST", body: JSON.stringify(data) }),
  updateSubmission: (id: string, data: { status: string; listingUrl?: string }) =>
    req<Submission>(`/submissions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  analytics: () => req<AnalyticsOverview>("/analytics/overview"),
  tailorCopy: (data: { pressKitId: string; directoryId: string }) =>
    req<{ tagline: string; description: string }>("/ai/tailor-copy", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
