import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireOrg } from "../auth.js";

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
    return prisma.pressKit.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
  });

  app.post("/press-kits", async (req, reply) => {
    const orgId = requireOrg(req);
    const parsed = pressKitInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    return prisma.pressKit.create({ data: flatten(parsed.data, orgId) });
  });

  app.put("/press-kits/:id", async (req, reply) => {
    const orgId = requireOrg(req);
    const { id } = req.params as { id: string };
    const parsed = pressKitInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    const existing = await prisma.pressKit.findFirst({ where: { id, orgId } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    return prisma.pressKit.update({ where: { id }, data: flatten(parsed.data, orgId) });
  });
}
