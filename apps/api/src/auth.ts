import type { FastifyReply, FastifyRequest } from "fastify";

/** Shape of our signed JWT payload. */
export interface AuthPayload {
  userId: string;
  orgId: string;
  role: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthPayload;
    user: AuthPayload;
  }
}

/**
 * preHandler that rejects unauthenticated requests. Registered as the
 * `authenticate` decorator in server.ts and attached to protected routes.
 */
export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
}

/**
 * Resolve the caller's org from the verified JWT. Protected routes run behind
 * `authenticate`, so `req.user` is always populated here; the throw is a
 * defensive guard, not an expected path.
 */
export function requireOrg(req: FastifyRequest): string {
  const orgId = req.user?.orgId;
  if (!orgId) {
    const err = new Error("unauthorized") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }
  return orgId;
}
