import Anthropic from "@anthropic-ai/sdk";

/**
 * Lazy Anthropic client. Constructed only when an API key is present so the API
 * boots fine without one — the AI routes return a clean 503 instead of crashing.
 */
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client = new Anthropic();
  return client;
}

// Default to the most capable current model; overridable via env.
export const COPY_MODEL = process.env.LIGHTHOUSE_COPY_MODEL ?? "claude-opus-4-8";

export interface TailorInput {
  directoryName: string;
  directoryCategory: string;
  productName: string;
  baseTagline: string;
  baseDescription: string;
}

/**
 * Rewrite a press kit's tagline + description to fit one directory's audience.
 * A single Messages API call — this is a bounded rewrite, not an agentic task,
 * so no tool loop or thinking config is needed.
 */
export async function tailorCopy(input: TailorInput): Promise<{ tagline: string; description: string }> {
  const anthropic = getAnthropic();
  if (!anthropic) throw new Error("no_api_key");

  const system =
    "You tailor a startup's marketing copy for a specific directory listing. " +
    "Keep the product's facts accurate — never invent features, metrics, or claims. " +
    "Match the directory's audience and tone. Return ONLY minified JSON of the form " +
    '{"tagline": "...", "description": "..."} with no surrounding prose or code fences.';

  const user =
    `Directory: ${input.directoryName} (category: ${input.directoryCategory})\n` +
    `Product: ${input.productName}\n` +
    `Current tagline: ${input.baseTagline}\n` +
    `Current description: ${input.baseDescription}\n\n` +
    `Rewrite the tagline (<=120 chars) and description (~100 words) for this directory's audience.`;

  const response = await anthropic.messages.create({
    model: COPY_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  try {
    const parsed = JSON.parse(text) as { tagline?: string; description?: string };
    return {
      tagline: parsed.tagline ?? input.baseTagline,
      description: parsed.description ?? input.baseDescription,
    };
  } catch {
    // Model returned prose instead of JSON — fall back to the base copy rather than failing.
    return { tagline: input.baseTagline, description: input.baseDescription };
  }
}
