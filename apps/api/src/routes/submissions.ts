import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDirectory, rankedForCampaign } from "@lighthouse/directories";
import { prisma } from "../db.js";
import { requireOrg } from "../auth.js";
import { enqueueSubmission } from "../queue.js";

const campaignInput = z.object({
  pressKitId: z.string().min(1),
  /** Explicit directory ids, or omit to auto-select a ranked campaign. */
  directoryIds: z.array(z.string()).optional(),
  freeOnly: z.boolean().optional(),
  /** Cap the campaign size when auto-selecting. */
  limit: z.number().int().positive().max(100).optional(),
});

export async function submissionRoutes(app: FastifyInstance) {
  app.get("/submissions", async (req) => {
    const orgId = requireOrg(req);
    return prisma.submission.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
  });

  /**
   * Launch a campaign: create submission records for a press kit across a set of
   * directories, then route each by automation class. `auto` directories are
   * enqueued to the worker fleet immediately; everything else lands in the cockpit
   * as NEEDS_ACTION for a human to push through.
   */
  app.post("/campaigns", async (req, reply) => {
    const orgId = requireOrg(req);
    const parsed = campaignInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    const { pressKitId, directoryIds, freeOnly, limit } = parsed.data;

    const pressKit = await prisma.pressKit.findFirst({ where: { id: pressKitId, orgId } });
    if (!pressKit) return reply.code(404).send({ error: "press_kit_not_found" });

    const targets = directoryIds
      ? directoryIds.map(getDirectory).filter((d): d is NonNullable<typeof d> => Boolean(d))
      : rankedForCampaign({ freeOnly }).slice(0, limit ?? 15);

    const results = [];
    for (const dir of targets) {
      // Idempotent per (pressKit, directory) via the unique constraint.
      const submission = await prisma.submission.upsert({
        where: { pressKitId_directoryId: { pressKitId, directoryId: dir.id } },
        update: {},
        create: {
          orgId,
          pressKitId,
          directoryId: dir.id,
          status: dir.automationClass === "auto" ? "queued" : "needs_action",
        },
      });

      if (dir.automationClass === "auto" && submission.status === "queued") {
        await enqueueSubmission({ submissionId: submission.id, orgId, directoryId: dir.id, pressKitId });
      }
      results.push({ directoryId: dir.id, status: submission.status, route: dir.automationClass });
    }

    return { launched: results.length, results };
  });

  const statusUpdate = z.object({
    status: z.enum(["submitted", "live", "rejected", "needs_action", "failed"]),
    listingUrl: z.string().url().optional(),
  });

  /** Cockpit marks a manual/assisted submission's outcome. */
  app.patch("/submissions/:id", async (req, reply) => {
    const orgId = requireOrg(req);
    const { id } = req.params as { id: string };
    const parsed = statusUpdate.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    const existing = await prisma.submission.findFirst({ where: { id, orgId } });
    if (!existing) return reply.code(404).send({ error: "not_found" });
    return prisma.submission.update({ where: { id }, data: parsed.data });
  });
}
