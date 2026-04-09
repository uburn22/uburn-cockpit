import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/content/generated
 *
 * Récupère tout le contenu généré par les agents depuis Supabase agent_logs.
 * Filtre par type : ad_creatives, social_posts, ai_images, brief, infographics, email_sequence
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const type = req.nextUrl.searchParams.get("type") || "all";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

  // Actions that contain generated content
  const contentActions = [
    "ad_creatives_generated",
    "social_plan_generated",
    "ai_images_generated",
    "infographics_generated",
    "brief_generated",
    "email_sequence_executed",
    // Agent Manager actions
    "ad_creatives_executed",
    "social_posts_executed",
    "images_executed",
    "infographics_executed",
    "brief_crea_executed",
    "email_sequence_executed",
    "weekly_report_executed",
    "ga4_analysis_executed",
    "cycle_complete",
  ];

  const actionFilter: Record<string, string[]> = {
    ads: ["ad_creatives_generated", "ad_creatives_executed"],
    social: ["social_plan_generated", "social_posts_executed"],
    images: ["ai_images_generated", "images_executed"],
    infographics: ["infographics_generated", "infographics_executed"],
    brief: ["brief_generated", "brief_crea_executed"],
    emails: ["email_sequence_executed"],
    reports: ["weekly_report_executed", "ga4_analysis_executed"],
    all: contentActions,
  };

  const actions = actionFilter[type] || contentActions;

  const { data, error } = await supabase
    .from("agent_logs")
    .select("*")
    .in("action", actions)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data || [],
    total: data?.length || 0,
    type,
  });
}
