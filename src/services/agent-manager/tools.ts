/**
 * Agent Manager — Tool Definitions
 *
 * Définit tous les outils (skills + agents) que le Chat IA
 * peut appeler via function calling.
 *
 * Chaque tool = une capacité que l'Agent Manager peut déclencher.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const AGENT_TOOLS: Tool[] = [
  // ── Skills de création ──────────────────────────────────
  {
    name: "generate_ad_creatives",
    description:
      "Génère des créatives publicitaires (visuels + copy) pour Meta Ads. Analyse d'abord les performances actuelles pour créer des pubs optimisées. Retourne les headlines, hooks, body, CTAs, formats et audiences cibles.",
    input_schema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Nombre de créatives à générer (1-6). Par défaut 3.",
        },
        style: {
          type: "string",
          enum: ["ugc", "product", "social_proof", "promo", "educational", "mix"],
          description: "Style dominant des créatives. 'mix' pour un mélange varié.",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_images",
    description:
      "Génère des images IA via Replicate FLUX pour les pubs ou posts sociaux. Produit des visuels haute qualité avec le branding Uburn (violet/or/noir).",
    input_schema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Nombre d'images à générer (1-4). Par défaut 2.",
        },
        type: {
          type: "string",
          enum: ["ad", "social", "product", "lifestyle"],
          description: "Type d'images à générer.",
        },
        custom_prompt: {
          type: "string",
          description: "Prompt personnalisé pour l'image (optionnel).",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_social_posts",
    description:
      "Génère un plan de posts pour les réseaux sociaux (Instagram, TikTok, Facebook). Inclut captions, hooks, CTAs, hashtags et meilleurs horaires de publication.",
    input_schema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Nombre de posts à générer (1-14). Par défaut 7.",
        },
        platforms: {
          type: "array",
          items: { type: "string", enum: ["instagram", "tiktok", "facebook"] },
          description: "Plateformes ciblées. Par défaut toutes.",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_email_sequence",
    description:
      "Génère une séquence d'emails marketing automatisée. Types disponibles : abandon de panier, welcome, winback, VIP, post-achat.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["abandon", "welcome", "winback", "vip", "post-purchase"],
          description: "Type de séquence email à générer.",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "generate_infographics",
    description:
      "Crée des infographies visuelles (product benefits, stats hebdo, comparatifs, funnel, social proof).",
    input_schema: {
      type: "object" as const,
      properties: {
        types: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "product-benefits",
              "weekly-stats",
              "comparison",
              "process",
              "social-proof",
              "funnel",
            ],
          },
          description: "Types d'infographies à générer.",
        },
      },
      required: ["types"],
    },
  },

  // ── Skills d'optimisation landing page ──────────────────
  {
    name: "analyze_landing_page",
    description:
      "Analyse une landing page (Shopify ou site vitrine) et génère un rapport UX/design complet : score global, problèmes design, suggestions UX, optimisations conversion, insights concurrentiels. Idéal avant de lancer des A/B tests.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "URL complète de la page à analyser (ex: https://uburn.co ou https://uburn.myshopify.com).",
        },
        page_type: {
          type: "string",
          enum: ["shopify_landing", "site_vitrine"],
          description: "Type de page : 'shopify_landing' pour la boutique Shopify, 'site_vitrine' pour le site vitrine/branding.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "generate_ab_tests",
    description:
      "Génère des plans d'A/B tests concrets pour une landing page. Chaque test inclut : hypothèse, variantes avec modifications CSS/HTML précises, métriques à tracker, durée estimée et impact attendu. Utilise l'analyse de page si disponible.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "URL de la page à tester.",
        },
        page_type: {
          type: "string",
          enum: ["shopify_landing", "site_vitrine"],
          description: "Type de page.",
        },
        test_count: {
          type: "number",
          description: "Nombre de tests A/B à générer (1-5). Par défaut 3.",
        },
      },
      required: ["url"],
    },
  },

  // ── Skills d'analyse ────────────────────────────────────
  {
    name: "generate_brief_crea",
    description:
      "Analyse les créatives actuelles et génère un brief créatif complet : patterns gagnants/perdants, hooks recommandés, CTAs, formats, niveau d'urgence. Utile avant de créer de nouvelles pubs.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "generate_weekly_report",
    description:
      "Génère un rapport hebdomadaire complet : CA, commandes, ROAS, trafic GA4, logistique, highlights, warnings et 3 actions prioritaires.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "analyze_ga4",
    description:
      "Analyse approfondie du trafic GA4 : sessions, sources, funnel, new vs returning, tendances week-over-week, insights et recommandations.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // ── Agents autonomes ────────────────────────────────────
  {
    name: "run_agent",
    description:
      "Lance un agent autonome manuellement. Agents disponibles : meta-ads (vérifie ROAS, pause/scale créas), shopify (AOV, commandes), sendcloud (logistique, colis bloqués), email-crm (paniers abandonnés, segments), ga4 (trafic, anomalies), crea (performance créative), growth (rapport quotidien + 3 actions), content (cycle complet de création contenu).",
    input_schema: {
      type: "object" as const,
      properties: {
        agent: {
          type: "string",
          enum: [
            "meta-ads",
            "shopify",
            "sendcloud",
            "email-crm",
            "ga4",
            "crea",
            "growth",
            "content",
          ],
          description: "Nom de l'agent à lancer.",
        },
      },
      required: ["agent"],
    },
  },

  // ── Notifications ───────────────────────────────────────
  {
    name: "send_approval_email",
    description:
      "Envoie un email de validation à Charles avec le contenu généré. Utilisé après avoir généré des pubs, posts ou images pour obtenir son approbation avant publication.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["ad_creative", "social_post", "ai_image", "email_sequence", "weekly_report"],
          description: "Type de contenu à envoyer pour approbation.",
        },
        content_summary: {
          type: "string",
          description: "Résumé court du contenu à valider.",
        },
      },
      required: ["type"],
    },
  },
];
