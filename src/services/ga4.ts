import { getMockGA4Data } from "./mock/ga4";
import type { GA4Data, DateRange } from "./types";

export async function getGA4Data(range: DateRange): Promise<GA4Data> {
  // TODO: swap to real GA4 Data API
  return getMockGA4Data(range);
}
