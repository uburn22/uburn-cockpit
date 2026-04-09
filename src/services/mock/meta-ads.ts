import { format, subDays, differenceInDays } from "date-fns";
import { createRng, seedFromDate, randomInRange } from "./seed";
import type {
  AdCreative,
  DailyAdMetrics,
  CreativeMetrics,
  MetaAdsData,
  DateRange,
} from "../types";
import { CREATIVES } from "@/lib/constants";

const MOCK_CREATIVES: AdCreative[] = CREATIVES.map((name, i) => ({
  id: `ad_${i + 1}`,
  name,
  status: i < 3 ? "ACTIVE" : "PAUSED",
}));

// Each creative has different performance profiles
const CREATIVE_PROFILES = [
  { spendShare: 0.30, roasBase: 3.5, ctrBase: 0.056, hookBase: 0.35 }, // UGC Top Performer
  { spendShare: 0.25, roasBase: 2.8, ctrBase: 0.032, hookBase: 0.30 }, // Video Coconut
  { spendShare: 0.20, roasBase: 2.2, ctrBase: 0.025, hookBase: 0.28 }, // Femmes Healthy v2
  { spendShare: 0.15, roasBase: 1.8, ctrBase: 0.018, hookBase: 0.22 }, // Meilleur Ube
  { spendShare: 0.10, roasBase: 1.5, ctrBase: 0.012, hookBase: 0.18 }, // Routine UBE
];

function generateDailyAdMetrics(
  rng: () => number,
  dailyBudget: number,
  profile: (typeof CREATIVE_PROFILES)[0],
  _date: string
): DailyAdMetrics {
  const spend = dailyBudget * profile.spendShare * randomInRange(rng, 0.8, 1.2);
  const cpm = randomInRange(rng, 15, 35);
  const impressions = Math.round((spend / cpm) * 1000);
  const ctr = profile.ctrBase * randomInRange(rng, 0.7, 1.3);
  const clicks = Math.round(impressions * ctr);
  const hookRate = profile.hookBase * randomInRange(rng, 0.8, 1.2);
  const roas = profile.roasBase * randomInRange(rng, 0.6, 1.4);
  const revenue = spend * roas;
  const conversions = Math.max(0, Math.round(revenue / 42)); // ~€42 AOV
  const cpo = conversions > 0 ? spend / conversions : 0;
  const frequency = randomInRange(rng, 1.2, 3.8);

  return {
    date: _date,
    spend: Math.round(spend * 100) / 100,
    impressions,
    clicks,
    ctr: Math.round(ctr * 10000) / 10000,
    cpm: Math.round(cpm * 100) / 100,
    conversions,
    revenue: Math.round(revenue * 100) / 100,
    roas: Math.round(roas * 100) / 100,
    cpo: Math.round(cpo * 100) / 100,
    hookRate: Math.round(hookRate * 1000) / 1000,
    frequency: Math.round(frequency * 10) / 10,
  };
}

function sumMetrics(daily: DailyAdMetrics[]): DailyAdMetrics {
  const totals = daily.reduce(
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
    spend: Math.round(totals.spend * 100) / 100,
    impressions: totals.impressions,
    clicks: totals.clicks,
    ctr:
      totals.impressions > 0
        ? Math.round((totals.clicks / totals.impressions) * 10000) / 10000
        : 0,
    cpm:
      totals.impressions > 0
        ? Math.round((totals.spend / totals.impressions) * 1000 * 100) / 100
        : 0,
    conversions: totals.conversions,
    revenue: Math.round(totals.revenue * 100) / 100,
    roas:
      totals.spend > 0
        ? Math.round((totals.revenue / totals.spend) * 100) / 100
        : 0,
    cpo:
      totals.conversions > 0
        ? Math.round((totals.spend / totals.conversions) * 100) / 100
        : 0,
    hookRate:
      Math.round(
        (daily.reduce((s, d) => s + d.hookRate, 0) / daily.length) * 1000
      ) / 1000,
    frequency:
      Math.round(
        (daily.reduce((s, d) => s + d.frequency, 0) / daily.length) * 10
      ) / 10,
  };
}

export function getMockMetaAdsData(range: DateRange): MetaAdsData {
  const days = differenceInDays(range.to, range.from) + 1;
  const rng = createRng(seedFromDate("meta-" + format(range.from, "yyyy-MM-dd")));
  const dailyBudget = 30; // €30/day

  const creatives: CreativeMetrics[] = MOCK_CREATIVES.map((creative, idx) => {
    const daily: DailyAdMetrics[] = [];
    for (let d = 0; d < days; d++) {
      const date = format(subDays(range.to, days - 1 - d), "yyyy-MM-dd");
      daily.push(
        generateDailyAdMetrics(rng, dailyBudget, CREATIVE_PROFILES[idx], date)
      );
    }
    return { creative, totals: sumMetrics(daily), daily };
  });

  // Aggregate daily spend
  const dailySpend: { date: string; spend: number }[] = [];
  for (let d = 0; d < days; d++) {
    const date = format(subDays(range.to, days - 1 - d), "yyyy-MM-dd");
    const spend = creatives.reduce(
      (s, c) => s + (c.daily[d]?.spend ?? 0),
      0
    );
    dailySpend.push({ date, spend: Math.round(spend * 100) / 100 });
  }

  // Blended metrics
  const totalSpend = creatives.reduce((s, c) => s + c.totals.spend, 0);
  const totalRevenue = creatives.reduce((s, c) => s + c.totals.revenue, 0);
  const totalConversions = creatives.reduce(
    (s, c) => s + c.totals.conversions,
    0
  );
  const totalImpressions = creatives.reduce(
    (s, c) => s + c.totals.impressions,
    0
  );
  const totalClicks = creatives.reduce((s, c) => s + c.totals.clicks, 0);

  // Funnel metrics (simulated from totals)
  const atc = Math.round(totalClicks * 0.08);
  const checkouts = Math.round(atc * 0.5);

  return {
    creatives,
    dailySpend,
    blendedRoas:
      totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
    averageCpo:
      totalConversions > 0
        ? Math.round((totalSpend / totalConversions) * 100) / 100
        : 0,
    totalSpend: Math.round(totalSpend * 100) / 100,
    averageCtr:
      totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 10000) / 10000
        : 0,
    funnel: {
      impressions: totalImpressions,
      hookRate: 0.28,
      clicks: totalClicks,
      ctr:
        totalImpressions > 0
          ? Math.round((totalClicks / totalImpressions) * 10000) / 10000
          : 0,
      atc,
      atcRate: totalClicks > 0 ? Math.round((atc / totalClicks) * 1000) / 1000 : 0,
      checkouts,
      checkoutRate: atc > 0 ? Math.round((checkouts / atc) * 1000) / 1000 : 0,
      purchases: totalConversions,
      conversionRate:
        totalImpressions > 0
          ? Math.round((totalConversions / totalImpressions) * 10000) / 10000
          : 0,
    },
  };
}
