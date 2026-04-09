import { NextResponse } from "next/server";
import { runSendcloudAgent } from "@/services/agents/sendcloud-agent";

export async function POST() {
  const result = await runSendcloudAgent();
  return NextResponse.json(result);
}
