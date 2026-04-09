import { NextRequest, NextResponse } from "next/server";
import { getRealShopifyData } from "@/services/api/shopify";
import { getMockShopifyData } from "@/services/mock/shopify";

const USE_REAL_API =
  !!process.env.SHOPIFY_ACCESS_TOKEN &&
  process.env.SHOPIFY_ACCESS_TOKEN !== "A_CONFIGURER" &&
  !!process.env.SHOPIFY_STORE;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to params" }, { status: 400 });
  }

  const range = { from: new Date(from), to: new Date(to) };

  try {
    const data = USE_REAL_API
      ? await getRealShopifyData(range)
      : getMockShopifyData(range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Shopify API error:", err);
    const data = getMockShopifyData(range);
    return NextResponse.json({ ...data, _fallback: true });
  }
}
