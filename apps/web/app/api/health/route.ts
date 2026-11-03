import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness probe. Reveals nothing about configuration or secrets. */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
