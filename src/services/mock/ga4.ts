import { format, subDays, differenceInDays } from "date-fns";
import { createRng, seedFromDate, randomInRange, randomInt } from "./seed";
import type { TrafficSource, DailySessions, GA4Data, DateRange } from "../types";

const SOURCE_DISTRIBUTION = [
  { source: "meta", medium: "cpc", share: 0.55 },
  { source: "google", medium: "organic", share: 0.18 },
  { source: "(direct)", medium: "(none)", share: 0.15 },
  { source: "instagram", medium: "referral", share: 0.07 },
  { source: "google", medium: "cpc", share: 0.05 },
];

export function getMockGA4Data(range: DateRange): GA4Data {
  const days = differenceInDays(range.to, range.from) + 1;
  const rng = createRng(seedFromDate("ga4-" + format(range.from, "yyyy-MM-dd")));

  const daily: DailySessions[] = [];
  let totalSessions = 0;
  let totalNew = 0;
  let totalReturning = 0;

  for (let d = 0; d < days; d++) {
    const date = format(subDays(range.to, days - 1 - d), "yyyy-MM-dd");
    const sessions = randomInt(rng, 120, 320);
    const newPct = randomInRange(rng, 0.7, 0.85);
    const newUsers = Math.round(sessions * newPct);
    const returningUsers = sessions - newUsers;

    daily.push({ date, sessions, newUsers, returningUsers });
    totalSessions += sessions;
    totalNew += newUsers;
    totalReturning += returningUsers;
  }

  const sources: TrafficSource[] = SOURCE_DISTRIBUTION.map((s) => {
    const sessions = Math.round(totalSessions * s.share * randomInRange(rng, 0.9, 1.1));
    return {
      source: s.source,
      medium: s.medium,
      sessions,
      percentage: Math.round((sessions / totalSessions) * 1000) / 1000,
    };
  });

  return {
    totalSessions,
    newVsReturning: { new: totalNew, returning: totalReturning },
    sources,
    daily,
  };
}
