import { NextResponse } from "next/server";
import { runMetaAdsAgent } from "@/services/agents/meta-ads-agent";

export async function POST() {
  const result = await runMetaAdsAgent();
  return NextResponse.json(result);
}
