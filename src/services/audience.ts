import { getMockAudienceData } from "./mock/audience";
import type { AudienceData, DateRange } from "./types";

export async function getAudienceData(range: DateRange): Promise<AudienceData> {
  // TODO: swap to real Shopify + Meta data
  return getMockAudienceData(range);
}
