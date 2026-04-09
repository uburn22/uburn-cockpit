/**
 * Agent Manager — Tool Executor
 *
 * Exécute les outils appelés par Claude via function calling.
 * Chaque tool_use du LLM est routé vers le bon skill/agent.
 *
 * Architecture :
 *   Claude décide → tool_use → executor.run() → skill/agent → result → Claude agrège
 */

import { analyzeLandingPage } from "@/services/skills/landing-analyzer";
import { generateABTests } from "@/services/skills/ab-test-generator";
import { generateBriefCrea } from "@/services/skills/brief-crea";
import { generateAdCreatives } from "@/services/skills/ad-creative-generator";
import { generateAdImages, generateSocialImages, generateImage } from "@/services/skills/image-generator";
import { generateInfographics } from "@/services/skills/infographic-generator";
import { generatePostSocial } from "@/services/skills/post-social";
import { generateEmailSequence } from "@/services/skills/email-sequence";
import { generateRapportHebdo } from "@/services/skills/rapport-hebdo";
import { generateAnalyseGA4 } from "@/services/skills/analyse-ga4";
import {
  buildAdCreativeApproval,
  buildSocialPostApproval,
  buildImageApproval,
  buildWeeklyReportEmail,
  buildEmailSequenceApproval,
  sendApprovalNotification,
} from "@/services/notifications/email-approval";
import { logAction } from "@/services/agents/base";
import { getSupabase } from "@/lib/supabase";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

