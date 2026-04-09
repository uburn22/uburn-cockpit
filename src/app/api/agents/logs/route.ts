import { NextRequest, NextResponse } from "next/server";
import { getRecentLogs } from "@/services/agents/base";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agent = searchParams.get("agent") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const logs = await getRecentLogs(limit, agent);
  return NextResponse.json(logs);
}
