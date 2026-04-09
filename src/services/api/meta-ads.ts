import { format } from "date-fns";
import type {
  AdCreative,
  DailyAdMetrics,
  CreativeMetrics,
  MetaAdsData,
  DateRange,
} from "../types";

const TOKEN = process.env.META_ACCESS_TOKEN!;
const ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID!;
const API_VERSION = "v21.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

interface MetaInsightRow {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpm: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  frequency?: string;
  video_thruplay_watched_actions?: { action_type: string; value: string }[];
  video_p25_watched_actions?: { action_type: string; value: string }[];
  ad_id?: string;
  ad_name?: string;
  status?: string;
}

async function metaFetch<T>(url: string): Promise<T> {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}access_token=${TOKEN}`, {
    next: { revalidate: 300 }, // cache 5 min
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API ${res.status}: ${body}`);
  }
  return res.json();
}

function extractAction(
  actions: { action_type: string; value: string }[] | undefined,
  type: string
): number {
  if (!actions) return 0;
  const found = actions.find((a) => a.action_type === type);
  return found ? parseFloat(found.value) : 0;
}

function rowToMetrics(row: MetaInsightRow): DailyAdMetrics {
  const spend = parseFloat(row.spend || "0");
  const impressions = parseInt(row.impressions || "0", 10);
  const clicks = parseInt(row.clicks || "0", 10);
  const conversions = extractAction(row.actions, "purchase");
  const revenue = extractAction(row.action_values, "purchase");
  // Hook rate approximation: 3s views / impressions
  // Meta gives video_p25_watched_actions as a proxy for short videos
  const p25 = extractAction(row.video_p25_watched_actions, "video_view");
  const hookRate = impressions > 0 ? p25 / impressions : 0;

  return {
    date: row.date_start,
    spend: Math.round(spend * 100) / 100,
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 10000 : 0,
    cpm: impressions > 0 ? Math.round((spend / impressions) * 1000 * 100) / 100 : 0,
    conversions,
    revenue: Math.round(revenue * 100) / 100,
    roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
    cpo: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
    hookRate: Math.round(hookRate * 1000) / 1000,
    frequency: parseFloat(row.frequency || "1"),
  };
}

export async function getRealMetaAdsData(range: DateRange): Promise<MetaAdsData> {
  const since = format(range.from, "yyyy-MM-dd");
  const until = format(range.to, "yyyy-MM-dd");

  // 1. Get all ads in the account
  const adsRes = await metaFetch<{
    data: { id: string; name: string; status: string }[];
  }>(
    `${BASE}/${ACCOUNT_ID}/ads?fields=id,name,status&limit=50`
  );

  const adsList = adsRes.data || [];

  // 2. Get insights per ad, broken down by day
  const fields = [
    "ad_id",
    "ad_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpm",
    "actions",
    "action_values",
    "frequency",
    "video_p25_watched_actions",
  ].join(",");

  const insightsRes = await metaFetch<{ data: MetaInsightRow[] }>(
    `${BASE}/${ACCOUNT_ID}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&time_increment=1&level=ad&limit=500`
  );

  const rows = insightsRes.data || [];

  // 3. Group by ad
  const adMap = new Map<string, { creative: AdCreative; daily: DailyAdMetrics[] }>();

  for (const ad of adsList) {
    adMap.set(ad.id, {
      creative: {
        id: ad.id,
        name: ad.name,
        status: ad.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
      },
      daily: [],
    });
  }

  for (const row of rows) {
    const adId = row.ad_id || "";
    if (!adMap.has(adId)) {
      adMap.set(adId, {
        creative: {
          id: adId,
          name: row.ad_name || `Ad ${adId}`,
          status: "ACTIVE",
        },
        daily: [],
      });
    }
    adMap.get(adId)!.daily.push(rowToMetrics(row));
  }

  // 4. Compute totals per creative
  const creatives: CreativeMetrics[] = [];
  for (const entry of adMap.values()) {
    if (entry.daily.length === 0) continue;
    const totals = aggregateMetrics(entry.daily);
    creatives.push({ creative: entry.creative, totals, daily: entry.daily });
  }

  // Sort by spend descending
  creatives.sort((a, b) => b.totals.spend - a.totals.spend);

  // 5. Aggregate daily spend
  const spendByDate = new Map<string, number>();
  for (const c of creatives) {
    for (const d of c.daily) {
      spendByDate.set(d.date, (spendByDate.get(d.date) || 0) + d.spend);
    }
  }
  const dailySpend = Array.from(spendByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spend]) => ({ date, spend: Math.round(spend * 100) / 100 }));

  // 6. Blended metrics
  const totalSpend = creatives.reduce((s, c) => s + c.totals.spend, 0);
  const totalRevenue = creatives.reduce((s, c) => s + c.totals.revenue, 0);
  const totalConversions = creatives.reduce((s, c) => s + c.totals.conversions, 0);
  const totalImpressions = creatives.reduce((s, c) => s + c.totals.impressions, 0);
  const totalClicks = creatives.reduce((s, c) => s + c.totals.clicks, 0);

  const atc = Math.round(totalClicks * 0.08); // estimated from funnel benchmarks
  const checkouts = Math.round(atc * 0.5);

  return {
    creatives,
    dailySpend,
    blendedRoas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
    averageCpo: totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : 0,
    totalSpend: Math.round(totalSpend * 100) / 100,
    averageCtr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 10000 : 0,
    funnel: {
      impressions: totalImpressions,
      hookRate: creatives.length > 0
        ? Math.round((creatives.reduce((s, c) => s + c.totals.hookRate, 0) / creatives.length) * 1000) / 1000
        : 0,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 10000 : 0,
      atc,
      atcRate: totalClicks > 0 ? Math.round((atc / totalClicks) * 1000) / 1000 : 0,
      checkouts,
      checkoutRate: atc > 0 ? Math.round((checkouts / atc) * 1000) / 1000 : 0,
      purchases: totalConversions,
      conversionRate: totalImpressions > 0 ? Math.round((totalConversions / totalImpressions) * 10000) / 10000 : 0,
    },
  };
}

function aggregateMetrics(daily: DailyAdMetrics[]): DailyAdMetrics {
  const t = daily.reduce(
    (acc, d) => ({
      spend: acc.spend + d.spend,
      impressions: acc.impressions + d.impressions,
      clicks: acc.clicks + d.clicks,
      conversions: acc.conversions + d.conversions,
      revenue: acc.revenue + d.revenue,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  );

  return {
    date: "total",
    spend: Math.round(t.spend * 100) / 100,
    impressions: t.impressions,
    clicks: t.clicks,
    ctr: t.impressions > 0 ? Math.round((t.clicks / t.impressions) * 10000) / 10000 : 0,
    cpm: t.impressions > 0 ? Math.round((t.spend / t.impressions) * 1000 * 100) / 100 : 0,
    conversions: t.conversions,
    revenue: Math.round(t.revenue * 100) / 100,
    roas: t.spend > 0 ? Math.round((t.revenue / t.spend) * 100) / 100 : 0,
    cpo: t.conversions > 0 ? Math.round((t.spend / t.conversions) * 100) / 100 : 0,
    hookRate: Math.round((daily.reduce((s, d) => s + d.hookRate, 0) / daily.length) * 1000) / 1000,
    frequency: Math.round((daily.reduce((s, d) => s + d.frequency, 0) / daily.length) * 10) / 10,
  };
}
