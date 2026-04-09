import { NextRequest, NextResponse } from "next/server";
import { generateEmailSequence } from "@/services/skills/email-sequence";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = (body as { type?: "abandon" | "welcome" | "winback" | "vip" | "post-purchase" }).type || "abandon";
    const result = await generateEmailSequence(type);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
