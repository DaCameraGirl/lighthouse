-- Align persisted submission statuses with the lowercase SubmissionStatus
-- contract in @lighthouse/core. The API previously wrote uppercase values
-- (e.g. "NEEDS_ACTION"), which the lowercase-keyed web UI filtered out, so
-- launched submissions never appeared in the cockpit. Lowercase the column
-- default and normalize any rows already written.

ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'queued';

UPDATE "Submission" SET "status" = lower("status");
