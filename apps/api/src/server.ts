import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { BRAND } from "@lighthouse/core";
import { authenticate } from "./auth.js";
import { authRoutes } from "./routes/auth.js";
import { directoryRoutes } from "./routes/directories.js";
import { pressKitRoutes } from "./routes/pressKits.js";
import { submissionRoutes } from "./routes/submissions.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { aiRoutes } from "./routes/ai.js";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });

  app.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-secret-not-for-prod" });

  app.get("/health", async () => ({ ok: true, service: `${BRAND.name} API`, version: "0.1.0" }));

  // Public: auth endpoints + the static catalog.
  app.register(authRoutes, { prefix: "/api" });
  app.register(directoryRoutes, { prefix: "/api" });

  // Protected: everything tenant-scoped sits behind a JWT guard.
  app.register(
    async (secure) => {
      secure.addHook("preHandler", authenticate);
      secure.register(pressKitRoutes);
      secure.register(submissionRoutes);
      secure.register(analyticsRoutes);
      secure.register(aiRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const app = buildServer();
  const port = Number(process.env.API_PORT ?? 4000);
  app
    .listen({ port, host: "0.0.0.0" })
    .then(() => app.log.info(`${BRAND.name} API on :${port}`))
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
