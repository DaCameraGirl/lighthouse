# Lighthouse

**Enterprise startup directory submission & distribution platform.**

Lighthouse gets a startup listed across the directories, launch boards, and review
sites that actually drive discovery — then tracks the backlinks, referring domains,
and traffic that result. It is the in-house, multi-tenant alternative to outsourced
"submit my startup to 200+ directories" services: you own the data, the automation,
and the analytics.

> Working name. Rename lives in one place: `packages/core/src/brand.ts`.

---

## Why this exists

Outsourced submission services are a maintained directory list plus human labor,
sold behind unverifiable traffic claims. Lighthouse turns that into software:

- A **curated directory catalog** carrying the metadata that matters — domain
  authority, pricing, category, approval signals, and an *automation class* that
  says whether a directory can be filled by a bot or needs a human in the loop.
- A **submission engine** that is tiered, not all-or-nothing: automation-friendly
  directories are handled by a resilient worker fleet; captcha/login-gated ones are
  routed to a semi-automatic cockpit where the operator pastes pre-filled, AI-tailored
  copy in seconds.
- **Analytics** that close the loop: which listings went live, what backlinks landed,
  and how referring domains trend over time.

## Architecture

A monorepo of independently scalable tiers:

| Workspace | Stack | Responsibility |
|-----------|-------|----------------|
| `apps/web` | Vite + TypeScript | Press-kit studio, directory explorer, submission cockpit, analytics dashboards |
| `apps/api` | Fastify + Prisma + Postgres | Multi-tenant orgs & auth, press kits, directory catalog, submission records, REST API |
| `apps/worker` | Playwright + BullMQ/Redis | Automation fleet — fills automation-friendly directories with retry/backoff and screenshot proof |
| `packages/directories` | Curated dataset + loader | The asset: vetted directories with full metadata |
| `packages/core` | Shared TypeScript types | Single source of truth across every tier |

```
            ┌──────────────┐      REST       ┌──────────────┐
  Operator ─▶   apps/web    ├────────────────▶   apps/api    │
            └──────────────┘                 └──────┬───────┘
                                                    │ enqueue
                                            ┌───────▼───────┐
                                            │  Redis queue  │
                                            └───────┬───────┘
                                            ┌───────▼───────┐
                                            │  apps/worker  │ ─▶ directory sites
                                            │  (Playwright) │     (+ screenshot proof)
                                            └───────────────┘
```

## Submission tiers (automation class)

| Class | Meaning | Handled by |
|-------|---------|------------|
| `auto` | No captcha, no login, stable form | Worker fleet (fully automated) |
| `assisted` | Login or light friction | Cockpit (pre-filled, one human click) |
| `manual` | Captcha / review / paid gate | Cockpit (operator submits, tracks status) |

## Getting started

```bash
npm install
cp .env.example .env        # fill ANTHROPIC_API_KEY for AI copy tailoring
npm run db:up               # Postgres + Redis via docker compose
npm run db:migrate          # apply Prisma schema
npm run dev                 # all tiers in watch mode
```

Web cockpit: http://localhost:5173 · API: http://localhost:4000

## Status

Foundation in progress. Built incrementally, PR by PR — see the tracking issue.

## License

Proprietary — UNLICENSED. © Angela Hudson (DaCameraGirl).
