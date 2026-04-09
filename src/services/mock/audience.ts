import { format, subDays, differenceInDays, subWeeks } from "date-fns";
import { createRng, seedFromDate, randomInRange } from "./seed";
import type { AudienceData, CohortRow, DateRange } from "../types";

export function getMockAudienceData(range: DateRange): AudienceData {
  const days = differenceInDays(range.to, range.from) + 1;
  const weeks = Math.ceil(days / 7);
  const rng = createRng(seedFromDate("audience-" + format(range.from, "yyyy-MM-dd")));

  // Cohorts: each week, new customers, then retention % per subsequent week
  const cohorts: CohortRow[] = [];
  for (let w = 0; w < Math.min(weeks, 12); w++) {
    const weekDate = subWeeks(range.to, weeks - 1 - w);
    const totalCustomers = Math.round(randomInRange(rng, 15, 40));
    const retention: number[] = [];
    let retRate = randomInRange(rng, 0.12, 0.20); // Week 1 retention
    for (let r = 0; r < Math.min(weeks - w, 8); r++) {
      retention.push(Math.round(retRate * 100) / 100);
      retRate *= randomInRange(rng, 0.6, 0.85); // Decay
    }
    cohorts.push({
      cohortWeek: format(weekDate, "yyyy-'W'ww"),
      totalCustomers,
      retention,
    });
  }

  // CAC trend
  const cacTrend: { date: string; cac: number }[] = [];
  for (let d = 0; d < days; d += 7) {
    const date = format(subDays(range.to, days - 1 - d), "yyyy-MM-dd");
    cacTrend.push({
      date,
      cac: Math.round(randomInRange(rng, 14, 28) * 100) / 100,
    });
  }

  return {
    repeatRate: Math.round(randomInRange(rng, 0.12, 0.18) * 100) / 100,
    ltv30: Math.round(randomInRange(rng, 38, 48) * 100) / 100,
    ltv60: Math.round(randomInRange(rng, 48, 58) * 100) / 100,
    ltv90: Math.round(randomInRange(rng, 52, 65) * 100) / 100,
    cac: Math.round(randomInRange(rng, 16, 24) * 100) / 100,
    newVsReturning: {
      new: Math.round(randomInRange(rng, 0.78, 0.88) * 100) / 100,
      returning: 0,
    },
    cohorts,
    cacTrend,
  };
}
