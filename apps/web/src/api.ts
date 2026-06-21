import type { Directory, PressKit, Submission } from "@lighthouse/core";

/**
 * Thin API client. In dev, Vite proxies /api → :4000 (see vite.config.ts), and
 * we pass a dev org via x-org-id until real auth lands. Swap this header for a
 * bearer token when login ships — nothing else changes.
 */
const DEV_ORG = "demo-org";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-org-id": DEV_ORG,
      ...(init?.headers ?? {}),
    },
  });
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

export const api = {
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
};
