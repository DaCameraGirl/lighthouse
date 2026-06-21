import type {
  AutomationClass,
  Directory,
  DirectoryCategory,
} from "@lighthouse/core";
import { DIRECTORIES } from "./data/directories.js";

export { DIRECTORIES };

export function getDirectory(id: string): Directory | undefined {
  return DIRECTORIES.find((d) => d.id === id);
}

export function byCategory(category: DirectoryCategory): Directory[] {
  return DIRECTORIES.filter((d) => d.category === category);
}

export function byAutomationClass(cls: AutomationClass): Directory[] {
  return DIRECTORIES.filter((d) => d.automationClass === cls);
}

export function freeDirectories(): Directory[] {
  return DIRECTORIES.filter((d) => d.pricing.model !== "paid");
}

/**
 * Opportunity score: what we sequence submissions by.
 *
 * Rewards reach (domain authority) and likelihood of acceptance (approval rate),
 * and gives a small edge to lower-effort automation classes so the worker fleet
 * banks easy wins first. Paid directories are nudged down unless they're
 * high-authority enough to justify the spend. Pure heuristic, tunable.
 */
export function opportunityScore(d: Directory): number {
  const reach = d.domainAuthority / 100; // 0–1
  const accept = d.approvalRate ?? 0.5; // unknown → neutral
  const effortBonus =
    d.automationClass === "auto" ? 0.1 : d.automationClass === "assisted" ? 0.05 : 0;
  const paidPenalty = d.pricing.model === "paid" && d.domainAuthority < 70 ? 0.15 : 0;
  return reach * 0.6 + accept * 0.4 + effortBonus - paidPenalty;
}

/** Catalog sorted best-first for a submission campaign. */
export function rankedForCampaign(opts?: {
  category?: DirectoryCategory;
  freeOnly?: boolean;
}): Directory[] {
  let pool = DIRECTORIES.slice();
  if (opts?.category) pool = pool.filter((d) => d.category === opts.category);
  if (opts?.freeOnly) pool = pool.filter((d) => d.pricing.model !== "paid");
  return pool.sort((a, b) => opportunityScore(b) - opportunityScore(a));
}

/** Quick catalog stats for dashboards. */
export function catalogStats() {
  const total = DIRECTORIES.length;
  const byClass = DIRECTORIES.reduce<Record<AutomationClass, number>>(
    (acc, d) => {
      acc[d.automationClass] = (acc[d.automationClass] ?? 0) + 1;
      return acc;
    },
    { auto: 0, assisted: 0, manual: 0 },
  );
  const avgDomainAuthority = Math.round(
    DIRECTORIES.reduce((s, d) => s + d.domainAuthority, 0) / total,
  );
  const freeCount = freeDirectories().length;
  return { total, byClass, avgDomainAuthority, freeCount };
}
