import { format, subDays, differenceInDays } from "date-fns";
import { createRng, seedFromDate, randomInRange, randomInt } from "./seed";
import type { Parcel, DailyShipments, SendcloudData, DateRange } from "../types";

const CARRIERS = ["Colissimo", "Chronopost", "Mondial Relay", "DPD", "UPS"];
const STATUSES = [
  "Delivered",
  "In transit",
  "Out for delivery",
  "Ready to send",
  "Announced",
];

export function getMockSendcloudData(range: DateRange): SendcloudData {
  const days = differenceInDays(range.to, range.from) + 1;
  const rng = createRng(seedFromDate("sendcloud-" + format(range.from, "yyyy-MM-dd")));

  const parcels: Parcel[] = [];
  const dailyShipments: DailyShipments[] = [];
  const carrierCount = new Map<string, number>();

  let totalDelivered = 0;
  let totalDeliveryDays = 0;
  let deliveredCount = 0;

  for (let d = 0; d < days; d++) {
    const date = format(subDays(range.to, days - 1 - d), "yyyy-MM-dd");
    const shipped = randomInt(rng, 2, 8);
    let dayDelivered = 0;

    for (let p = 0; p < shipped; p++) {
      const carrier = CARRIERS[randomInt(rng, 0, CARRIERS.length - 1)];
      const isOld = d < days - 3;
      const status = isOld
        ? rng() < 0.85 ? "Delivered" : "In transit"
        : STATUSES[randomInt(rng, 0, STATUSES.length - 1)];
      const deliveryDays = status === "Delivered" ? randomInt(rng, 1, 5) : 0;

      if (status === "Delivered") {
        dayDelivered++;
        totalDeliveryDays += deliveryDays;
        deliveredCount++;
      }

      carrierCount.set(carrier, (carrierCount.get(carrier) || 0) + 1);

      parcels.push({
        id: d * 100 + p,
        trackingNumber: `FR${randomInt(rng, 100000000, 999999999)}`,
        orderNumber: `#${1000 + d * 10 + p}`,
        status,
        carrier,
        createdAt: date,
        updatedAt: status === "Delivered"
          ? format(subDays(range.to, days - 1 - d - deliveryDays), "yyyy-MM-dd")
          : date,
        weight: Math.round(randomInRange(rng, 0.2, 1.5) * 100) / 100,
        country: "FR",
      });
    }

    totalDelivered += dayDelivered;
    dailyShipments.push({ date, shipped, delivered: dayDelivered });
  }

  const totalShipped = parcels.length;
  const carrierSplit = Array.from(carrierCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    parcels: parcels.reverse(), // most recent first
    totalShipped,
    totalDelivered,
    deliveryRate: totalShipped > 0 ? Math.round((totalDelivered / totalShipped) * 1000) / 1000 : 0,
    avgDeliveryDays: deliveredCount > 0 ? Math.round((totalDeliveryDays / deliveredCount) * 10) / 10 : 0,
    dailyShipments,
    carrierSplit,
  };
}
