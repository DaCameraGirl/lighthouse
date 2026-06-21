import type { FastifyRequest } from "fastify";

/**
 * Org resolution for multi-tenancy.
 *
 * In production the orgId comes from a verified JWT (see server.ts `@fastify/jwt`).
 * For local dev without auth wired up, we fall back to an `x-org-id` header so the
 * cockpit can be exercised end-to-end before login lands. The fallback is gated on
 * NODE_ENV so it can never be relied on in production.
 */
export function requireOrg(req: FastifyRequest): string {
  const user = (req as FastifyRequest & { user?: { orgId?: string } }).user;
  if (user?.orgId) return user.orgId;

  if (process.env.NODE_ENV !== "production") {
    const header = req.headers["x-org-id"];
    if (typeof header === "string" && header) return header;
  }

  const err = new Error("unauthorized") as Error & { statusCode?: number };
  err.statusCode = 401;
  throw err;
}