// ── Save generated content to content_library ─────────────
async function saveToLibrary(items: Array<{
  type: string;
  title: string;
  caption: string;
  hook?: string;
  cta?: string;
  hashtags?: string[];
  image_url?: string | null;
  video_url?: string | null;
  platform: string;
  format: string;
  best_time?: string | null;
  priority?: string;
  agent_name: string;
}>): Promise<void> {
  const supabase = getSupabase();
  const rows = items.map(item => ({
    type: item.type,
    status: "ready",
    title: item.title,
    caption: item.caption,
    hook: item.hook || "",
    cta: item.cta || "",
    hashtags: item.hashtags || [],
    image_url: item.image_url || null,
    video_url: item.video_url || null,
    platform: item.platform,
    format: item.format,
    source: "agent",
    agent_name: item.agent_name,
    best_time: item.best_time || null,
    priority: item.priority || "medium",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  await supabase.from("content_library").insert(rows);
}

// ── Store last results for cross-tool access ──────────────
// Allows send_approval_email to reference data from previous tool calls
const sessionResults: Record<string, unknown> = {};

// ── Main executor ─────────────────────────────────────────
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  try {
    switch (toolName) {
      // ── LANDING PAGE ANALYZER ──
      case "analyze_landing_page": {
        const url = toolInput.url as string;
        const pageType = (toolInput.page_type as "shopify_landing" | "site_vitrine") || "shopify_landing";
        const result = await analyzeLandingPage(url, pageType);
        sessionResults["landing_analysis"] = result.analysis;
        await logAction("agent-manager", "landing_analysis_executed", {
          url,
          pageType,
          score: result.analysis.overallScore,
          issues: result.analysis.designIssues.length,
          suggestions: result.analysis.uxSuggestions.length,
        }, "success");
        return JSON.stringify({
          url: result.analysis.url,
          pageType: result.analysis.pageType,
          overallScore: result.analysis.overallScore,
          summary: result.analysis.summary,
          sections: result.analysis.sections,
          designIssues: result.analysis.designIssues,
          uxSuggestions: result.analysis.uxSuggestions,
          conversionOptimizations: result.analysis.conversionOptimizations,
          competitorInsights: result.analysis.competitorInsights,
        });
      }

      // ── A/B TEST GENERATOR ──
      case "generate_ab_tests": {
        const url = toolInput.url as string;
        const pageType = (toolInput.page_type as "shopify_landing" | "site_vitrine") || "shopify_landing";
        const testCount = (toolInput.test_count as number) || 3;
        // Use existing analysis if available from previous tool call
        const existingAnalysis = sessionResults["landing_analysis"] as import("@/services/skills/landing-analyzer").LandingPageAnalysis | undefined;
        const result = await generateABTests(url, pageType, existingAnalysis || undefined, testCount);
        sessionResults["ab_tests"] = result.suite;
        await logAction("agent-manager", "ab_tests_executed", {
          url,
          pageType,
          testCount: result.suite.tests.length,
          totalEstimatedLift: result.suite.totalEstimatedLift,
        }, "success");
        return JSON.stringify({
          url: result.suite.url,
          pageType: result.suite.pageType,
          tests: result.suite.tests.map(t => ({
            testName: t.testName,
            hypothesis: t.hypothesis,
            variantCount: t.variants.length,
            variants: t.variants.map(v => ({
              name: v.name,
              description: v.description,
              changeCount: v.changes.length,
              changes: v.changes,
              expectedImpact: v.expectedImpact,
            })),
            metricsToTrack: t.metricsToTrack,
            estimatedDuration: t.estimatedDuration,
            trafficSplit: t.trafficSplit,
            expectedOutcome: t.expectedOutcome,
            implementationNotes: t.implementationNotes,
          })),
          priorityOrder: result.suite.priorityOrder,
          totalEstimatedLift: result.suite.totalEstimatedLift,
          roadmap: result.suite.roadmap,
        });
      }

      // ── BRIEF CRÉA ──
      case "generate_brief_crea": {
        const result = await generateBriefCrea();
        sessionResults["brief_crea"] = result;
        await logAction("agent-manager", "brief_crea_executed", {
          urgency: result.data.urgency,
          winning: result.data.winningPatterns.length,
          losing: result.data.losingPatterns.length,
        }, "success");
        return JSON.stringify({
          urgency: result.data.urgency,
          winningPatterns: result.data.winningPatterns.slice(0, 3),
          losingPatterns: result.data.losingPatterns.slice(0, 3),
          recommendations: result.data.recommendations,
          hooks: result.data.hooks,
          ctas: result.data.ctas,
        });
      }

      // ── AD CREATIVES ──
      case "generate_ad_creatives": {
        const count = (toolInput.count as number) || 3;
        const result = await generateAdCreatives(count);
        sessionResults["ad_creatives"] = result;
        // Save to content_library
        await saveToLibrary(result.data.creatives.map(c => ({
          type: "ad",
          title: c.headline,
          caption: c.body,
          hook: c.hook,
          cta: c.cta,
          hashtags: [],
          platform: "meta_ads",
          format: c.format,
          agent_name: "Agent Manager",
          priority: "high",
        })));

        await logAction("agent-manager", "ad_creatives_executed", {
          count: result.data.totalCreatives,
          batchId: result.data.batchId,
        }, "success");
        return JSON.stringify({
          batchId: result.data.batchId,
          totalCreatives: result.data.totalCreatives,
          strategy: result.data.strategy,
          creatives: result.data.creatives.map(c => ({
            headline: c.headline,
            hook: c.hook,
            body: c.body,
            cta: c.cta,
            format: c.format,
            dimensions: c.dimensions,
            targetAudience: c.targetAudience,
          })),
        });
      }

      // ── AI IMAGES ──
      case "generate_images": {
        const count = (toolInput.count as number) || 2;
        const type = (toolInput.type as string) || "ad";
        const customPrompt = toolInput.custom_prompt as string | undefined;

        let result;
        if (customPrompt) {
          const fmt = type === "social" ? "feed" : "landscape";
          const sty = type === "lifestyle" ? "lifestyle" : "product";
          const img = await generateImage({
            prompt: customPrompt,
            format: fmt as "feed" | "landscape",
            style: sty as "product" | "lifestyle",
          });
          result = {
            totalGenerated: 1,
            replicateConnected: !!process.env.REPLICATE_API_TOKEN,
            images: [img],
          };
        } else if (type === "social") {
          result = await generateSocialImages(count);
        } else {
          result = await generateAdImages(count);
        }

        sessionResults["ai_images"] = result;
        await logAction("agent-manager", "images_executed", {
          count: result.totalGenerated,
          type,
          connected: result.replicateConnected,
        }, "success");
        return JSON.stringify({
          totalGenerated: result.totalGenerated,
          replicateConnected: result.replicateConnected,
          images: result.images.map(i => ({
            prompt: i.prompt.substring(0, 100) + "...",
            format: i.format,
            status: i.status,
            url: i.url,
          })),
        });
      }

      // ── SOCIAL POSTS ──
      case "generate_social_posts": {
        const count = (toolInput.count as number) || 7;
        const result = await generatePostSocial(count);
        sessionResults["social_posts"] = result;
        // Save to content_library
        await saveToLibrary(result.data.posts.map(p => ({
          type: p.type === "reel" || p.type === "tiktok" ? "instagram_reel" : "instagram_post",
          title: p.hook,
          caption: p.caption,
          hook: p.hook,
          cta: p.cta,
          hashtags: p.hashtags,
          platform: p.platform,
          format: p.type === "reel" ? "reel" : p.type === "story" ? "story" : "feed",
          best_time: p.bestTime,
          priority: p.priority,
          agent_name: "Agent Manager",
        })));

        await logAction("agent-manager", "social_posts_executed", {
          count: result.data.posts.length,
          strategy: result.data.strategy,
        }, "success");
        return JSON.stringify({
          strategy: result.data.strategy,
          totalPosts: result.data.posts.length,
          posts: result.data.posts.map(p => ({
            platform: p.platform,
            type: p.type,
            caption: p.caption.substring(0, 150) + "...",
            hook: p.hook,
            cta: p.cta,
            hashtags: p.hashtags.slice(0, 4),
            bestTime: p.bestTime,
            priority: p.priority,
          })),
        });
      }

      // ── EMAIL SEQUENCE ──
      case "generate_email_sequence": {
        const type = (toolInput.type as string) || "welcome";
        const validTypes = ["abandon", "welcome", "winback", "vip", "post-purchase"] as const;
        const seqType = validTypes.includes(type as typeof validTypes[number])
          ? (type as typeof validTypes[number])
          : "welcome";
        const result = await generateEmailSequence(seqType);
        sessionResults["email_sequence"] = result;
        await logAction("agent-manager", "email_sequence_executed", {
          type: seqType,
          stepCount: result.data.steps.length,
        }, "success");
        return JSON.stringify({
          name: result.data.name,
          type: result.data.type,
          trigger: result.data.trigger,
          totalSteps: result.data.steps.length,
          expectedImpact: result.data.expectedImpact,
          steps: result.data.steps.map(s => ({
            delay: s.delay,
            subject: s.subject,
            preheader: s.preheader,
            bodyPreview: s.body.substring(0, 100) + "...",
            cta: s.cta,
          })),
        });
      }

      // ── INFOGRAPHICS ──
      case "generate_infographics": {
        const types = (toolInput.types as string[]) || ["weekly-stats", "product-benefits"];
        const result = await generateInfographics(types);
        sessionResults["infographics"] = result;
        await logAction("agent-manager", "infographics_executed", {
          count: result.data.visuals.length,
          types,
        }, "success");
        return JSON.stringify({
          totalVisuals: result.data.visuals.length,
          visuals: result.data.visuals.map(v => ({
            type: v.type,
            title: v.title,
            hasImage: !!v.napkinResult?.url,
          })),
        });
      }

      // ── WEEKLY REPORT ──
      case "generate_weekly_report": {
        const result = await generateRapportHebdo();
        sessionResults["weekly_report"] = result;
        await logAction("agent-manager", "weekly_report_executed", {
          highlights: result.data.highlights.length,
          warnings: result.data.warnings.length,
        }, "success");
        return JSON.stringify({
          period: result.data.period,
          revenue: result.data.revenue,
          orders: result.data.orders,
          aov: result.data.aov,
          ads: result.data.ads,
          traffic: result.data.traffic,
          logistics: result.data.logistics,
          highlights: result.data.highlights,
          warnings: result.data.warnings,
          actions: result.data.actions,
        });
      }

      // ── GA4 ANALYSIS ──
      case "analyze_ga4": {
        const result = await generateAnalyseGA4();
        sessionResults["ga4_analysis"] = result;
        await logAction("agent-manager", "ga4_analysis_executed", {
          insights: result.data.insights.length,
        }, "success");
        return JSON.stringify({
          period: result.data.period,
          overview: result.data.overview,
          sources: result.data.sources,
          funnel: result.data.funnel,
          insights: result.data.insights,
          recommendations: result.data.recommendations,
        });
      }

      // ── RUN AGENT ──
      case "run_agent": {
        const agent = toolInput.agent as string;
        try {
          const res = await fetch(`${BASE_URL}/api/agents/${agent}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) {
            return JSON.stringify({ status: "error", message: `Agent ${agent} returned ${res.status}` });
          }
          const data = await res.json();
          sessionResults[`agent_${agent}`] = data;
          return JSON.stringify(data);
        } catch (e) {
          return JSON.stringify({ status: "error", message: `Failed to run agent ${agent}: ${e}` });
        }
      }

      // ── SEND APPROVAL EMAIL ──
      case "send_approval_email": {
        const type = toolInput.type as string;
        let emailData: { subject: string; html: string } | null = null;

        switch (type) {
          case "ad_creative": {
            const adsData = sessionResults["ad_creatives"] as { data: { creatives: Array<{ headline: string; body: string; hook: string; cta: string; format: string; dimensions: string; targetAudience: string }> } } | undefined;
            if (adsData) {
              emailData = buildAdCreativeApproval(
                adsData.data.creatives.map(c => ({
                  headline: c.headline,
                  body: c.body,
                  hook: c.hook,
                  cta: c.cta,
                  format: `${c.format} (${c.dimensions})`,
                  targetAudience: c.targetAudience,
                }))
              );
            }
            break;
          }
          case "social_post": {
            const socialData = sessionResults["social_posts"] as { data: { posts: Array<{ platform: string; type: string; caption: string; hook: string; cta: string; hashtags: string[]; bestTime: string }> } } | undefined;
            if (socialData) {
              emailData = buildSocialPostApproval(
                socialData.data.posts.map(p => ({
                  platform: p.platform,
                  type: p.type,
                  caption: p.caption,
                  hook: p.hook,
                  cta: p.cta,
                  hashtags: p.hashtags,
                  bestTime: p.bestTime,
                }))
              );
            }
            break;
          }
          case "ai_image": {
            const imgData = sessionResults["ai_images"] as { images: Array<{ prompt: string; url: string | null; format: string }> } | undefined;
            if (imgData) {
              emailData = buildImageApproval(
                imgData.images.map(i => ({
                  prompt: i.prompt,
                  url: i.url,
                  format: i.format,
                }))
              );
            }
            break;
          }
          case "weekly_report": {
            const reportData = sessionResults["weekly_report"] as { data: { highlights: string[]; warnings: string[]; actions: string[]; period: string } } | undefined;
            if (reportData) {
              const reportText = [
                `Période : ${reportData.data.period}`,
                `\nPoints forts :\n${reportData.data.highlights.map(h => `- ${h}`).join("\n")}`,
                `\nAlertes :\n${reportData.data.warnings.map(w => `- ${w}`).join("\n")}`,
                `\nActions prioritaires :\n${reportData.data.actions.map(a => `- ${a}`).join("\n")}`,
              ].join("\n");
              emailData = buildWeeklyReportEmail(reportText);
            }
            break;
          }
          case "email_sequence": {
            const seqData = sessionResults["email_sequence"] as { data: { name: string; steps: Array<{ subject: string; body: string; delay: string }> } } | undefined;
            if (seqData) {
              emailData = buildEmailSequenceApproval(
                seqData.data.name,
                seqData.data.steps.map(s => ({
                  subject: s.subject,
                  body: s.body,
                  delay: s.delay,
                }))
              );
            }
            break;
          }
        }

        if (!emailData) {
          return JSON.stringify({
            success: false,
            message: `Pas de contenu ${type} disponible. Génère d'abord le contenu avant d'envoyer l'email d'approbation.`,
          });
        }

        const sendResult = await sendApprovalNotification(emailData);
        await logAction("agent-manager", "approval_email_sent", {
          type,
          to: process.env.APPROVAL_EMAIL || "hello@uburn.co",
          success: sendResult.success,
        }, sendResult.success ? "success" : "warning");

        return JSON.stringify({
          success: sendResult.success,
          method: sendResult.method,
          sentTo: process.env.APPROVAL_EMAIL || "hello@uburn.co",
          type,
        });
      }

      default:
        return JSON.stringify({ error: `Tool inconnu: ${toolName}` });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logAction("agent-manager", `${toolName}_error`, { error: errorMsg }, "error");
    return JSON.stringify({ error: errorMsg });
  }
}

// ── Clear session results ─────────────────────────────────
export function clearSessionResults(): void {
  for (const key of Object.keys(sessionResults)) {
    delete sessionResults[key];
  }
}
