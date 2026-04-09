import { NextResponse } from "next/server";
import { generateBriefCrea } from "@/services/skills/brief-crea";

export async function POST() {
  try {
    const result = await generateBriefCrea();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
