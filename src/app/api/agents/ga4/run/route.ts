import { NextResponse } from "next/server";
import { runGA4Agent } from "@/services/agents/ga4-agent";

export async function POST() {
  const result = await runGA4Agent();
  return NextResponse.json(result);
}
