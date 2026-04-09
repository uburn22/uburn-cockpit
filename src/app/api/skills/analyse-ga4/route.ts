import { NextResponse } from "next/server";
import { generateAnalyseGA4 } from "@/services/skills/analyse-ga4";

export async function POST() {
  try {
    const result = await generateAnalyseGA4();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
