/**
 * Agent Content Creator
 *
 * Orchestre la création de contenu automatique :
 * 1. Analyse les perfs (via Agent Créa + Agent GA4)
 * 2. Génère des briefs créatifs (Skill Brief Créa)
 * 3. Crée des visuels pub (Skill Ad Creative Generator → Bannerbear)
 * 4. Génère des images IA (Skill Image Generator → Replicate FLUX)
 * 5. Génère des infographies (Skill Infographic Generator → Napkin AI)
 * 6. Prépare un plan de posts social (Skill Post Social)
 * 7. Log tout dans Supabase pour suivi
 *
 * Tourne toutes les 12h — crée du contenu 2x par jour
 */

import { logAction, getConfig, updateLastRun, isDue } from "./base";
import { generateBriefCrea } from "@/services/skills/brief-crea";
import { generateAdCreatives } from "@/services/skills/ad-creative-generator";
import { generateAdImages } from "@/services/skills/image-generator";
import { generateInfographics } from "@/services/skills/infographic-generator";
import { generatePostSocial } from "@/services/skills/post-social";
import {
  buildAdCreativeApproval,
  buildSocialPostApproval,
  buildImageApproval,
  sendApprovalNotification,
} from "@/services/notifications/email-approval";

interface ContentAgentResult {
  status: "success" | "skipped" | "error";
  message: string;
  outputs?: {
    brief?: { urgency: string; recommendations: number };
    adCreatives?: { count: number; batchId: string; bannerbearConnected: boolean };
    aiImages?: { count: number; replicateConnected: boolean };
    infographics?: { count: number; napkinConnected: boolean };
    socialPosts?: { count: number; strategy: string };
  };
}

export async function runContentAgent(): Promise<ContentAgentResult> {
  const config = await getConfig("content");

  if (config && !isDue(config)) {
    return { status: "skipped", message: "Agent Content — pas encore dû (toutes les 12h)" };
  }

  try {
    // ── Step 1: Generate Creative Brief (analyse des perfs) ──
    const briefResult = await generateBriefCrea();
    const briefData = briefResult.data;

    await logAction("content", "brief_generated", {
      urgency: briefData.urgency,
      recommendations: briefData.recommendations.length,
      winningPatterns: briefData.winningPatterns.length,
      losingPatterns: briefData.losingPatterns.length,
    }, "success");

    // ── Step 2: Generate Ad Creatives (via Bannerbear) ──
    const adCount = briefData.urgency === "critical" ? 6 : briefData.urgency === "high" ? 4 : 3;
    const adsResult = await generateAdCreatives(adCount);

    await logAction("content", "ad_creatives_generated", {
      batchId: adsResult.data.batchId,
      count: adsResult.data.totalCreatives,
      strategy: adsResult.data.strategy,
      bannerbearConnected: !!process.env.BANNERBEAR_API_KEY,
    }, "success");

    // ── Step 3: Generate AI Images (via Replicate FLUX) ──
    const imageCount = briefData.urgency === "critical" ? 4 : 2;
    const imagesResult = await generateAdImages(imageCount);

    await logAction("content", "ai_images_generated", {
      count: imagesResult.totalGenerated,
      replicateConnected: imagesResult.replicateConnected,
      successCount: imagesResult.images.filter(i => i.status === "success").length,
    }, "success");

    // ── Step 4: Generate Infographics (via Napkin AI) ──
    const infographicTypes = briefData.urgency === "critical"
      ? ["product-benefits", "comparison", "social-proof"]
      : ["weekly-stats", "product-benefits", "social-proof"];

    const infogResult = await generateInfographics(infographicTypes);

    await logAction("content", "infographics_generated", {
      count: infogResult.data.visuals.length,
      types: infogResult.data.visuals.map(v => v.type),
      napkinConnected: !!process.env.NAPKIN_API_KEY,
    }, "success");

    // ── Step 5: Generate Social Media Plan ──
    const socialResult = await generatePostSocial(7);

    await logAction("content", "social_plan_generated", {
      posts: socialResult.data.posts.length,
      strategy: socialResult.data.strategy,
      platforms: [...new Set(socialResult.data.posts.map(p => p.platform))],
    }, "success");

    // ── Step 6: Send Approval Emails ──
    // Email 1: Créas pub à valider
    const adApproval = buildAdCreativeApproval(
      adsResult.data.creatives.map(c => ({
        headline: c.headline,
        body: c.body,
        hook: c.hook,
        cta: c.cta,
        format: `${c.format} (${c.dimensions})`,
        targetAudience: c.targetAudience,
      }))
    );
    await sendApprovalNotification(adApproval);

    // Email 2: Posts sociaux à valider
    const socialApproval = buildSocialPostApproval(
      socialResult.data.posts.map(p => ({
        platform: p.platform,
        type: p.type,
        caption: p.caption,
        hook: p.hook,
        cta: p.cta,
        hashtags: p.hashtags,
        bestTime: p.bestTime,
      }))
    );
    await sendApprovalNotification(socialApproval);

    // Email 3: Images IA à valider
    if (imagesResult.images.some(i => i.status === "success")) {
      const imageApproval = buildImageApproval(
        imagesResult.images.map(i => ({
          prompt: i.prompt,
          url: i.url,
          format: i.format,
        }))
      );
      await sendApprovalNotification(imageApproval);
    }

    await logAction("content", "approval_emails_sent", {
      emails: ["ad_creatives", "social_posts", "ai_images"],
      to: process.env.APPROVAL_EMAIL || "hello@uburn.co",
    }, "success");

    // ── Update last run ──
    if (config) await updateLastRun("content");

    const result: ContentAgentResult = {
      status: "success",
      message: `Agent Content — Cycle complet : ${adCount} créas pub, ${imagesResult.totalGenerated} images IA, ${infogResult.data.visuals.length} infographies, ${socialResult.data.posts.length} posts planifiés`,
      outputs: {
        brief: { urgency: briefData.urgency, recommendations: briefData.recommendations.length },
        adCreatives: {
          count: adsResult.data.totalCreatives,
          batchId: adsResult.data.batchId,
          bannerbearConnected: !!process.env.BANNERBEAR_API_KEY,
        },
        aiImages: {
          count: imagesResult.totalGenerated,
          replicateConnected: imagesResult.replicateConnected,
        },
        infographics: {
          count: infogResult.data.visuals.length,
          napkinConnected: !!process.env.NAPKIN_API_KEY,
        },
        socialPosts: {
          count: socialResult.data.posts.length,
          strategy: socialResult.data.strategy,
        },
      },
    };

    await logAction("content", "cycle_complete", result.outputs as Record<string, unknown>, "success");

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logAction("content", "error", { error: errorMsg }, "error");
    return { status: "error", message: `Agent Content — Erreur: ${errorMsg}` };
  }
}
