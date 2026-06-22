import type { FastifyInstance } from "fastify";
import type { PressKit } from "@lighthouse/core";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireOrg } from "../auth.js";

/**
 * The DB stores press kits flat (taglineMedium, descShort, …) for simple,
 * cross-compatible columns; the API contract (@lighthouse/core PressKit) is
 * nested. `flatten` is the write direction; `serialize` is the read direction,
 * rebuilding the nested shape the web app expects. Without this, the cockpit
 * reads `kit.taglines.medium` off a flat row and crashes on undefined.
 */
type PressKitRow = Awaited<ReturnType<typeof prisma.pressKit.create>>;

function serialize(row: PressKitRow): PressKit {
  return {
    id: row.id,
    orgId: row.orgId,
    productName: row.productName,
    url: row.url,
    category: row.category as PressKit["category"],
    founderName: row.founderName,
    email: row.email,
    twitter: row.twitter ?? undefined,
    taglines: { short: row.taglineShort, medium: row.taglineMedium, long: row.taglineLong },
    descriptions: { short: row.descShort, medium: row.descMedium, long: row.descLong },
    logos: { square: row.logoSquare ?? undefined, wide: row.logoWide ?? undefined, icon: row.logoIcon ?? undefined },
  };
}

const pressKitInput = z.object({
  productName: z.string().min(1),
  url: z.string().url(),
  category: z.string().min(1),
  founderName: z.string().min(1),
  email: z.string().email(),
  twitter: z.string().optional(),
  taglines: z.object({ short: z.string(), medium: z.string(), long: z.string() }),
  descriptions: z.object({ short: z.string(), medium: z.string(), long: z.string() }),
  logos: z
    .object({ square: z.string().optional(), wide: z.string().optional(), icon: z.string().optional() })
    .default({}),
});

function flatten(input: z.infer<typeof pressKitInput>, orgId: string) {
  return {
    orgId,
    productName: input.productName,
    url: input.url,
    category: input.category,
    founderName: input.founderName,
    email: input.email,
    twitter: input.twitter,
    taglineShort: input.taglines.short,
    taglineMedium: input.taglines.medium,
    taglineLong: input.taglines.long,
    descShort: input.descriptions.short,
    descMedium: input.descriptions.medium,
    descLong: input.descriptions.long,
    logoSquare: input.logos.square,
    logoWide: input.logos.wide,
    logoIcon: input.logos.icon,
  };
}

export async function pressKitRoutes(app: FastifyInstance) {
  app.get("/press-kits", async (req) => {
    const orgId = requireOrg(req);
    const rows = await prisma.pressKit.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
    return rows.map(serialize);
  });

  app.post("/press-kits", async (req, reply) => {
    const orgId = requireOrg(req);
    const parsed = pressKitInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    return serialize(await prisma.pressKit.create({ data: flatten(parsed.data, orgId) }));
  });

  app.put("/press-kits/:id", async (req, reply) => {
    const orgId = requireOrg(req);
    const { id } = req.params as { id: string };
    const parsed = pressKitInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    const existing = await prisma.pressKit.findFirst({ where: { id, orgId } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    return serialize(await prisma.pressKit.update({ where: { id }, data: flatten(parsed.data, orgId) }));
  });
}
