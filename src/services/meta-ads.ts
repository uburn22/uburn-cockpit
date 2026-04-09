import { getMockMetaAdsData } from "./mock/meta-ads";
import type { MetaAdsData, DateRange } from "./types";

export async function getMetaAdsData(range: DateRange): Promise<MetaAdsData> {
  // TODO: swap to real Meta Marketing API
  return getMockMetaAdsData(range);
}
