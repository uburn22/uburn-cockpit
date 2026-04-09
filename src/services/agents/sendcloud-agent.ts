import { subDays, differenceInHours } from "date-fns";
import { logAction, getConfig, updateLastRun } from "./base";
import { getRealSendcloudData } from "@/services/api/sendcloud";

export async function runSendcloudAgent(): Promise<{ actions: string[] }> {
  const config = await getConfig("sendcloud");
  if (!config || !config.enabled) {
    return { actions: ["Agent sendcloud disabled"] };
  }

  const thresholds = config.thresholds;
  const stuckHours = thresholds.stuck_hours ?? 48;
  const minDeliveryRate = thresholds.min_delivery_rate ?? 0.9;
  const actions: string[] = [];

  try {
    const range = { from: subDays(new Date(), 14), to: new Date() };
    const data = await getRealSendcloudData(range);

    // Stuck parcels: not delivered after X hours
    const now = new Date();
    const stuckParcels = data.parcels.filter((p) => {
      if (p.status === "Delivered") return false;
      const created = new Date(p.createdAt);
      return differenceInHours(now, created) > stuckHours;
    });

    if (stuckParcels.length > 0) {
      const msg = `${stuckParcels.length} colis bloqués > ${stuckHours}h`;
      actions.push(msg);
      await logAction("sendcloud", "stuck_parcels", {
        count: stuckParcels.length,
        parcels: stuckParcels.slice(0, 5).map((p) => ({
          id: p.id,
          order: p.orderNumber,
          status: p.status,
          carrier: p.carrier,
          created: p.createdAt,
        })),
      }, "warning");
    }

    // Delivery rate check
    if (data.totalShipped > 5 && data.deliveryRate < minDeliveryRate) {
      const msg = `Taux de livraison bas: ${(data.deliveryRate * 100).toFixed(1)}% (seuil: ${(minDeliveryRate * 100).toFixed(0)}%)`;
      actions.push(msg);
      await logAction("sendcloud", "low_delivery_rate", {
        rate: data.deliveryRate,
        shipped: data.totalShipped,
        delivered: data.totalDelivered,
      }, "warning");
    }

    // Carrier-specific delays
    const carrierDelays = new Map<string, number>();
    for (const p of stuckParcels) {
      carrierDelays.set(p.carrier, (carrierDelays.get(p.carrier) || 0) + 1);
    }
    for (const [carrier, count] of carrierDelays.entries()) {
      if (count >= 2) {
        const msg = `Retards ${carrier}: ${count} colis bloqués`;
        actions.push(msg);
        await logAction("sendcloud", "carrier_delay", { carrier, count }, "warning");
      }
    }

    if (actions.length === 0) {
      actions.push("No actions needed — logistics healthy");
      await logAction("sendcloud", "check_ok", {
        shipped: data.totalShipped,
        delivered: data.totalDelivered,
        rate: data.deliveryRate,
      }, "success");
    }

    await updateLastRun("sendcloud");
  } catch (err) {
    const msg = `Agent error: ${err}`;
    actions.push(msg);
    await logAction("sendcloud", "agent_error", { error: String(err) }, "error");
  }

  return { actions };
}
