import { NextResponse } from "next/server";
import { runEmailAgent } from "@/services/agents/email-agent";

export async function POST() {
  const result = await runEmailAgent();
  return NextResponse.json(result);
}
