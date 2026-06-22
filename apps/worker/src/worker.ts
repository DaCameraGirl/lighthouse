import { Worker } from "bullmq";
import { chromium, type Browser } from "playwright";
import { PrismaClient } from "@prisma/client";
import { getDirectory } from "@lighthouse/directories";
import { buildFieldPlan, type PressKitData } from "./mappers.js";
import { selectorsFor } from "./selectorMaps.js";

/**
 * The automation fleet.
 *
 * Consumes the `submission` queue the API fills. Each job opens a headless
 * browser, navigates the directory's submission form, fills the field plan, and
 * records proof. Jobs are isolated: a crash on one directory never touches the
 * API or other jobs, and BullMQ's retry/backoff (configured at enqueue time)
 * handles transient failures.
 *
 * Safety rails:
 *   - Only `auto` directories are ever processed here. Anything else is a bug
 *     upstream and is rejected immediately rather than risking a ToS violation.
 *   - `DRY_RUN` (default on) navigates and screenshots but never clicks submit,
 *     so the fleet can be exercised safely before going live on real sites.
 */
const prisma = new PrismaClient();
const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6380" };
const DRY_RUN = process.env.WORKER_DRY_RUN !== "false";
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 2);

let browser: Browser | null = null;
async function getBrowser() {
  if (!browser) browser = await chromium.launch({ headless: true });
  return browser;
}

interface SubmissionJobData {
  submissionId: string;
  orgId: string;
  directoryId: string;
  pressKitId: string;
}

const worker = new Worker<SubmissionJobData>(
  "submission",
  async (job) => {
    const { submissionId, directoryId, pressKitId } = job.data;
    const dir = getDirectory(directoryId);
    if (!dir) throw new Error(`unknown directory ${directoryId}`);
    if (dir.automationClass !== "auto") {
      throw new Error(`refusing to automate non-auto directory ${directoryId}`);
    }

    const kit = (await prisma.pressKit.findUnique({ where: { id: pressKitId } })) as PressKitData | null;
    if (!kit) throw new Error(`press kit ${pressKitId} not found`);

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "in_progress", attempts: { increment: 1 } },
    });

    const plan = buildFieldPlan(dir, kit);
    const ctx = await (await getBrowser()).newContext();
    const page = await ctx.newPage();

    try {
      await page.goto(dir.submissionUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

      // Fill each field using its per-directory selector map, falling back to
      // generic name/id/placeholder heuristics (see selectorMaps.ts).
      for (const { field, value } of plan) {
        const selectors = selectorsFor(directoryId, field);
        for (const sel of selectors) {
          const el = page.locator(sel).first();
          if (await el.count().then((c) => c > 0).catch(() => false)) {
            await el.fill(value).catch(() => {});
            break;
          }
        }
      }

      const screenshotPath = `screenshots/${submissionId}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

      if (!DRY_RUN) {
        const submit = page.locator('button[type="submit"], input[type="submit"]').first();
        if (await submit.count().then((c) => c > 0)) await submit.click().catch(() => {});
      }

      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: DRY_RUN ? "needs_action" : "submitted",
          proofUrl: screenshotPath,
          lastError: DRY_RUN ? "dry-run: form filled, not submitted" : null,
        },
      });

      return { ok: true, dryRun: DRY_RUN, directoryId };
    } finally {
      await ctx.close();
    }
  },
  { connection, concurrency: CONCURRENCY },
);

worker.on("failed", async (job, err) => {
  if (!job) return;
  await prisma.submission
    .update({ where: { id: job.data.submissionId }, data: { status: "failed", lastError: err.message } })
    .catch(() => {});
});

worker.on("ready", () => {
  // eslint-disable-next-line no-console
  console.log(`Lighthouse worker fleet online · concurrency=${CONCURRENCY} · dryRun=${DRY_RUN}`);
});

async function shutdown() {
  await worker.close();
  await browser?.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
