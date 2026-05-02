import { getRealShopifyData } from "./api/shopify";
import { getMockShopifyData } from "./mock/shopify";
import type { ShopifyData, DateRange } from "./types";

const USE_REAL_API =
  !!process.env.SHOPIFY_ACCESS_TOKEN &&
  process.env.SHOPIFY_ACCESS_TOKEN !== "A_CONFIGURER" &&
  !!process.env.SHOPIFY_STORE;

export async function getShopifyData(range: DateRange): Promise<ShopifyData> {
  if (USE_REAL_API) {
    try {
      return await getRealShopifyData(range);
    } catch (err) {
      console.error("[shopify] Real API failed, fallback to mock:", err);
      return getMockShopifyData(range);
    }
  }
  return getMockShopifyData(range);
}
