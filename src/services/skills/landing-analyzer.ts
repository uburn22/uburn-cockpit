/**
 * Landing Page Analyzer Skill
 *
 * Analyse une page web (landing page Shopify ou site vitrine)
 * et génère des suggestions UX/design + score de conversion.
 *
 * Flow :
 *   1. Fetch la page (HTML brut)
 *   2. Extrait les éléments clés (headings, CTA, images, structure)
 *   3. Envoie à Claude pour analyse UX/conversion
 *   4. Retourne un rapport structuré
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// ── Types ────────────────────────────────────────────────

export interface LandingPageAnalysis {
  url: string;
  pageType: "shopify_landing" | "site_vitrine" | "other";
  overallScore: number; // 0-100
  sections: AnalysisSection[];
  designIssues: DesignIssue[];
  uxSuggestions: UxSuggestion[];
  conversionOptimizations: ConversionTip[];
  competitorInsights: string[];
  summary: string;
}

interface AnalysisSection {
  name: string;
  score: number;
  feedback: string;
}

interface DesignIssue {
  severity: "critical" | "major" | "minor";
  element: string;
  issue: string;
  suggestion: string;
}

interface UxSuggestion {
  category: "navigation" | "cta" | "copy" | "layout" | "mobile" | "speed" | "trust" | "visual";
  priority: "high" | "medium" | "low";
  current: string;
  recommended: string;
  expectedImpact: string;
}

interface ConversionTip {
  area: string;
  action: string;
  reason: string;
  estimatedLift: string;
}

// ── HTML extraction helpers ──────────────────────────────

function extractPageStructure(html: string): string {
  // Extract key elements from HTML for analysis
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
  const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || [];
  const h3Matches = html.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi) || [];
  const buttonMatches = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
  const linkMatches = html.match(/<a[^>]*>[\s\S]*?<\/a>/gi) || [];
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  const formMatches = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
  const videoMatches = html.match(/<video[^>]*>/gi) || [];

  // Check for common trust elements
  const hasTestimonials = /testimonial|review|avis|témoignage/i.test(html);
  const hasSocialProof = /client|customer|utilisateur|user.*count|avis/i.test(html);
  const hasFAQ = /faq|question.*fréquent|frequently.*asked/i.test(html);
  const hasGuarantee = /garantie|guarantee|remboursement|refund/i.test(html);

  // Check mobile meta
  const hasViewport = /viewport/i.test(html);
  const hasLazyLoading = /loading=["']lazy["']/i.test(html);

  const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();

  return `
=== PAGE STRUCTURE ANALYSIS ===
Title: ${titleMatch ? stripTags(titleMatch[1]) : "MISSING"}
Meta Description: ${metaDescMatch ? metaDescMatch[1] : "MISSING"}
Viewport Meta: ${hasViewport ? "Present" : "MISSING"}

=== HEADINGS ===
H1 (${h1Matches.length}): ${h1Matches.map(stripTags).join(" | ") || "NONE"}
H2 (${h2Matches.length}): ${h2Matches.slice(0, 8).map(stripTags).join(" | ") || "NONE"}
H3 (${h3Matches.length}): ${h3Matches.slice(0, 6).map(stripTags).join(" | ") || "NONE"}

=== CTAs & BUTTONS ===
Buttons (${buttonMatches.length}): ${buttonMatches.slice(0, 10).map(stripTags).join(" | ") || "NONE"}
Links with CTA keywords: ${linkMatches.filter(l => /achet|buy|command|order|essai|try|découvr|ajout|cart|panier/i.test(l)).slice(0, 6).map(stripTags).join(" | ") || "NONE"}

=== MEDIA ===
Images: ${imgMatches.length}
Videos: ${videoMatches.length}
Lazy Loading: ${hasLazyLoading ? "Yes" : "No"}

=== FORMS ===
Forms: ${formMatches.length}

=== TRUST ELEMENTS ===
Testimonials/Reviews: ${hasTestimonials ? "Found" : "Not found"}
Social Proof: ${hasSocialProof ? "Found" : "Not found"}
FAQ: ${hasFAQ ? "Found" : "Not found"}
Guarantee/Refund: ${hasGuarantee ? "Found" : "Not found"}

=== RAW TEXT (first 3000 chars) ===
${html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000)}
`;
}

// ── Main analyzer function ───────────────────────────────

export async function analyzeLandingPage(
  url: string,
  pageType: "shopify_landing" | "site_vitrine" = "shopify_landing"
): Promise<{ analysis: LandingPageAnalysis; raw: string }> {
  // Step 1: Fetch the page
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    throw new Error(`Impossible de charger la page ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Step 2: Extract structure
  const structure = extractPageStructure(html);

  // Step 3: AI Analysis
  const prompt = `Tu es un expert CRO (Conversion Rate Optimization) et UX designer spécialisé e-commerce.
Analyse cette landing page pour Uburn, une boisson wellness française à base d'ube (igname violette des Philippines).
Couleurs de marque : violet #6B21A8, or #C9A84C, noir #0A0A0A.
Objectif : 100 commandes/jour.

URL analysée : ${url}
Type de page : ${pageType === "shopify_landing" ? "Landing page Shopify (page produit/boutique)" : "Site vitrine (branding/storytelling)"}

${structure}

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "overallScore": <0-100>,
  "sections": [
    {"name": "Hero Section", "score": <0-100>, "feedback": "..."},
    {"name": "Value Proposition", "score": <0-100>, "feedback": "..."},
    {"name": "Social Proof", "score": <0-100>, "feedback": "..."},
    {"name": "CTA Strategy", "score": <0-100>, "feedback": "..."},
    {"name": "Mobile Experience", "score": <0-100>, "feedback": "..."},
    {"name": "Page Speed Signals", "score": <0-100>, "feedback": "..."},
    {"name": "Trust & Credibility", "score": <0-100>, "feedback": "..."}
  ],
  "designIssues": [
    {"severity": "critical|major|minor", "element": "...", "issue": "...", "suggestion": "..."}
  ],
  "uxSuggestions": [
    {"category": "navigation|cta|copy|layout|mobile|speed|trust|visual", "priority": "high|medium|low", "current": "Ce qui est actuellement", "recommended": "Ce qu'il faudrait", "expectedImpact": "Impact attendu"}
  ],
  "conversionOptimizations": [
    {"area": "...", "action": "Action concrète", "reason": "Pourquoi", "estimatedLift": "+X% conversion"}
  ],
  "competitorInsights": ["Insight 1 vs concurrents wellness/DTC", "..."],
  "summary": "Résumé en 3-4 phrases de l'état de la page et les priorités"
}

Sois précis, actionnable et data-driven. Donne au moins 5 suggestions UX, 4 optimisations conversion et 3 problèmes design.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Analyse IA invalide — pas de JSON retourné");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const analysis: LandingPageAnalysis = {
    url,
    pageType,
    overallScore: parsed.overallScore || 0,
    sections: parsed.sections || [],
    designIssues: parsed.designIssues || [],
    uxSuggestions: parsed.uxSuggestions || [],
    conversionOptimizations: parsed.conversionOptimizations || [],
    competitorInsights: parsed.competitorInsights || [],
    summary: parsed.summary || "",
  };

  return { analysis, raw: text };
}
