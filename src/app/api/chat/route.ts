import { NextRequest, NextResponse } from "next/server";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { getRecentLogs, getAllConfigs } from "@/services/agents/base";
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_TOOLS } from "@/services/agent-manager/tools";
import { executeTool, clearSessionResults } from "@/services/agent-manager/executor";

// ── Anthropic client ────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// ── Helpers to fetch internal data ─────────────────────
// Priority: explicit NEXT_PUBLIC_BASE_URL → Vercel auto-detected URL → localhost
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");

async function fetchInternal(path: string, days = 30): Promise<unknown> {
  const now = new Date();
  const from = format(subDays(now, days), "yyyy-MM-dd");
  const to = format(now, "yyyy-MM-dd");
  const url = `${BASE_URL}${path}?from=${from}&to=${to}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { error: `API ${path} returned ${res.status}` };
    return res.json();
  } catch (e) {
    return { error: `Failed to fetch ${path}: ${e}` };
  }
}

// ── Gather all live data for context ────────────────────
async function gatherBusinessContext(): Promise<string> {
  const [shopify, metaAds, sendcloud, ga4, agentConfigs, agentLogs] =
    await Promise.all([
      fetchInternal("/api/shopify"),
      fetchInternal("/api/meta-ads"),
      fetchInternal("/api/sendcloud"),
      fetchInternal("/api/ga4"),
      getAllConfigs().catch(() => []),
      getRecentLogs(20).catch(() => []),
    ]);

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return `
═══ DONNÉES BUSINESS UBURN EN TEMPS RÉEL ═══
Date : ${today}
Objectif principal : atteindre 100 commandes/jour

── SHOPIFY (30 derniers jours) ──
${JSON.stringify(shopify, null, 2)}

── META ADS (30 derniers jours) ──
${JSON.stringify(metaAds, null, 2)}

── SENDCLOUD / LOGISTIQUE (30 derniers jours) ──
${JSON.stringify(sendcloud, null, 2)}

── GA4 / ANALYTICS (30 derniers jours) ──
${JSON.stringify(ga4, null, 2)}

── AGENTS IA (configuration) ──
${JSON.stringify(agentConfigs, null, 2)}

── LOGS AGENTS (20 derniers) ──
${JSON.stringify(agentLogs, null, 2)}
═══════════════════════════════════════════
`.trim();
}

// ── System prompt — Agent Manager ──────────────────────
const SYSTEM_PROMPT = `Tu es l'AGENT MANAGER du Cockpit Uburn — le cerveau central qui orchestre 8 agents IA et 7 skills pour piloter le e-commerce d'Uburn, une boisson wellness française à base d'ube.

TON RÔLE — AGENT MANAGER :
Tu n'es PAS un simple chatbot. Tu es un ORCHESTRATEUR intelligent.
Quand Charles te demande quelque chose, tu :
1. ANALYSES sa demande et décides quels outils utiliser
2. APPELLES les outils nécessaires (skills, agents, notifications)
3. ORCHESTRES la séquence : analyse → création → validation
4. AGRÈGES tous les résultats en une réponse claire
5. PROPOSES d'envoyer un email d'approbation si du contenu a été généré

RÈGLES D'ORCHESTRATION :
- Si Charles demande du CONTENU (pubs, posts, images) → appelle les skills de création
- Si Charles demande une ANALYSE → appelle les skills d'analyse
- Si Charles demande un DIAGNOSTIC → utilise les données live + lance les agents pertinents
- TOUJOURS proposer d'envoyer un email d'approbation après avoir généré du contenu
- TOUJOURS commencer par le brief créa avant de générer des pubs (pour s'appuyer sur les données)
- Tu peux appeler PLUSIEURS outils en séquence pour une seule demande

FLOW TYPIQUE — "Je veux 5 pubs" :
1. generate_brief_crea → analyse les perfs actuelles
2. generate_ad_creatives(count=5) → crée 5 créas basées sur le brief
3. generate_images(count=3, type="ad") → images IA pour accompagner
4. send_approval_email(type="ad_creative") → email de validation à Charles

FLOW TYPIQUE — "Fais-moi un plan social" :
1. generate_brief_crea → comprendre le contexte performance
2. generate_social_posts(count=7) → plan de la semaine
3. generate_images(count=2, type="social") → visuels pour les posts
4. send_approval_email(type="social_post") → email de validation

FLOW TYPIQUE — "Comment va mon business ?" :
1. analyze_ga4 → état du trafic
2. run_agent(agent="growth") → rapport quotidien complet
3. Synthétiser le tout

FLOW TYPIQUE — "Analyse ma landing page / mon site" :
1. analyze_landing_page(url, page_type) → audit UX/design complet avec score
2. generate_ab_tests(url, page_type) → plans d'A/B tests concrets basés sur l'audit
3. Synthétiser les priorités et le roadmap

FLOW TYPIQUE — "Je veux optimiser mon taux de conversion" :
1. analyze_landing_page(url="https://uburn.co", page_type="shopify_landing") → audit page Shopify
2. analyze_landing_page(url="https://...", page_type="site_vitrine") → audit site vitrine
3. generate_ab_tests pour chaque page → plans de tests
4. Synthétiser un plan CRO global

CAPACITÉS DISPONIBLES :
═══ 9 SKILLS (outils de génération & analyse) ═══
1. generate_brief_crea — Brief créatif (analyse patterns gagnants/perdants, hooks, CTAs)
2. generate_ad_creatives — Créas pub (6 formats, Bannerbear)
3. generate_images — Images IA (Replicate FLUX, haute qualité)
4. generate_social_posts — Plan social Instagram/TikTok/Facebook
5. generate_email_sequence — Séquences email (abandon, welcome, winback, VIP, post-achat)
6. generate_infographics — Infographies (stats, comparatifs, funnel)
7. generate_weekly_report — Rapport hebdo complet
8. analyze_ga4 — Analyse GA4 approfondie
9. analyze_landing_page — Audit UX/design d'une landing page (score, problèmes, suggestions)
10. generate_ab_tests — Génération de plans A/B tests (variantes, CSS/HTML, hypothèses, métriques)

═══ 8 AGENTS AUTONOMES (tournent sur cron + lancement manuel) ═══
1. meta-ads (4h) — Pause/scale créas, alertes ROAS
2. shopify (6h) — AOV, commandes, repeat customers
3. sendcloud (2h) — Colis bloqués, delivery rate
4. email-crm (3h) — Paniers abandonnés, segments
5. ga4 (4h) — Trafic, anomalies
6. crea (6h) — Performance créative, fatigue
7. growth (24h) — Rapport quotidien, 3 actions prioritaires
8. content (12h) — Cycle complet création contenu

═══ NOTIFICATIONS ═══
- send_approval_email — Envoie un email HTML brandé Uburn pour validation

STYLE DE RÉPONSE :
- Sois direct, concret et orienté action
- Utilise des chiffres réels des données live
- Après chaque génération de contenu, propose l'email d'approbation
- Formate proprement avec des emojis et structure claire
- Réponds TOUJOURS en français

CONTEXTE :
- Uburn vend en DTC via Shopify
- Acquisition via Meta Ads (Facebook/Instagram)
- Analytics via GA4
- Logistique via Sendcloud
- Marché : France
- CEO : Charles (hello@uburn.co)`;

// ── Conversation types ──────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── API Route ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      response: "Clé API Anthropic manquante. Ajoute ANTHROPIC_API_KEY dans .env.local.",
      intent: "error",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { message, history } = (await req.json()) as {
      message: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // Clear session results for fresh tool execution context
    clearSessionResults();

    // Gather live business data
    const businessContext = await gatherBusinessContext();

    // Build messages array with history
    const messages: Anthropic.Messages.MessageParam[] = [];

    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-20);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({
      role: "user",
      content: `${businessContext}\n\n── DEMANDE DE CHARLES ──\n${message}`,
    });

    // ── Agentic loop: Claude calls tools until done ──
    const currentMessages = [...messages];
    let finalText = "";
    let iterations = 0;
    const MAX_ITERATIONS = 8; // Safety limit

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        messages: currentMessages,
      });

      // Collect text blocks from response
      const textBlocks = response.content.filter(b => b.type === "text");
      const toolUseBlocks = response.content.filter(b => b.type === "tool_use");

      // If no tool calls, we're done — collect final text
      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
        finalText = textBlocks.map(b => {
          if (b.type === "text") return b.text;
          return "";
        }).join("\n");
        break;
      }

      // Process tool calls
      // Add assistant message with tool_use to conversation
      currentMessages.push({
        role: "assistant",
        content: response.content,
      });

      // Execute each tool call and build tool_result messages
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        if (block.type === "tool_use") {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Add tool results to conversation
      currentMessages.push({
        role: "user",
        content: toolResults,
      });

      // Also capture any intermediate text
      if (textBlocks.length > 0) {
        const intermediateText = textBlocks.map(b => {
          if (b.type === "text") return b.text;
          return "";
        }).join("\n");
        if (intermediateText.trim()) {
          finalText += intermediateText + "\n\n";
        }
      }
    }

    // If we hit max iterations, add a note
    if (iterations >= MAX_ITERATIONS && !finalText) {
      finalText = "J'ai atteint la limite d'exécution. Voici ce qui a été fait — relance-moi pour continuer.";
    }

    return NextResponse.json({
      response: finalText || "Traitement terminé.",
      intent: "agent-manager",
      iterations,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("Agent Manager error:", err);
    const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";

    if (errorMessage.includes("401") || errorMessage.includes("authentication")) {
      return NextResponse.json({
        response: "Clé API Anthropic invalide. Vérifie ta clé dans .env.local.",
        intent: "error",
        timestamp: new Date().toISOString(),
      });
    }

    if (errorMessage.includes("429") || errorMessage.includes("rate")) {
      return NextResponse.json({
        response: "Trop de requêtes. Attends quelques secondes et réessaie.",
        intent: "error",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      response: `Erreur : ${errorMessage.substring(0, 200)}. Réessaie dans quelques secondes.`,
      intent: "error",
      timestamp: new Date().toISOString(),
    });
  }
}
