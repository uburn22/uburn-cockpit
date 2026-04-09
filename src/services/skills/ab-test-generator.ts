/**
 * A/B Test Generator Skill
 *
 * Génère des variantes de page pour tester différentes hypothèses.
 * Chaque variante = un set de modifications concrètes à appliquer.
 *
 * Flow :
 *   1. Reçoit l'URL + l'analyse de la page (ou en fait une)
 *   2. Identifie les éléments à haute valeur de test
 *   3. Génère 2-4 variantes avec modifications précises
 *   4. Fournit le plan d'implémentation + métriques à tracker
 */

import Anthropic from "@anthropic-ai/sdk";
import { analyzeLandingPage, type LandingPageAnalysis } from "./landing-analyzer";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// ── Types ────────────────────────────────────────────────

export interface ABTestPlan {
  url: string;
  testName: string;
  hypothesis: string;
  variants: ABVariant[];
  metricsToTrack: string[];
  estimatedDuration: string;
  trafficSplit: string;
  expectedOutcome: string;
  implementationNotes: string;
}

export interface ABVariant {
  name: string;
  description: string;
  changes: ABChange[];
  expectedImpact: string;
}

interface ABChange {
  element: string;
  type: "headline" | "cta" | "layout" | "color" | "image" | "copy" | "social_proof" | "pricing" | "urgency";
  current: string;
  proposed: string;
  cssChanges?: string;
  htmlChanges?: string;
}

export interface ABTestSuite {
  url: string;
  pageType: "shopify_landing" | "site_vitrine";
  analysis: LandingPageAnalysis | null;
  tests: ABTestPlan[];
  priorityOrder: string[];
  totalEstimatedLift: string;
  roadmap: string;
}

// ── Main generator function ──────────────────────────────

export async function generateABTests(
  url: string,
  pageType: "shopify_landing" | "site_vitrine" = "shopify_landing",
  existingAnalysis?: LandingPageAnalysis,
  testCount: number = 3
): Promise<{ suite: ABTestSuite; raw: string }> {
  // Step 1: Get analysis if not provided
  let analysis = existingAnalysis || null;
  if (!analysis) {
    try {
      const result = await analyzeLandingPage(url, pageType);
      analysis = result.analysis;
    } catch {
      // Continue without analysis — Claude will work with URL only
    }
  }

  // Step 2: Build context for AI
  const analysisContext = analysis
    ? `
=== ANALYSE EXISTANTE ===
Score global : ${analysis.overallScore}/100
Résumé : ${analysis.summary}

Problèmes design :
${analysis.designIssues.map(d => `- [${d.severity}] ${d.element}: ${d.issue}`).join("\n")}

Suggestions UX :
${analysis.uxSuggestions.map(s => `- [${s.priority}] ${s.category}: ${s.current} → ${s.recommended}`).join("\n")}

Optimisations conversion :
${analysis.conversionOptimizations.map(c => `- ${c.area}: ${c.action} (${c.estimatedLift})`).join("\n")}
`
    : "Pas d'analyse préalable disponible.";

  // Step 3: Generate A/B test plans via Claude
  const prompt = `Tu es un expert CRO (Conversion Rate Optimization) et Growth Hacker spécialisé en e-commerce DTC.

Tu génères des plans d'A/B tests pour Uburn, une boisson wellness française à base d'ube (igname violette des Philippines).
Couleurs de marque : violet #6B21A8, or #C9A84C, noir #0A0A0A.
Prix : environ 29€ le pack.
Objectif : 100 commandes/jour.

URL : ${url}
Type : ${pageType === "shopify_landing" ? "Landing page Shopify" : "Site vitrine"}

${analysisContext}

Génère exactement ${testCount} A/B tests prioritaires. Chaque test doit être :
- Basé sur une hypothèse claire et testable
- Avec des variantes concrètes et implémentables
- Incluant les changements CSS/HTML quand pertinent
- Focalisé sur la conversion (ajout panier, achat, inscription)

Réponds UNIQUEMENT en JSON valide :
{
  "tests": [
    {
      "testName": "Nom court du test",
      "hypothesis": "Si nous [changement], alors [résultat attendu] parce que [raison]",
      "variants": [
        {
          "name": "Control (A)",
          "description": "Version actuelle",
          "changes": [],
          "expectedImpact": "Baseline"
        },
        {
          "name": "Variant B",
          "description": "Description de la variante",
          "changes": [
            {
              "element": "Élément ciblé (ex: Hero headline)",
              "type": "headline|cta|layout|color|image|copy|social_proof|pricing|urgency",
              "current": "Texte/état actuel",
              "proposed": "Nouveau texte/état",
              "cssChanges": "CSS à modifier (optionnel)",
              "htmlChanges": "HTML à modifier (optionnel)"
            }
          ],
          "expectedImpact": "+X% conversion attendu"
        }
      ],
      "metricsToTrack": ["Taux de conversion", "Taux de rebond", "..."],
      "estimatedDuration": "2-4 semaines",
      "trafficSplit": "50/50",
      "expectedOutcome": "Résultat attendu détaillé",
      "implementationNotes": "Notes techniques d'implémentation"
    }
  ],
  "priorityOrder": ["Test 1 name — raison de la priorité", "..."],
  "totalEstimatedLift": "+X-Y% conversion globale estimée",
  "roadmap": "Plan d'exécution sur 8-12 semaines"
}

Sois ultra-concret. Donne du vrai copy en français pour les variantes textuelles. Inclus des changements CSS réels quand c'est un test visuel.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Génération A/B tests invalide — pas de JSON retourné");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const suite: ABTestSuite = {
    url,
    pageType,
    analysis,
    tests: parsed.tests || [],
    priorityOrder: parsed.priorityOrder || [],
    totalEstimatedLift: parsed.totalEstimatedLift || "N/A",
    roadmap: parsed.roadmap || "",
  };

  return { suite, raw: text };
}
