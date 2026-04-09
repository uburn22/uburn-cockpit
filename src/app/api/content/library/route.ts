import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * Content Library API
 *
 * CRUD pour tout le contenu généré par les agents IA ou uploadé par Charles.
 * Stocké dans Supabase table "content_library".
 *
 * Table schema :
 *   id          uuid PK
 *   type        text (ad | instagram_post | instagram_reel | email_sequence)
 *   status      text (draft | ai_review | ready | scheduled | published | rejected)
 *   title       text
 *   caption     text
 *   hook        text
 *   cta         text
 *   hashtags    text[]
 *   image_url   text
 *   video_url   text
 *   platform    text (instagram | facebook | tiktok | meta_ads | email)
 *   format      text (feed | story | reel | carrousel | landscape | square)
 *   ai_suggestions jsonb
 *   source      text (agent | manual)
 *   agent_name  text
 *   best_time   text
 *   priority    text (high | medium | low)
 *   meta_post_id text (ID retourné par Meta après publication)
 *   created_at  timestamptz
 *   updated_at  timestamptz
 *   published_at timestamptz
 */

// ── GET — Fetch content library ──────────────────────────
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const type = req.nextUrl.searchParams.get("type");
  const status = req.nextUrl.searchParams.get("status");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

  let query = supabase
    .from("content_library")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type && type !== "all") {
    query = query.eq("type", type);
  }
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [], total: data?.length || 0 });
}

// ── POST — Create new content ────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();

  const contentItem = {
    type: body.type || "instagram_post",
    status: body.status || "draft",
    title: body.title || "",
    caption: body.caption || "",
    hook: body.hook || "",
    cta: body.cta || "",
    hashtags: body.hashtags || [],
    image_url: body.image_url || null,
    video_url: body.video_url || null,
    platform: body.platform || "instagram",
    format: body.format || "feed",
    ai_suggestions: body.ai_suggestions || null,
    source: body.source || "manual",
    agent_name: body.agent_name || null,
    best_time: body.best_time || null,
    priority: body.priority || "medium",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("content_library")
    .insert(contentItem)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

// ── PUT — Update content (status, caption, etc.) ─────────
export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("content_library")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

// ── DELETE — Remove content ──────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("content_library")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
