import { describe, it, expect } from "vitest";
import { valueForField, buildFieldPlan, type PressKitData } from "../apps/worker/src/mappers.js";
import { getDirectory } from "@lighthouse/directories";

const kit: PressKitData = {
  productName: "Acme",
  url: "https://acme.test",
  category: "saas",
  founderName: "Ada",
  email: "ada@acme.test",
  twitter: "@acme",
  taglineShort: "short",
  taglineMedium: "medium tagline",
  taglineLong: "long",
  descShort: "short desc",
  descMedium: "medium desc",
  descLong: "long desc",
};

describe("valueForField", () => {
  it("maps fields to the right copy length", () => {
    expect(valueForField("name", kit)).toBe("Acme");
    expect(valueForField("tagline", kit)).toBe("medium tagline");
    expect(valueForField("description", kit)).toBe("medium desc");
    expect(valueForField("email", kit)).toBe("ada@acme.test");
  });

  it("returns empty string for out-of-band fields (logo, pricing)", () => {
    expect(valueForField("logo", kit)).toBe("");
    expect(valueForField("pricing", kit)).toBe("");
  });
});

describe("buildFieldPlan", () => {
  it("only includes fields the directory asks for, with non-empty values", () => {
    const dir = getDirectory("startupbase")!; // name,url,tagline,description,logo
    const plan = buildFieldPlan(dir, kit);
    const fields = plan.map((p) => p.field);
    expect(fields).toContain("name");
    expect(fields).toContain("description");
    expect(fields).not.toContain("logo"); // logo resolves to "" and is filtered out
    expect(plan.every((p) => p.value.length > 0)).toBe(true);
  });
});
