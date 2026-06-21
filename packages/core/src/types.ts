/**
 * Shared domain types — the contract every tier (api, web, worker) agrees on.
 */

/** How a directory can be submitted to — drives routing between worker and cockpit. */
export type AutomationClass = "auto" | "assisted" | "manual";

export type DirectoryCategory =
  | "general-launch"
  | "ai-tools"
  | "saas"
  | "dev-tools"
  | "no-code"
  | "marketplace-review"
  | "startup-news";

/** A vetted submission target in the curated catalog. */
export interface Directory {
  /** Stable slug, also the dataset key. */
  id: string;
  name: string;
  url: string;
  /** Page where a listing is actually submitted. */
  submissionUrl: string;
  category: DirectoryCategory;
  /** Moz-style domain authority 0–100, used for sequencing & scoring. */
  domainAuthority: number;
  automationClass: AutomationClass;
  pricing: {
    model: "free" | "freemium" | "paid";
    /** USD; 0 for free. One-time unless `recurring` is set. */
    amountUsd: number;
    recurring?: "monthly" | "yearly";
  };
  /** Field names this directory expects, used by cockpit + worker mappers. */
  fields: DirectoryField[];
  /** Rough historical approval rate 0–1, null if unknown. */
  approvalRate: number | null;
  notes?: string;
}

export type DirectoryField =
  | "name"
  | "url"
  | "tagline"
  | "description"
  | "logo"
  | "category"
  | "pricing"
  | "founderName"
  | "email"
  | "twitter";

/** The reusable press kit an org submits everywhere. Stored once. */
export interface PressKit {
  id: string;
  orgId: string;
  productName: string;
  url: string;
  category: DirectoryCategory;
  founderName: string;
  email: string;
  twitter?: string;
  taglines: { short: string; medium: string; long: string };
  descriptions: { short: string; medium: string; long: string };
  logos: { square?: string; wide?: string; icon?: string };
}

export type SubmissionStatus =
  | "queued"
  | "in_progress"
  | "submitted"
  | "live"
  | "rejected"
  | "needs_action"
  | "failed";

/** One press-kit-to-directory submission record. */
export interface Submission {
  id: string;
  orgId: string;
  pressKitId: string;
  directoryId: string;
  status: SubmissionStatus;
  /** Worker screenshot / proof URL once attempted. */
  proofUrl?: string;
  /** Public listing URL once it goes live. */
  listingUrl?: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}
