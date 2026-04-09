import { NextResponse } from "next/server";
import { runContentAgent } from "@/services/agents/content-agent";

export async function POST() {
  try {
    const result = await runContentAgent();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 }
    );
  }
}
