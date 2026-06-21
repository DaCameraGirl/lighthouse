import type { DirectoryField } from "@lighthouse/core";

/**
 * Per-directory CSS selector maps for the auto-class directories.
 *
 * The worker tries the explicit map for a directory first and falls back to the
 * generic name/id/placeholder heuristics when a field has no mapped selector or
 * the mapped selector isn't found. Keeping these in one file means updating a
 * directory's form is a localized edit, not a worker rewrite.
 *
 * Only `auto` directories need entries here — `assisted`/`manual` go to the
 * human cockpit, which never runs Playwright.
 */
export type SelectorMap = Partial<Record<DirectoryField, string>>;

export const SELECTOR_MAPS: Record<string, SelectorMap> = {
  startupbase: {
    name: 'input[name="product[name]"]',
    url: 'input[name="product[url]"]',
    tagline: 'input[name="product[tagline]"]',
    description: 'textarea[name="product[description]"]',
  },
  "launching-next": {
    name: 'input[name="name"]',
    url: 'input[name="url"]',
    tagline: 'input[name="tagline"]',
    description: 'textarea[name="description"]',
    founderName: 'input[name="founder"]',
    email: 'input[name="email"]',
  },
  betapage: {
    name: 'input#startup_name',
    url: 'input#startup_url',
    tagline: 'input#startup_tagline',
    description: 'textarea#startup_description',
  },
  sideprojectors: {
    name: 'input[name="title"]',
    url: 'input[name="website"]',
    tagline: 'input[name="short_description"]',
    description: 'textarea[name="description"]',
  },
  "producthunt-alternatives": {
    // 10words — very short-form
    name: 'input[name="name"]',
    url: 'input[name="url"]',
    tagline: 'input[name="description"]',
  },
  aitoolhunt: {
    name: 'input[name="tool_name"]',
    url: 'input[name="tool_url"]',
    tagline: 'input[name="tagline"]',
    description: 'textarea[name="description"]',
    category: 'select[name="category"]',
  },
};

/** Generic fallback selectors, tried when a field has no mapped selector. */
export function heuristicSelectors(field: DirectoryField): string[] {
  return [
    `input[name*="${field}" i]`,
    `textarea[name*="${field}" i]`,
    `input[id*="${field}" i]`,
    `textarea[id*="${field}" i]`,
    `input[placeholder*="${field}" i]`,
  ];
}

/** Ordered selector candidates for a field: explicit map first, then heuristics. */
export function selectorsFor(directoryId: string, field: DirectoryField): string[] {
  const mapped = SELECTOR_MAPS[directoryId]?.[field];
  return mapped ? [mapped, ...heuristicSelectors(field)] : heuristicSelectors(field);
}
