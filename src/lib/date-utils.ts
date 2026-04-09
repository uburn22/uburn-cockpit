import { subDays } from "date-fns";
import type { DateRange } from "@/services/types";

export type Period = "7d" | "30d" | "90d";

export function periodToDateRange(period: Period): DateRange {
  const to = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const from = subDays(to, days - 1);
  return { from, to };
}
