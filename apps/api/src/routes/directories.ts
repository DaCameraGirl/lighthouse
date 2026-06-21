import type { FastifyInstance } from "fastify";
import {
  DIRECTORIES,
  catalogStats,
  getDirectory,
  rankedForCampaign,
} from "@lighthouse/directories";

/**
 * Catalog routes. The directory catalog is curated static data (the asset),
 * served straight from the package — no DB round-trip needed.
 */
export async function directoryRoutes(app: FastifyInstance) {
  app.get("/directories", async (req) => {
    const { category, freeOnly, ranked } = req.query as {
      category?: string;
      freeOnly?: string;
      ranked?: string;
    };
    if (ranked === "true") {
      return rankedForCampaign({
        category: category as never,
        freeOnly: freeOnly === "true",
      });
    }
    let list = DIRECTORIES;
    if (category) list = list.filter((d) => d.category === category);
    if (freeOnly === "true") list = list.filter((d) => d.pricing.model !== "paid");
    return list;
  });

  app.get("/directories/stats", async () => catalogStats());

  app.get("/directories/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const dir = getDirectory(id);
    if (!dir) return reply.code(404).send({ error: "directory_not_found" });
    return dir;
  });
}
