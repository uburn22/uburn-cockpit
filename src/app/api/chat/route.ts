import { NextRequest, NextResponse } from "next/server";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { getRecentLogs, getAllConfigs } from "@/services/agents/base";
import Anthropic from "@anthropic-ai/sdk";

// ── Anthropic client ────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// ── Helpers to fetch internal data ─────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

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

// ── System prompt ───────────────────────────────────────
const SYSTEM_PROMPT = `Tu es l'assistant IA du Cockpit Uburn, le dashboard e-commerce de la marque Uburn — une boisson wellness française à base d'ube (igname violette).

TON RÔLE :
- Tu es un expert e-commerce, growth marketing et acquisition digitale.
- Tu aides Charles (CEO d'Uburn) à piloter son business vers l'objectif de 100 commandes/jour.
- Tu as accès aux données en temps réel de Shopify, Meta Ads, GA4, Sendcloud et des agents IA autonomes.
- Tu réponds TOUJOURS en français.

CE QUE TU PEUX FAIRE :
1. **Analyser les données** — ROAS, CPO, AOV, CA, taux de livraison, sessions GA4, sources de trafic, etc.
2. **Recommander des stratégies** — acquisition, rétention, pricing, créatives, audiences, SEO, email
3. **Générer des rapports** — bilans hebdo, analyses de performance, rapports GA4, briefs créatifs
4. **Discuter stratégie** — plan d'action, objectifs, budget allocation, scaling, projections
5. **Expliquer les agents IA** — ce qu'ils font, leurs dernières actions, comment les configurer
6. **Diagnostiquer des problèmes** — pourquoi le ROAS baisse, pourquoi les livraisons bloquent, etc.
7. **Proposer du contenu** — idées de posts sociaux, séquences email, briefs créa, hooks publicitaires

═══ 8 AGENTS IA AUTONOMES (tournent 24h/24) ═══
1. Agent Meta Ads (toutes les 4h) — Vérifie le ROAS, pause/scale les créas, alerte budget
2. Agent Shopify (toutes les 6h) — Stock, AOV trend, repeat customers, alertes commandes
3. Agent Sendcloud (toutes les 2h) — Colis bloqués, delivery rate, carrier delays
4. Agent Email/CRM (toutes les 3h) — Paniers abandonnés, relance, welcome sequence, fidélisation
5. Agent GA4 (toutes les 4h) — Trafic, sources, new vs returning, alertes drops/spikes
6. Agent Créa (toutes les 6h) — Hook rate, CTR, creative fatigue, winning patterns, brief auto
7. Agent Growth (toutes les 24h) — Orchestrateur : rapport quotidien, 3 actions/jour, projections 100 cmd/jour
8. Agent Content (toutes les 12h) — Orchestre la création de contenu : brief créa → génère visuels pub (Bannerbear) → infographies (Napkin AI) → plan posts social

═══ 7 SKILLS DISPONIBLES ═══
1. Rapport Hebdo — Génère un bilan complet de la semaine (CA, commandes, ads, trafic, logistique)
2. Brief Créa — Analyse les créas et génère un brief avec hooks, CTAs, formats recommandés
3. Post Social — Génère un plan de contenu Instagram/TikTok/Facebook pour la semaine
4. Email Sequence — Génère des séquences email (abandon panier, welcome, winback, VIP, post-achat)
5. Analyse GA4 — Rapport détaillé sur le trafic, les sources, le funnel et les insights analytics
6. Ad Creative Generator — Génère des créas pub complètes (6 formats) via Bannerbear API, avec copy, hooks, CTAs, audiences ciblées
7. Infographic Generator — Crée des infographies et visuels data (product benefits, comparatifs, social proof, funnel) via Napkin AI

═══ OUTILS EXTERNES CONNECTABLES ═══
- Bannerbear : API de génération d'images publicitaires à partir de templates (BANNERBEAR_API_KEY)
- Napkin AI : API de transformation texte → infographies/diagrammes professionnels (NAPKIN_API_KEY)
- Meta Marketing API : Données ads + upload créatives
- Shopify Admin API : Commandes, produits, clients
- GA4 Data API : Analytics, sessions, sources
- Sendcloud API : Logistique, suivi colis

STYLE :
- Sois direct, concret et orienté action.
- Utilise des chiffres réels quand tu les as.
- Propose toujours des next steps clairs.
- Formate proprement avec des titres, bullets, et emojis pertinents.
- Si tu n'as pas une donnée, dis-le clairement plutôt que d'inventer.

CONTEXTE BUSINESS :
- Uburn vend en DTC (direct-to-consumer) via Shopify
- Acquisition principalement via Meta Ads (Facebook/Instagram)
- Analytics via Google Analytics 4 (GA4)
- Logistique gérée via Sendcloud
- 8 agents IA autonomes qui tournent 24h/24 sur le cron
- 7 skills de génération de contenu, rapports et créatives
- Bannerbear (génération visuels pub) et Napkin AI (infographies) connectables
- Marché : France principalement`;

// ── Conversation history (in-memory per request, stateless) ──
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── API Route ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      response: "⚠️ Clé API Anthropic manquante. Ajoute `ANTHROPIC_API_KEY=sk-ant-...` dans ton fichier `.env.local` et relance le serveur.",
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

    // Gather live business data
    const businessContext = await gatherBusinessContext();

    // Build messages array with history
    const messages: { role: "user" | "assistant"; content: string }[] = [];

    // Include conversation history (last 10 exchanges max)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-20); // last 10 exchanges = 20 messages
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message with business context injected
    messages.push({
      role: "user",
      content: `${businessContext}\n\n── QUESTION DE CHARLES ──\n${message}`,
    });

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === "text");
    const assistantMessage = textContent?.text || "Pas de réponse.";

    return NextResponse.json({
      response: assistantMessage,
      intent: "ai",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("Chat API error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Erreur inconnue";

    // Handle specific Anthropic errors
    if (errorMessage.includes("401") || errorMessage.includes("authentication")) {
      return NextResponse.json({
        response: "⚠️ Clé API Anthropic invalide. Vérifie ta clé dans `.env.local` et relance le serveur.",
        intent: "error",
        timestamp: new Date().toISOString(),
      });
    }

    if (errorMessage.includes("429") || errorMessage.includes("rate")) {
      return NextResponse.json({
        response: "⏳ Trop de requêtes. Attends quelques secondes et réessaie.",
        intent: "error",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      response: `❌ Erreur : ${errorMessage.substring(0, 200)}. Réessaie dans quelques secondes.`,
      intent: "error",
      timestamp: new Date().toISOString(),
    });
  }
}
