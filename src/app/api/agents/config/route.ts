import { NextRequest, NextResponse } from "next/server";
import { getAllConfigs } from "@/services/agents/base";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const configs = await getAllConfigs();
  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { agent_name, enabled, thresholds } = body;

  if (!agent_name) {
    return NextResponse.json({ error: "agent_name required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof enabled === "boolean") updates.enabled = enabled;
  if (thresholds) updates.thresholds = thresholds;

  const { error } = await supabase
    .from("agent_config")
    .update(updates)
    .eq("agent_name", agent_name);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
