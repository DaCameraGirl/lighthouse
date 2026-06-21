import type { FastifyInstance } from "fastify";
import { getDirectory } from "@lighthouse/directories";
import { prisma } from "../db.js";
import { requireOrg } from "../auth.js";

/**
 * Analytics close the loop the outsourced services only gesture at: which
 * listings are live, the estimated backlink authority earned, and coverage by
 * category. Backlink "value" is derived from the catalog's domain authority of
 * directories where status === LIVE — an honest proxy, not invented traffic.
 */
export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics/overview", async (req) => {
    const orgId = requireOrg(req);
    const submissions = await prisma.submission.findMany({ where: { orgId } });

    const byStatus = submissions.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {});

    const live = submissions.filter((s) => s.status === "LIVE");
    const backlinkAuthority = live.reduce((sum, s) => {
      const dir = getDirectory(s.directoryId);
      return sum + (dir?.domainAuthority ?? 0);
    }, 0);

    const referringDomains = live.length;

    return {
      total: submissions.length,
      byStatus,
      liveListings: live.length,
      referringDomains,
      backlinkAuthority, // sum of DA across live listings — relative health metric
    };
  });
}
