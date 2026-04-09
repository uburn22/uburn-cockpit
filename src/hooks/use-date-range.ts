"use client";

import { useMemo } from "react";
import { periodToDateRange, type Period } from "@/lib/date-utils";

export function useDateRange(period: Period) {
  return useMemo(() => periodToDateRange(period), [period]);
}
