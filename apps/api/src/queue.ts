import { Queue } from "bullmq";

/**
 * The submission queue — the seam between the API and the worker fleet.
 *
 * The API only ever *enqueues* automation jobs; it never runs Playwright itself.
 * That isolation is what keeps fragile browser automation from ever blocking or
 * crashing the user-facing API.
 */
const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6380",
};

export const SUBMISSION_QUEUE = "submission";

export const submissionQueue = new Queue(SUBMISSION_QUEUE, { connection });

export interface SubmissionJob {
  submissionId: string;
  orgId: string;
  directoryId: string;
  pressKitId: string;
}

export async function enqueueSubmission(job: SubmissionJob) {
  return submissionQueue.add("submit", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
