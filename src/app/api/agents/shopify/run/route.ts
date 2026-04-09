import { NextResponse } from "next/server";
import { runShopifyAgent } from "@/services/agents/shopify-agent";

export async function POST() {
  const result = await runShopifyAgent();
  return NextResponse.json(result);
}
