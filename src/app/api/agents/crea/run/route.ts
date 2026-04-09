import { NextResponse } from "next/server";
import { runCreaAgent } from "@/services/agents/crea-agent";

export async function POST() {
  const result = await runCreaAgent();
  return NextResponse.json(result);
}
