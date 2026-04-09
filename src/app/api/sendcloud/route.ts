import { NextRequest, NextResponse } from "next/server";
import { getRealSendcloudData } from "@/services/api/sendcloud";
import { getMockSendcloudData } from "@/services/mock/sendcloud";

const USE_REAL_API =
  !!process.env.SENDCLOUD_API_KEY &&
  process.env.SENDCLOUD_API_KEY !== "A_CONFIGURER" &&
  !!process.env.SENDCLOUD_API_SECRET &&
  process.env.SENDCLOUD_API_SECRET !== "A_CONFIGURER";

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
      ? await getRealSendcloudData(range)
      : getMockSendcloudData(range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Sendcloud API error:", err);
    const data = getMockSendcloudData(range);
    return NextResponse.json({ ...data, _fallback: true });
  }
}
