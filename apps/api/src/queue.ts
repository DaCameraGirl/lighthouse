import { Queue } from "bullmq";

/**
 * The submission queue — the seam between the API and the worker fleet.
 *
 * Pluggable by environment: when REDIS_URL is set, automation jobs go onto a
 * real BullMQ queue for the Playwright worker fleet to consume. When it isn't
 * (zero-install local dev), the queue degrades to a no-op that leaves the
 * submission QUEUED — the API still boots and every other flow works; only the
 * actual browser automation waits for Redis + the worker to come online.
 *
 * Either way the API never runs Playwright itself, so fragile browser
 * automation can never block or crash the user-facing API.
 */
const redisUrl = process.env.REDIS_URL;

export const SUBMISSION_QUEUE = "submission";

let queue: Queue | null = null;
if (redisUrl) {
  queue = new Queue(SUBMISSION_QUEUE, { connection: { url: redisUrl } });
}

export interface SubmissionJob {
  submissionId: string;
  orgId: string;
  directoryId: string;
  pressKitId: string;
}

/** Returns true if the job was actually enqueued to a worker fleet. */
export async function enqueueSubmission(job: SubmissionJob): Promise<boolean> {
  if (!queue) {
    // eslint-disable-next-line no-console
    console.warn(
      `[queue] no REDIS_URL — submission ${job.submissionId} left QUEUED; start Redis + worker to process`,
    );
    return false;
  }
  await queue.add("submit", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
  return true;
}

export function queueEnabled(): boolean {
  return queue !== null;
}
