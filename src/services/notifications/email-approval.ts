/**
 * Email Approval Notification Service
 *
 * Envoie des emails de validation à Charles quand un agent génère du contenu.
 * Rien ne se publie sans approbation.
 *
 * Types de notifications :
 * - Nouvelles créas pub générées → email avec preview + copy
 * - Posts sociaux proposés → email avec caption + hook + visuel
 * - Images IA générées → email avec les URLs des images
 * - Séquences email proposées → email avec le contenu des séquences
 * - Rapports hebdo → email avec le rapport complet
 */

const NOTIFY_EMAIL = process.env.APPROVAL_EMAIL || "hello@uburn.co";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

// ── Types ───────────────────────────────────────────────
interface ApprovalRequest {
  type: "ad_creative" | "social_post" | "ai_image" | "email_sequence" | "weekly_report" | "brief_crea";
  title: string;
  summary: string;
  items: ApprovalItem[];
  agentName: string;
  urgency: "low" | "medium" | "high" | "critical";
}

interface ApprovalItem {
  name: string;
  details: string;
  imageUrl?: string;
  platform?: string;
  format?: string;
}

// ── Build HTML email ────────────────────────────────────
function buildApprovalEmail(request: ApprovalRequest): { subject: string; html: string } {
  const urgencyColors: Record<string, string> = {
    low: "#22c55e",
    medium: "#C9A84C",
    high: "#f97316",
    critical: "#ef4444",
  };

  const urgencyLabels: Record<string, string> = {
    low: "🟢 Normal",
    medium: "🟡 Moyen",
    high: "🟠 Urgent",
    critical: "🔴 Critique",
  };

  const typeLabels: Record<string, string> = {
    ad_creative: "🎨 Créas Publicitaires",
    social_post: "📱 Posts Sociaux",
    ai_image: "🖼️ Images IA",
    email_sequence: "✉️ Séquence Email",
    weekly_report: "📊 Rapport Hebdomadaire",
    brief_crea: "📝 Brief Créatif",
  };

  const subject = `[Uburn Cockpit] ${typeLabels[request.type] || request.type} — ${request.title}`;

  const itemsHtml = request.items.map((item, i) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #333;">
        <div style="display: flex; gap: 12px;">
          ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />` : ""}
          <div>
            <h3 style="margin: 0 0 4px 0; color: #C9A84C; font-size: 14px;">${i + 1}. ${item.name}</h3>
            ${item.platform ? `<span style="color: #888; font-size: 12px;">📍 ${item.platform}</span>` : ""}
            ${item.format ? `<span style="color: #888; font-size: 12px; margin-left: 8px;">📐 ${item.format}</span>` : ""}
            <pre style="color: #ccc; font-size: 13px; margin: 8px 0 0 0; white-space: pre-wrap; font-family: -apple-system, sans-serif;">${item.details}</pre>
          </div>
        </div>
      </td>
    </tr>
  `).join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%); border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h1 style="margin: 0; color: #C9A84C; font-size: 20px;">⚡ Uburn Cockpit</h1>
        <span style="background: ${urgencyColors[request.urgency]}22; color: ${urgencyColors[request.urgency]}; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
          ${urgencyLabels[request.urgency]}
        </span>
      </div>
      <p style="color: #888; margin: 8px 0 0 0; font-size: 13px;">🤖 Généré par ${request.agentName}</p>
    </div>

    <!-- Title -->
    <div style="background: #111; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 18px;">${typeLabels[request.type]} — ${request.title}</h2>
      <p style="color: #aaa; margin: 0; font-size: 14px;">${request.summary}</p>
    </div>

    <!-- Items -->
    <div style="background: #111; border: 1px solid #333; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 12px 16px; text-align: left; color: #C9A84C; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #333;">
              Contenu à valider (${request.items.length} éléments)
            </th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Action buttons -->
    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${BASE_URL}/agents" style="display: inline-block; background: #C9A84C; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 4px;">
        Voir dans le Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 16px; color: #555; font-size: 11px;">
      <p>Cet email a été envoyé automatiquement par le Cockpit Uburn.</p>
      <p>Réponds à cet email pour donner des instructions aux agents.</p>
    </div>

  </div>
