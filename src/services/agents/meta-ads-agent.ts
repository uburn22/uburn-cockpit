import { subDays } from "date-fns";
import { logAction, getConfig, updateLastRun } from "./base";
import { getRealMetaAdsData } from "@/services/api/meta-ads";

const TOKEN = process.env.META_ACCESS_TOKEN;
const API_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

async function metaPost(path: string, params: Record<string, string>): Promise<void> {
  if (!TOKEN) return;
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(`${BASE}/${path}`, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta POST ${path}: ${res.status} ${text}`);
  }
}

export async function runMetaAdsAgent(): Promise<{ actions: string[] }> {
  const config = await getConfig("meta-ads");
  if (!config || !config.enabled) {
    return { actions: ["Agent meta-ads disabled"] };
  }

  const thresholds = config.thresholds;
  const roasPause = thresholds.roas_pause ?? 0.8;
  const roasScale = thresholds.roas_scale ?? 2.0;
  const scalePct = thresholds.scale_pct ?? 0.2;

  const range = { from: subDays(new Date(), 7), to: new Date() };
  const actions: string[] = [];

  try {
    const data = await getRealMetaAdsData(range);

    for (const c of data.creatives) {
      if (c.creative.status !== "ACTIVE") continue;

      // ROAS < threshold → pause
      if (c.totals.roas < roasPause && c.totals.spend > 5) {
        try {
          await metaPost(c.creative.id, { status: "PAUSED" });
          const msg = `Paused ${c.creative.name} (ROAS ${c.totals.roas.toFixed(2)}x < ${roasPause}x)`;
          actions.push(msg);
          await logAction("meta-ads", "pause_ad", { ad_id: c.creative.id, roas: c.totals.roas, name: c.creative.name }, "success");
        } catch (err) {
          const msg = `Failed to pause ${c.creative.name}: ${err}`;
          actions.push(msg);
          await logAction("meta-ads", "pause_ad_failed", { ad_id: c.creative.id, error: String(err) }, "error");
        }
      }

      // ROAS > threshold → scale +20%
      if (c.totals.roas >= roasScale && c.totals.spend > 10) {
        const msg = `Scale opportunity: ${c.creative.name} (ROAS ${c.totals.roas.toFixed(2)}x > ${roasScale}x) — recommend +${(scalePct * 100).toFixed(0)}% budget`;
        actions.push(msg);
        await logAction("meta-ads", "scale_recommendation", { ad_id: c.creative.id, roas: c.totals.roas, name: c.creative.name }, "success");
      }
    }

    // Spend alert: total spend > 80% of daily budget estimate
    const dailyBudget = 30; // from CLAUDE.md
    const todaySpend = data.dailySpend[data.dailySpend.length - 1]?.spend ?? 0;
    const hour = new Date().getHours();
    if (todaySpend > dailyBudget * 0.8 && hour < 18) {
      const msg = `Budget alert: €${todaySpend.toFixed(2)} spent (${((todaySpend / dailyBudget) * 100).toFixed(0)}% of daily) before 18h`;
      actions.push(msg);
      await logAction("meta-ads", "budget_alert", { todaySpend, dailyBudget, hour }, "warning");
    }

    if (actions.length === 0) {
      actions.push("No actions needed — all creatives within thresholds");
      await logAction("meta-ads", "check_ok", { creatives: data.creatives.length }, "success");
    }

    await updateLastRun("meta-ads");
  } catch (err) {
    const msg = `Agent error: ${err}`;
    actions.push(msg);
    await logAction("meta-ads", "agent_error", { error: String(err) }, "error");
  }

  return { actions };
}
