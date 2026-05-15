import app from "./app";
import { logger } from "./lib/logger";
import { startReviewScheduler } from "./lib/review-scheduler";

const port = Number(process.env["PORT"] ?? 10000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Phase 2C+: kick off background scheduler that auto-completes jobs and
  // fires review-request SMS after REVIEW_REQUEST_DELAY_HOURS (default 3h).
  // Disable per-deploy with REVIEW_SCHEDULER_DISABLED=true.
  startReviewScheduler();
});