</body>
</html>`.trim();

  return { subject, html };
}

// ── Send approval for ad creatives ──────────────────────
export function buildAdCreativeApproval(creatives: Array<{
  headline: string;
  body: string;
  hook: string;
  cta: string;
  format: string;
  targetAudience: string;
}>): { subject: string; html: string } {
  return buildApprovalEmail({
    type: "ad_creative",
    title: `${creatives.length} nouvelles créas à valider`,
    summary: "L'Agent Content a généré de nouvelles créatives publicitaires basées sur l'analyse des performances.",
    agentName: "Agent Content",
    urgency: "high",
    items: creatives.map((c) => ({
      name: c.headline,
      format: c.format,
      details: `🎣 Hook: ${c.hook}\n📝 ${c.body}\n🔘 CTA: ${c.cta}\n🎯 Audience: ${c.targetAudience}`,
    })),
  });
}

// ── Send approval for social posts ──────────────────────
export function buildSocialPostApproval(posts: Array<{
  platform: string;
  type: string;
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  bestTime: string;
}>): { subject: string; html: string } {
  return buildApprovalEmail({
    type: "social_post",
    title: `${posts.length} posts à valider`,
    summary: "L'Agent Content propose ces posts pour la semaine. Valide ou modifie avant publication.",
    agentName: "Agent Content",
    urgency: "medium",
    items: posts.map((p) => ({
      name: `${p.platform.toUpperCase()} — ${p.type}`,
      platform: p.platform,
      format: p.type,
      details: `🎣 Hook: ${p.hook}\n📝 ${p.caption.substring(0, 200)}...\n📢 CTA: ${p.cta}\n#️⃣ ${p.hashtags.slice(0, 4).join(" ")}\n🕐 Meilleur moment: ${p.bestTime}`,
    })),
  });
}

// ── Send approval for AI images ─────────────────────────
export function buildImageApproval(images: Array<{
  prompt: string;
  url: string | null;
  format: string;
}>): { subject: string; html: string } {
  return buildApprovalEmail({
    type: "ai_image",
    title: `${images.length} images IA générées`,
    summary: "Replicate FLUX a généré ces images. Vérifie la qualité avant utilisation.",
    agentName: "Agent Content (Replicate FLUX)",
    urgency: "medium",
    items: images.map((img, i) => ({
      name: `Image ${i + 1} (${img.format})`,
      imageUrl: img.url || undefined,
      format: img.format,
      details: `🖼️ Prompt: ${img.prompt.substring(0, 150)}...\n🔗 ${img.url || "Image non disponible (mode mock)"}`,
    })),
  });
}

// ── Send weekly report ──────────────────────────────────
export function buildWeeklyReportEmail(report: string): { subject: string; html: string } {
  return buildApprovalEmail({
    type: "weekly_report",
    title: "Bilan de la semaine",
    summary: "Rapport automatique généré par l'Agent Growth.",
    agentName: "Agent Growth",
    urgency: "low",
    items: [{
      name: "Rapport complet",
      details: report,
    }],
  });
}

// ── Send email sequence for approval ────────────────────
export function buildEmailSequenceApproval(
  sequenceName: string,
  emails: Array<{ subject: string; body: string; delay: string }>
): { subject: string; html: string } {
  return buildApprovalEmail({
    type: "email_sequence",
    title: sequenceName,
    summary: "Nouvelle séquence email à configurer dans ton outil d'emailing.",
    agentName: "Agent Email/CRM",
    urgency: "medium",
    items: emails.map((e) => ({
      name: `${e.delay} — ${e.subject}`,
      details: e.body.substring(0, 300) + "...",
    })),
  });
}

// ── Generic notification sender via API ─────────────────
export async function sendApprovalNotification(
  emailData: { subject: string; html: string }
): Promise<{ success: boolean; method: string }> {
  // Use internal API to create notification
  try {
    const res = await fetch(`${BASE_URL}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: NOTIFY_EMAIL,
        subject: emailData.subject,
        html: emailData.html,
      }),
    });
    if (res.ok) return { success: true, method: "api" };
    return { success: false, method: "api_failed" };
  } catch {
    // Fallback: log to Supabase for dashboard display
    return { success: false, method: "fallback_log" };
  }
}
