import { NextRequest, NextResponse } from "next/server";
import { getRealGA4Data } from "@/services/api/ga4";
import { getMockGA4Data } from "@/services/mock/ga4";

const USE_REAL_API = !!process.env.GA4_PROPERTY_ID && !!(process.env.GA4_CREDENTIALS_PATH || process.env.GA4_CREDENTIALS_JSON);

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
      ? await getRealGA4Data(range)
      : getMockGA4Data(range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("GA4 API error:", err);
    // Fallback to mock on error
    const data = getMockGA4Data(range);
    return NextResponse.json({ ...data, _fallback: true });
  }
}
