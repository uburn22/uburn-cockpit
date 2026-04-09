import { NextRequest, NextResponse } from "next/server";
import { getAllConfigs, isDue } from "@/services/agents/base";
import { runMetaAdsAgent } from "@/services/agents/meta-ads-agent";
import { runShopifyAgent } from "@/services/agents/shopify-agent";
import { runSendcloudAgent } from "@/services/agents/sendcloud-agent";
import { runEmailAgent } from "@/services/agents/email-agent";
import { runGA4Agent } from "@/services/agents/ga4-agent";
import { runCreaAgent } from "@/services/agents/crea-agent";
import { runGrowthAgent } from "@/services/agents/growth-agent";
import { runContentAgent } from "@/services/agents/content-agent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AGENTS: Record<string, () => Promise<any>> = {
  "meta-ads": runMetaAdsAgent,
  shopify: runShopifyAgent,
  sendcloud: runSendcloudAgent,
  "email-crm": runEmailAgent,
  ga4: runGA4Agent,
  crea: runCreaAgent,
  growth: runGrowthAgent,
  content: runContentAgent,
};

export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await getAllConfigs();
  const results: Record<string, string[]> = {};

  for (const config of configs) {
    if (!isDue(config)) {
      results[config.agent_name] = ["Not due yet"];
      continue;
    }

    const runner = AGENTS[config.agent_name];
    if (!runner) {
      results[config.agent_name] = ["Unknown agent"];
      continue;
    }

    const result = await runner();
    results[config.agent_name] = result.actions || [result.message || "Done"];
  }

  return NextResponse.json({ ran_at: new Date().toISOString(), results });
}
