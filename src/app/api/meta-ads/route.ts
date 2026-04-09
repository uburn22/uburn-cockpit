import { NextRequest, NextResponse } from "next/server";
import { getRealMetaAdsData } from "@/services/api/meta-ads";
import { getMockMetaAdsData } from "@/services/mock/meta-ads";

const USE_REAL_API = !!process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN !== "A_CONFIGURER";

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
      ? await getRealMetaAdsData(range)
      : getMockMetaAdsData(range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Meta Ads API error:", err);
    // Fallback to mock on error
    const data = getMockMetaAdsData(range);
    return NextResponse.json({ ...data, _fallback: true });
  }
}
