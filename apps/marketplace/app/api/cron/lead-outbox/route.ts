import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAdminClient } from "@stone/database/admin";
import {
  retryFailedLeadNotifications,
  type SupabaseMatchClient,
} from "@/features/matching/supplier-matching";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Concurrency guard to prevent overlapping execution of the lead outbox worker.
 */
let isExecutionInProgress = false;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  // In non-production local development without a set secret, permit local invocations
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return true;
    }
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === secret) return true;
  }

  const customHeader = request.headers.get("x-cron-secret");
  if (customHeader && customHeader.trim() === secret) return true;

  return false;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleCron(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCron(request);
}

async function handleCron(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // 1. Authorization Check
  if (!isAuthorized(request)) {
    console.warn("[LeadOutboxCron] Unauthorized request rejected.");
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 },
    );
  }

  // 2. Overlap Prevention / Concurrency Lock
  if (isExecutionInProgress) {
    console.warn("[LeadOutboxCron] Previous worker run still in progress. Skipping overlapping run.");
    return NextResponse.json(
      {
        message: "Previous worker execution currently in progress. Overlapping run skipped.",
        skipped: true,
      },
      { status: 429 },
    );
  }

  isExecutionInProgress = true;
  console.log("[LeadOutboxCron] Starting lead outbox retry job...");

  try {
    const supabaseAdmin = createAdminClient();
    const result = await retryFailedLeadNotifications(
      supabaseAdmin as unknown as SupabaseMatchClient,
    );

    const durationMs = Date.now() - startTime;
    console.log("[LeadOutboxCron] Finished outbox retry job successfully", {
      durationMs,
      retried: result.retried,
      succeeded: result.succeeded,
      failed: result.failed,
    });

    return NextResponse.json({
      success: true,
      durationMs,
      timestamp: new Date().toISOString(),
      stats: result,
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[LeadOutboxCron] Fatal error during outbox retry execution", {
      durationMs,
      error: msg,
    });

    return NextResponse.json(
      {
        success: false,
        durationMs,
        error: msg,
      },
      { status: 500 },
    );
  } finally {
    isExecutionInProgress = false;
  }
}
