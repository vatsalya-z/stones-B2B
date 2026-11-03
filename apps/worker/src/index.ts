import { getEmailProvider } from "./lib/email.js";

/**
 * Worker entrypoint. Phase 1 scaffold only: queues, jobs and processors are
 * added in Phase 6 (notifications/email). BullMQ/Redis is deferred until job
 * volume justifies it; a Postgres-backed outbox is the planned first step.
 */
function main(): void {
  const provider = getEmailProvider();
  console.info(
    `[worker] started (email provider: ${provider.constructor === Object ? "configured" : "unknown"})`,
  );
}

main();
