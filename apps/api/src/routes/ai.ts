import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDirectory } from "@lighthouse/directories";
import { prisma } from "../db.js";
import { requireOrg } from "../auth.js";
import { getAnthropic, tailorCopy } from "../ai.js";

const tailorInput = z.object({
  pressKitId: z.string().min(1),
  directoryId: z.string().min(1),
});

export async function aiRoutes(app: FastifyInstance) {
  /** Rewrite a press kit's copy for a specific directory's audience (Claude). */
  app.post("/ai/tailor-copy", async (req, reply) => {
    const orgId = requireOrg(req);
    const parsed = tailorInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });

    if (!getAnthropic()) {
      return reply.code(503).send({ error: "ai_unconfigured", hint: "Set ANTHROPIC_API_KEY to enable copy tailoring." });
    }

    const dir = getDirectory(parsed.data.directoryId);
    if (!dir) return reply.code(404).send({ error: "directory_not_found" });

    const kit = await prisma.pressKit.findFirst({ where: { id: parsed.data.pressKitId, orgId } });
    if (!kit) return reply.code(404).send({ error: "press_kit_not_found" });

    try {
      const result = await tailorCopy({
        directoryName: dir.name,
        directoryCategory: dir.category,
        productName: kit.productName,
        baseTagline: kit.taglineMedium,
        baseDescription: kit.descMedium,
      });
      return result;
    } catch (e) {
      req.log.error(e);
      return reply.code(502).send({ error: "ai_failed" });
    }
  });
}
