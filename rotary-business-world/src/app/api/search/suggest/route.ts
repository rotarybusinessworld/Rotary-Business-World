import { NextResponse } from "next/server";
import { getSearchService } from "@/backend/search";
import { checkRateLimit } from "@/backend/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // 200/60s per IP — catches scrapers (3+ req/s constant) while being safe
  // for Indian CGNAT carriers where many users share one public IP.
  const { allowed } = await checkRateLimit(`suggest:${ip}`, 200, 60);
  if (!allowed) return NextResponse.json([], { status: 429 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const industry = searchParams.get("industry") ?? undefined;
  const suggestions = await getSearchService().suggest(q, industry);
  return NextResponse.json(suggestions);
}
