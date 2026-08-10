import { NextResponse } from "next/server";
import { getSearchService } from "@/backend/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const suggestions = await getSearchService().suggest(q);
  return NextResponse.json(suggestions);
}
