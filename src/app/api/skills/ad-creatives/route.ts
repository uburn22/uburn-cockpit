import { NextRequest, NextResponse } from "next/server";
import { generateAdCreatives } from "@/services/skills/ad-creative-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = (body as { count?: number }).count || 6;
    const result = await generateAdCreatives(count);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
