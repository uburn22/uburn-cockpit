import { NextRequest, NextResponse } from "next/server";
import { generateInfographics } from "@/services/skills/infographic-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const types = (body as { types?: string[] }).types || ["all"];
    const result = await generateInfographics(types);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
