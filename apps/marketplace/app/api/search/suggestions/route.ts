import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const suggestions = await getSearchSuggestions(q);
  return NextResponse.json({ suggestions });
}
