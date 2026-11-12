# StoneB2B — Background Worker Production Deployment Plan

**Application:** `@stone/worker` (`apps/worker`)  
**Phase:** B6 Deployment Preflight  
**Execution Date:** 2026-11-12  
**Current State:** Scaffold complete (`src/index.ts`, `src/lib/email.ts`)  
**Production Goal:** Autonomous, resilient, long-running background job processor  

---

## 1. Architectural Overview

In the StoneB2B four-app architecture, user-facing Next.js applications (`marketplace`, `buyer`, `seller`, `admin`) are hosted as serverless applications on Vercel. 

However, critical B2B e-commerce workloads require asynchronous background execution:
1. **Atomic Lead Distribution:** Matching buyer RFQs to verified suppliers based on category, location, and subscription quotas.
2. **Transactional & Batch Email Dispatch:** RFQ alerts, magic link notifications, seller verification updates.
3. **Catalog & Search Indexing:** Synchronizing product catalog and seller metadata into search engines or full-text indices.
4. **Subscription Quota & Billing Lifecycle:** Monthly lead resets, quota replenishment, subscription status synchronization.
5. **Analytics & Metrics Rollups:** Daily transaction aggregations, buyer activity metrics, supplier performance scoring.

Because Vercel Serverless Functions have execution duration caps (15s to 60s) and cannot maintain persistent state, connection pools, or long-lived queue listeners, `@stone/worker` is architected as an **independent, long-running Node.js worker service**.

---

## 2. Recommended Hosting Platform Comparison

| Platform | Worker Suitability | Cost (Starter) | Zero-Downtime Deploys | Operational Complexity | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Railway** | **Highest** | \$5 - \$10 / mo | Native (healthcheck-based) | Low (Git push deploy, built-in Redis) | **Primary Recommendation** |
| **Render** | High | \$7 / mo | Native Background Worker service | Low (Dedicated Background Worker type) | Strong Alternative |
| **Fly.io** | High | \$5 / mo | Native Docker/Machines | Medium (CLI-driven, requires flyctl) | Good Alternative |
| **AWS ECS Fargate** | Enterprise Grade | \$25+ / mo | Native rolling updates | High (VPC, IAM, ECR, CloudWatch, ALB) | Future Scale (> 50k DAU) |

### Hosting Decision: Railway / Render
- **Why Railway / Render:** Both provide dedicated background worker primitives that do not expose public HTTP ports (or only expose internal health check ports), preventing accidental external web traffic. They support long-running event loops, persistent TCP connections to Redis and Postgres, and native `SIGTERM` signaling during deploys.
- **Vercel Incompatibility:** Vercel cannot run persistent long-running background daemons. Background jobs cannot run as indefinite loops in Vercel Serverless Functions.

---

## 3. Dedicated Worker vs. Vercel Cron Comparison

| Dimension | Dedicated Worker (`apps/worker` on Railway/Render) | Vercel Cron Jobs (`/api/cron/*` on Vercel) |
| :--- | :--- | :--- |
| **Execution Trigger** | Event-driven via Redis queues (instant sub-second dispatch) | Schedule-driven via cron expression (e.g. `* * * * *` once per minute) |
| **Execution Duration** | Unlimited (can process 10,000 items over 20 minutes) | Strictly capped (10s on Hobby, 60s on Pro, 300s on Enterprise) |
| **Concurrency & Throttling** | Fine-grained per-queue concurrency (e.g. max 5 emails/sec to prevent SMTP rate-limits) | Bursty; all invocations execute concurrently without inherent queue limits |
| **Connection Overhead** | Persistent connection pool to Postgres and Redis | Ephemeral connections per invocation (high connection churn on DB) |
| **Failure Recovery** | Automatic retry with exponential backoff & Dead-Letter Queues | Fails silently unless external monitoring / Sentry logs the HTTP 500 |
| **Best Used For** | Real-time lead routing, transactional emails, data synchronization | Periodic scheduled housekeeping (e.g. midnight cleanup, daily summaries) |

**Architectural Decision:**
- **Hybrid Approach:**
  - High-frequency, event-driven jobs (leads, emails, indexing) are executed by `@stone/worker` via BullMQ/Redis.
  - Vercel Cron is reserved exclusively for initiating scheduled heartbeats or triggering outbox polling if external queue triggers are idle.

---

## 4. Redis Connection & Connection Pooling

The worker engine uses **BullMQ** on top of **ioredis**.

### Redis Infrastructure
- **Provider:** Managed Redis instance (Railway Redis, Upstash Redis, or Redis Cloud).
- **Connection Mode:** Persistent TLS connection (`rediss://`).
- **Connection Configuration:**

```typescript
// apps/worker/src/lib/redis.ts
import { Redis, type RedisOptions } from "ioredis";

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  tls: process.env.NODE_ENV === "production" ? {} : undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  connectTimeout: 10000,
};

export const redisConnection = new Redis(process.env.REDIS_URL!, redisOptions);
```

---

## 5. Queue Definitions & Concurrency Model

Five primary BullMQ queues are partitioned to prevent noisy-neighbor starvation:

