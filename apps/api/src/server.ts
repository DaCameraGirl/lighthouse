import Fastify from "fastify";
import cors from "@fastify/cors";
import { BRAND } from "@lighthouse/core";
import { directoryRoutes } from "./routes/directories.js";
import { pressKitRoutes } from "./routes/pressKits.js";
import { submissionRoutes } from "./routes/submissions.js";
import { analyticsRoutes } from "./routes/analytics.js";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });

  app.get("/health", async () => ({ ok: true, service: `${BRAND.name} API`, version: "0.1.0" }));

  app.register(directoryRoutes, { prefix: "/api" });
  app.register(pressKitRoutes, { prefix: "/api" });
  app.register(submissionRoutes, { prefix: "/api" });
  app.register(analyticsRoutes, { prefix: "/api" });

  return app;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
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
