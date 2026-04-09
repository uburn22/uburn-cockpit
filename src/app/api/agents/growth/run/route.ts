import { NextResponse } from "next/server";
import { runGrowthAgent } from "@/services/agents/growth-agent";

export async function POST() {
  const result = await runGrowthAgent();
  return NextResponse.json(result);
}
