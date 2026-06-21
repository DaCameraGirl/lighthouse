import type { Directory, DirectoryField } from "@lighthouse/core";

/**
 * A press kit, flattened from the DB row, as the worker receives it.
 */
export interface PressKitData {
  productName: string;
  url: string;
  category: string;
  founderName: string;
  email: string;
  twitter?: string;
  taglineShort: string;
  taglineMedium: string;
  taglineLong: string;
  descShort: string;
  descMedium: string;
  descLong: string;
}

/**
 * Resolve the value a given directory field should be filled with, picking the
 * right length of copy for the field. Centralizing this means both the worker
 * and the cockpit fill forms from one consistent mapping.
 */
export function valueForField(field: DirectoryField, kit: PressKitData): string {
  switch (field) {
    case "name":
      return kit.productName;
    case "url":
      return kit.url;
    case "tagline":
      return kit.taglineMedium;
    case "description":
      return kit.descMedium;
    case "category":
      return kit.category;
    case "founderName":
      return kit.founderName;
    case "email":
      return kit.email;
    case "twitter":
      return kit.twitter ?? "";
    case "logo":
    case "pricing":
      return ""; // handled out of band (file upload / structured)
    default:
      return "";
  }
}

/** The ordered field/value plan a directory submission needs. */
export function buildFieldPlan(dir: Directory, kit: PressKitData) {
  return dir.fields
    .map((field) => ({ field, value: valueForField(field, kit) }))
    .filter((f) => f.value !== "");
}
