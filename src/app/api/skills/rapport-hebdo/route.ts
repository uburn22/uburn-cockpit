import { NextResponse } from "next/server";
import { generateRapportHebdo } from "@/services/skills/rapport-hebdo";

export async function POST() {
  try {
    const result = await generateRapportHebdo();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