```
┌────────────────────────────────────────────────────────┐
│                   BullMQ Queues                        │
├───────────────────────┬─────────────┬──────────────────┤
│ Queue Name            │ Concurrency │ Priority Level   │
├───────────────────────┼─────────────┼──────────────────┤
│ lead-distribution     │ 10          │ High (P1)        │
│ email-notifications   │ 5           │ High (P2)        │
│ search-indexing       │ 3           │ Medium (P3)      │
│ subscription-lifecycle│ 2           │ Medium (P4)      │
│ analytics-aggregation │ 1           │ Low (P5)         │
└───────────────────────┴─────────────┴──────────────────┘
```

### Detailed Queue Specifications

#### 1. `lead-distribution`
- **Purpose:** Atomically assigns incoming buyer inquiries/RFQs to eligible verified sellers.
- **Triggers:** New enquiry submitted via Marketplace or Buyer portal.
- **Safety:** Calls PostgreSQL RPC `assign_enquiry_to_sellers` with atomic balance deduction.
- **Concurrency:** 10 concurrent jobs.

#### 2. `email-notifications`
- **Purpose:** Dispatches transactional emails (Resend / AWS SES) to buyers, sellers, and administrators.
- **Rate-Limiting:** Throttled to 10 emails/second to comply with SMTP provider limits.
- **Concurrency:** 5 concurrent jobs.

#### 3. `search-indexing`
- **Purpose:** Syncs newly approved or updated products and supplier profiles into Postgres full-text search (`tsvector`) or Meilisearch/Algolia.
- **Debounce:** Batched with 500ms debounce to prevent burst rebuilds during bulk product uploads.
- **Concurrency:** 3 concurrent jobs.

#### 4. `subscription-lifecycle`
- **Purpose:** Handles monthly lead allocation resets on seller billing cycles.
- **Schedule:** Nightly evaluation of expiring cycles and automated quota refresh.
- **Concurrency:** 2 concurrent jobs.

#### 5. `analytics-aggregation`
- **Purpose:** Compiles aggregated platform analytics (daily active inquiries, average quote response time).
- **Schedule:** Hourly / daily rollups.
- **Concurrency:** 1 background job.

---

## 6. Retry Strategy, Backoff & Idempotency

### Retry Policy
All jobs adhere to exponential backoff with jitter to prevent thundering herd problems on external APIs:

```typescript
const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2000, // Initial delay: 2s -> 4s -> 8s -> 16s -> 32s
  },
  removeOnComplete: {
    age: 86400, // Keep completed job history for 24h
    count: 5000,
  },
  removeOnFail: {
    age: 604800, // Keep failed jobs for 7 days for DLQ inspection
  },
};
```

### Duplicate Job Prevention (Idempotency Keys)
Every job requires a deterministic `jobId`:
- **Lead Distribution:** `lead-dist:${enquiry_id}`
- **Email Notification:** `email:${notification_type}:${recipient_user_id}:${entity_id}`
- **Search Indexing:** `index:product:${product_id}:${version_timestamp}`
- **Subscription Quota Reset:** `quota-reset:${seller_id}:${billing_period_start}`

If a duplicate event is dispatched while a job is already queued or active, BullMQ discards the redundant task automatically.

---

## 7. Graceful Shutdown & Process Lifecycle

When the worker container receives a termination signal (`SIGTERM` or `SIGINT`) during rolling deployment:

```typescript
// apps/worker/src/lifecycle.ts
async function gracefulShutdown(signal: string) {
  console.info(`[worker] Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new jobs from queues
  await Promise.all(workers.map((w) => w.pause()));

  // 2. Wait up to 30 seconds for active jobs to finish
  await Promise.all(workers.map((w) => w.close()));

  // 3. Disconnect Redis and DB connections
  await redisConnection.quit();
  await dbPool.end();

  console.info("[worker] Graceful shutdown complete. Exiting cleanly.");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

---

## 8. Dead-Letter Queue (DLQ) & Observability

### Dead-Letter Handling
- Jobs failing all 5 attempts are automatically transitioned to the `failed` state.
- A BullMQ event listener captures terminal failures and emits a critical alert to Sentry / Slack.
- **DLQ Admin Inspection:** Bull-Board (`@bull-board/api`) is integrated into an internal route or admin tool, allowing authorized operators to inspect the failure stack trace, payload, and manually trigger job replay.

### Health Monitoring
- A lightweight internal HTTP health endpoint (`/healthz`) runs on port 8080:
  - Verifies Redis connectivity (`PING`).
  - Verifies Postgres connectivity (`SELECT 1`).
  - Returns HTTP 200 if healthy, HTTP 503 if disconnected.
- Container orchestrators (Railway / Render / Docker) query `/healthz` every 15 seconds. Unhealthy containers are automatically restarted.

---

## 9. Deployment Configuration for Railway / Docker

### Containerfile (`apps/worker/Dockerfile`)

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.2 --activate

WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

RUN pnpm install --frozen-lockfile --filter @stone/worker...
RUN pnpm --filter @stone/worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app ./

CMD ["node", "apps/worker/dist/index.js"]
```

---

## 10. Summary

The background worker architecture guarantees that the four user-facing Vercel applications remain lean, responsive, and serverless, while heavy transactional and scheduled workflows run continuously with enterprise-grade durability and zero data loss.

