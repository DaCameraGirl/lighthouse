import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../apps/api/src/server.js";

/**
 * Route-level tests via Fastify's in-process `inject` — no network, no DB.
 * These cover the auth boundary and validation, which run before any DB access.
 */
let app: FastifyInstance;

beforeAll(async () => {
  app = buildServer();
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe("API", () => {
  it("health is public and reports the service", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, service: "Lighthouse API" });
  });

  it("the directory catalog is public", async () => {
    const res = await app.inject({ method: "GET", url: "/api/directories/stats" });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBeGreaterThan(0);
  });

  it("tenant routes reject unauthenticated requests with 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/press-kits" });
    expect(res.statusCode).toBe(401);
  });

  it("signup validates its input (400 on a bad body)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email: "not-an-email", password: "short" },
    });
    expect(res.statusCode).toBe(400);
  });
});
