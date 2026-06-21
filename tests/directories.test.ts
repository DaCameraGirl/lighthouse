import { describe, it, expect } from "vitest";
import {
  DIRECTORIES,
  getDirectory,
  rankedForCampaign,
  opportunityScore,
  catalogStats,
  byAutomationClass,
} from "@lighthouse/directories";

describe("directory catalog", () => {
  it("has unique ids", () => {
    const ids = DIRECTORIES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("looks up by id", () => {
    expect(getDirectory("product-hunt")?.name).toBe("Product Hunt");
    expect(getDirectory("does-not-exist")).toBeUndefined();
  });

  it("every directory has a valid automation class", () => {
    for (const d of DIRECTORIES) {
      expect(["auto", "assisted", "manual"]).toContain(d.automationClass);
    }
  });
});

describe("opportunityScore", () => {
  it("rewards higher domain authority, all else equal", () => {
    const base = getDirectory("alternativeto")!; // DA 85, assisted, free
    const lower = { ...base, domainAuthority: 40 };
    expect(opportunityScore(base)).toBeGreaterThan(opportunityScore(lower));
  });

  it("gives automated directories an effort edge over manual ones", () => {
    const auto = { ...getDirectory("startupbase")!, automationClass: "auto" as const };
    const manual = { ...auto, automationClass: "manual" as const };
    expect(opportunityScore(auto)).toBeGreaterThan(opportunityScore(manual));
  });
});

describe("rankedForCampaign", () => {
  it("returns directories sorted by opportunity score, descending", () => {
    const ranked = rankedForCampaign();
    for (let i = 1; i < ranked.length; i++) {
      expect(opportunityScore(ranked[i - 1])).toBeGreaterThanOrEqual(opportunityScore(ranked[i]));
    }
  });

  it("freeOnly excludes paid directories", () => {
    const free = rankedForCampaign({ freeOnly: true });
    expect(free.every((d) => d.pricing.model !== "paid")).toBe(true);
  });
});

describe("catalogStats", () => {
  it("class counts sum to the total", () => {
    const s = catalogStats();
    expect(s.byClass.auto + s.byClass.assisted + s.byClass.manual).toBe(s.total);
    expect(s.byClass.auto).toBe(byAutomationClass("auto").length);
  });
});
