import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { authenticate } from "../auth.js";

const signupInput = z.object({
  orgName: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  /** Create an org + its first (OWNER) user, and return a token. */
  app.post("/auth/signup", async (req, reply) => {
    const parsed = signupInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    const { orgName, name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ error: "email_taken" });

    const passwordHash = await bcrypt.hash(password, 10);
    const org = await prisma.org.create({
      data: {
        name: orgName,
        users: { create: { name, email, passwordHash, role: "OWNER" } },
      },
      include: { users: true },
    });
    const user = org.users[0];
    const token = await reply.jwtSign({ userId: user.id, orgId: org.id, role: user.role });
    return { token, user: { id: user.id, name, email, role: user.role }, org: { id: org.id, name: orgName } };
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = loginInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: "invalid_credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

    const token = await reply.jwtSign({ userId: user.id, orgId: user.orgId, role: user.role });
    return { token, user: { id: user.id, name: user.name, email, role: user.role } };
  });

  /** Current user — used by the web app to restore a session. */
  app.get("/auth/me", { preHandler: [authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { org: true },
    });
    if (!user) return reply.code(404).send({ error: "not_found" });
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      org: { id: user.org.id, name: user.org.name },
    };
  });
}
