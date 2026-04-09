import { subDays } from "date-fns";
import { logAction, getConfig, updateLastRun } from "./base";
import { getRealShopifyData } from "@/services/api/shopify";

export async function runShopifyAgent(): Promise<{ actions: string[] }> {
  const config = await getConfig("shopify");
  if (!config || !config.enabled) {
    return { actions: ["Agent shopify disabled"] };
  }

  const thresholds = config.thresholds;
  const aovDropPct = thresholds.aov_drop_pct ?? 0.15;
  const actions: string[] = [];

  try {
    const range7 = { from: subDays(new Date(), 7), to: new Date() };
    const range30 = { from: subDays(new Date(), 30), to: new Date() };

    const recent = await getRealShopifyData(range7);
    const monthly = await getRealShopifyData(range30);

    // AOV trend: compare 7d vs 30d
    if (monthly.aov > 0 && recent.aov > 0) {
      const aovChange = (recent.aov - monthly.aov) / monthly.aov;
      if (aovChange < -aovDropPct) {
        const msg = `AOV dropping: €${recent.aov.toFixed(2)} (7j) vs €${monthly.aov.toFixed(2)} (30j) — ${(aovChange * 100).toFixed(1)}%`;
        actions.push(msg);
        await logAction("shopify", "aov_drop", { recent_aov: recent.aov, monthly_aov: monthly.aov, change: aovChange }, "warning");
      }
    }

    // Repeat customers in last 7 days
    const repeatOrders = recent.orders.filter((o) => o.isRepeat);
    if (repeatOrders.length > 0) {
      const msg = `${repeatOrders.length} repeat orders in 7 days — customers to nurture`;
      actions.push(msg);
      await logAction("shopify", "repeat_customers", { count: repeatOrders.length, customers: repeatOrders.map((o) => o.customerId).slice(0, 10) }, "success");
    }

    // Daily order trend
    const avgOrders = recent.totalOrders / 7;
    if (avgOrders < 3) {
      const msg = `Low order volume: ${avgOrders.toFixed(1)} orders/day (7d avg)`;
      actions.push(msg);
      await logAction("shopify", "low_orders", { avgOrders, totalOrders: recent.totalOrders }, "warning");
    }

    if (actions.length === 0) {
      actions.push("No actions needed — Shopify metrics healthy");
      await logAction("shopify", "check_ok", { orders7d: recent.totalOrders, aov: recent.aov }, "success");
    }

    await updateLastRun("shopify");
  } catch (err) {
    const msg = `Agent error: ${err}`;
    actions.push(msg);
    await logAction("shopify", "agent_error", { error: String(err) }, "error");
  }

  return { actions };
}
