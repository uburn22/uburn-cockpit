import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/content/publish
 *
 * Publie du contenu sur Instagram via Meta Graph API.
 *
 * Flow :
 * 1. Upload l'image sur Meta (container)
 * 2. Publie le container avec la caption
 * 3. Met à jour le status dans content_library
 *
 * Requires :
 * - META_ACCESS_TOKEN (avec permissions instagram_basic, instagram_content_publish)
 * - INSTAGRAM_BUSINESS_ACCOUNT_ID
 */

const META_TOKEN = process.env.META_ACCESS_TOKEN;
const IG_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await req.json();
    const { content_id, caption, image_url, video_url, type } = body;

    if (!META_TOKEN || !IG_ACCOUNT_ID) {
      // Fallback : marquer comme "ready" si pas de credentials Instagram
      if (content_id) {
        await supabase
          .from("content_library")
          .update({
            status: "ready",
            updated_at: new Date().toISOString(),
          })
          .eq("id", content_id);
      }

      return NextResponse.json({
        success: false,
        message: "Instagram Business Account non configuré. Contenu marqué comme 'ready' — publie manuellement.",
        manual_publish: true,
      });
    }

    const isVideo = type === "instagram_reel" || !!video_url;
    let containerId: string;

    if (isVideo && video_url) {
      // ── Step 1a: Create video container (Reel) ──
      const containerRes = await fetch(
        `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "REELS",
            video_url: video_url,
            caption: caption || "",
            access_token: META_TOKEN,
          }),
        }
      );
      const containerData = await containerRes.json();

      if (containerData.error) {
        return NextResponse.json({
          success: false,
          error: containerData.error.message,
        }, { status: 400 });
      }
      containerId = containerData.id;

      // Wait for video processing (poll status)
      let videoReady = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 5000)); // 5s intervals
        const statusRes = await fetch(
          `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${META_TOKEN}`
        );
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") {
          videoReady = true;
          break;
        }
        if (statusData.status_code === "ERROR") {
          return NextResponse.json({
            success: false,
            error: "Erreur de traitement vidéo Meta",
          }, { status: 400 });
        }
      }

      if (!videoReady) {
        return NextResponse.json({
          success: false,
          error: "Timeout — la vidéo met trop de temps à être traitée par Meta",
        }, { status: 408 });
      }
    } else if (image_url) {
      // ── Step 1b: Create image container ──
      const containerRes = await fetch(
        `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: image_url,
            caption: caption || "",
            access_token: META_TOKEN,
          }),
        }
      );
      const containerData = await containerRes.json();

      if (containerData.error) {
        return NextResponse.json({
          success: false,
          error: containerData.error.message,
        }, { status: 400 });
      }
      containerId = containerData.id;
    } else {
      return NextResponse.json({
        success: false,
        error: "image_url ou video_url requis pour publier",
      }, { status: 400 });
    }

    // ── Step 2: Publish the container ──
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: META_TOKEN,
        }),
      }
    );
    const publishData = await publishRes.json();

    if (publishData.error) {
      return NextResponse.json({
        success: false,
        error: publishData.error.message,
      }, { status: 400 });
    }

    // ── Step 3: Update content_library ──
    if (content_id) {
      await supabase
        .from("content_library")
        .update({
          status: "published",
          meta_post_id: publishData.id,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", content_id);
    }

    return NextResponse.json({
      success: true,
      meta_post_id: publishData.id,
      message: "Publié sur Instagram avec succès !",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
