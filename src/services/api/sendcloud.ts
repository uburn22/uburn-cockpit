import { format, differenceInDays } from "date-fns";
import type {
  Parcel,
  DailyShipments,
  SendcloudData,
  DateRange,
} from "../types";

const API_KEY = process.env.SENDCLOUD_API_KEY!;
const API_SECRET = process.env.SENDCLOUD_API_SECRET!;
const BASE = "https://panel.sendcloud.sc/api/v2";

interface SendcloudParcel {
  id: number;
  tracking_number: string;
  order_number: string;
  status: { id: number; message: string };
  carrier: { code: string };
  date_created: string; // "DD-MM-YYYY HH:mm:ss"
  date_updated: string;
  weight: string;
  country: { iso_2: string };
}

async function sendcloudFetch<T>(path: string): Promise<T> {
  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sendcloud API ${res.status}: ${body}`);
  }
  return res.json();
}

// "DD-MM-YYYY HH:mm:ss" → "YYYY-MM-DD"
function parseSendcloudDate(raw: string): string {
  if (!raw) return "";
  const parts = raw.split(" ")[0]?.split("-");
  if (parts?.length !== 3) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function mapStatus(statusMsg: string): string {
  const lower = statusMsg.toLowerCase();
  if (lower.includes("delivered") || lower.includes("livré")) return "Delivered";
  if (lower.includes("transit") || lower.includes("en route")) return "In transit";
  if (lower.includes("out for delivery") || lower.includes("livraison")) return "Out for delivery";
  if (lower.includes("ready") || lower.includes("prêt")) return "Ready to send";
  return statusMsg;
}

export async function getRealSendcloudData(range: DateRange): Promise<SendcloudData> {
  // Sendcloud API paginates parcels — fetch up to 500
  const allParcels: Parcel[] = [];
  let cursor: string | null = null;
  let pages = 0;

  while (pages < 5) {
    const url: string = cursor
      ? `/parcels?cursor=${cursor}&limit=100`
      : `/parcels?limit=100`;

    const data = await sendcloudFetch<{
      parcels: SendcloudParcel[];
      next?: string;
    }>(url);

    for (const p of data.parcels) {
      // Sendcloud uses "DD-MM-YYYY HH:mm:ss" format
      const createdAt = parseSendcloudDate(p.date_created);
      // Filter by date range
      if (createdAt < format(range.from, "yyyy-MM-dd")) continue;
      if (createdAt > format(range.to, "yyyy-MM-dd")) continue;

      allParcels.push({
        id: p.id,
        trackingNumber: p.tracking_number || "",
        orderNumber: p.order_number || "",
        status: mapStatus(p.status?.message || "Unknown"),
        carrier: p.carrier?.code || "unknown",
        createdAt,
        updatedAt: parseSendcloudDate(p.date_updated) || createdAt,
        weight: parseFloat(p.weight || "0"),
        country: p.country?.iso_2 || "FR",
      });
    }

    if (!data.next) break;
    // Extract cursor from next URL
    const nextUrl = new URL(data.next);
    cursor = nextUrl.searchParams.get("cursor");
    if (!cursor) break;
    pages++;
  }

  // Compute aggregates
  const days = differenceInDays(range.to, range.from) + 1;
  const dailyMap = new Map<string, { shipped: number; delivered: number }>();

  // Initialize all days
  for (let d = 0; d < days; d++) {
    const date = format(
      new Date(range.from.getTime() + d * 86400000),
      "yyyy-MM-dd"
    );
    dailyMap.set(date, { shipped: 0, delivered: 0 });
  }

  let totalDelivered = 0;
  let totalDeliveryDays = 0;
  let deliveredCount = 0;
  const carrierCount = new Map<string, number>();

  for (const p of allParcels) {
    const day = dailyMap.get(p.createdAt);
    if (day) day.shipped++;

    if (p.status === "Delivered") {
      totalDelivered++;
      const day2 = dailyMap.get(p.updatedAt);
      if (day2) day2.delivered++;

      // Delivery time
      const created = new Date(p.createdAt).getTime();
      const updated = new Date(p.updatedAt).getTime();
      if (updated > created) {
        totalDeliveryDays += Math.round((updated - created) / 86400000);
        deliveredCount++;
      }
    }

    carrierCount.set(p.carrier, (carrierCount.get(p.carrier) || 0) + 1);
  }

  const dailyShipments: DailyShipments[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, shipped: d.shipped, delivered: d.delivered }));

  const carrierSplit = Array.from(carrierCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    parcels: allParcels.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    totalShipped: allParcels.length,
    totalDelivered,
    deliveryRate: allParcels.length > 0
      ? Math.round((totalDelivered / allParcels.length) * 1000) / 1000
      : 0,
    avgDeliveryDays: deliveredCount > 0
      ? Math.round((totalDeliveryDays / deliveredCount) * 10) / 10
      : 0,
    dailyShipments,
    carrierSplit,
  };
}
