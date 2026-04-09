import { getMockShopifyData } from "./mock/shopify";
import type { ShopifyData, DateRange } from "./types";

export async function getShopifyData(range: DateRange): Promise<ShopifyData> {
  // TODO: swap to real Shopify Admin API
  return getMockShopifyData(range);
}
