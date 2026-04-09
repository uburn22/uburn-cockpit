import { NextRequest, NextResponse } from "next/server";
import { generatePostSocial } from "@/services/skills/post-social";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = (body as { count?: number }).count || 7;
    const result = await generatePostSocial(count);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
