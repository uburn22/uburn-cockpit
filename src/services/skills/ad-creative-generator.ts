/**
 * Skill: Ad Creative Generator
 *
 * Génère automatiquement des visuels publicitaires via Bannerbear API
 * + des variantes de copy pour A/B testing sur Meta Ads.
 *
 * Flow: Agent Créa analyse les perfs → ce skill génère les nouveaux assets
 *
 * Bannerbear: crée des images à partir de templates pré-designés
 * - Tu crées un template une fois dans Bannerbear (ex: format story, feed, etc.)
 * - L'API remplit dynamiquement le texte, les images, les couleurs
 * - Résultat: visuels pub prêts à uploader sur Meta Ads
 */

import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");
const BANNERBEAR_API_KEY = process.env.BANNERBEAR_API_KEY || "";

// ── Bannerbear API Client ──────────────────────────────
interface BannerbearImageRequest {
  template: string;
  modifications: Array<{
    name: string;
    text?: string;
    image_url?: string;
    color?: string;
    background?: string;
  }>;
  webhook_url?: string;
  metadata?: string;
}

interface BannerbearImage {
  uid: string;
  image_url: string | null;
  status: "pending" | "completed" | "failed";
  template: string;
}

async function createBannerbearImage(request: BannerbearImageRequest): Promise<BannerbearImage> {
  if (!BANNERBEAR_API_KEY) {
    // Return mock when no API key (dev mode)
    return {
      uid: `mock_${Date.now()}`,
      image_url: null,
      status: "pending",
      template: request.template,
    };
  }

  const res = await fetch("https://api.bannerbear.com/v2/images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BANNERBEAR_API_KEY}`,
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`Bannerbear API error: ${res.status}`);
  }

  return res.json();
}

async function getBannerbearImage(uid: string): Promise<BannerbearImage> {
  if (!BANNERBEAR_API_KEY) {
    return { uid, image_url: `https://placeholder.bannerbear.com/${uid}.png`, status: "completed", template: "" };
  }

  const res = await fetch(`https://api.bannerbear.com/v2/images/${uid}`, {
    headers: { Authorization: `Bearer ${BANNERBEAR_API_KEY}` },
  });

  if (!res.ok) throw new Error(`Bannerbear status error: ${res.status}`);
  return res.json();
}

// ── Fetch perf data for context ─────────────────────────
async function fetchAPI(path: string): Promise<Record<string, unknown>> {
  const now = new Date();
  const from = format(subDays(now, 14), "yyyy-MM-dd");
  const to = format(now, "yyyy-MM-dd");
  const res = await fetch(`${BASE_URL}${path}?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) return { error: `${path} failed: ${res.status}` };
  return res.json();
}

// ── Ad Creative Variations ──────────────────────────────
interface AdCreative {
  id: string;
  format: "story" | "feed" | "square" | "landscape";
  dimensions: string;
  headline: string;
  body: string;
  cta: string;
  hook: string;
  visualDirection: string;
  colorScheme: string;
  bannerbearTemplate: string;
  bannerbearMods: BannerbearImageRequest["modifications"];
  bannerbearResult?: BannerbearImage;
  targetAudience: string;
  expectedPerformance: string;
}

interface AdCreativeBatch {
  batchId: string;
  createdAt: string;
  totalCreatives: number;
  creatives: AdCreative[];
  strategy: string;
  basedOnData: Record<string, unknown>;
  estimatedImpact: string;
}

// ── Template IDs (à configurer dans Bannerbear) ─────────
const TEMPLATES = {
  story: process.env.BANNERBEAR_TEMPLATE_STORY || "TEMPLATE_STORY_ID",
  feed: process.env.BANNERBEAR_TEMPLATE_FEED || "TEMPLATE_FEED_ID",
  square: process.env.BANNERBEAR_TEMPLATE_SQUARE || "TEMPLATE_SQUARE_ID",
  landscape: process.env.BANNERBEAR_TEMPLATE_LANDSCAPE || "TEMPLATE_LANDSCAPE_ID",
};

// ── Uburn brand elements ────────────────────────────────
const BRAND = {
  primaryColor: "#6B21A8", // Purple (ube)
  secondaryColor: "#C9A84C", // Gold
  backgroundColor: "#0A0A0A", // Black
  font: "Montserrat",
  productImageUrl: process.env.UBURN_PRODUCT_IMAGE_URL || "https://uburn.co/product-hero.png",
  logoUrl: process.env.UBURN_LOGO_URL || "https://uburn.co/logo.png",
};

export async function generateAdCreatives(
  count: number = 6
): Promise<{ plan: string; data: AdCreativeBatch }> {
  const [adsRaw, shopifyRaw] = await Promise.all([
    fetchAPI("/api/meta-ads"),
    fetchAPI("/api/shopify"),
  ]);

  const ads = adsRaw as Record<string, unknown>;
  const shopify = shopifyRaw as Record<string, unknown>;

  const roas = (ads.blendedRoas as number) || 0;
  const cpo = (ads.averageCpo as number) || 0;
  const aov = (shopify.aov as number) || 35;

  // Analyze winning creative patterns
  const creatives = (ads.creatives as Array<{
    creative: { name: string };
    totals: { roas: number; ctr: number; hookRate?: number; spend: number };
  }>) || [];

  const winners = creatives.filter(c => c.totals.roas >= 1.5);
  const avgWinnerCTR = winners.length > 0
    ? winners.reduce((a, c) => a + (c.totals.ctr || 0), 0) / winners.length
    : 2.0;

  // Generate creative variations based on performance data
  const adVariations: AdCreative[] = [
    // ── VARIATION 1: UGC Style Story Ad ──
    {
      id: `ad_${Date.now()}_1`,
      format: "story",
      dimensions: "1080x1920",
      headline: "J'ai testé cette boisson violette pendant 30 jours",
      body: "Résultat : plus d'énergie, zéro crash. L'ube, c'est le secret wellness de l'Asie, maintenant en France.",
      cta: "Découvrir Uburn →",
      hook: "\"Pourquoi tout le monde parle de cette boisson ?\"",
      visualDirection: "Style UGC — personne tenant le produit, fond lifestyle naturel",
      colorScheme: `${BRAND.primaryColor} dominant + ${BRAND.secondaryColor} accents`,
      bannerbearTemplate: TEMPLATES.story,
      bannerbearMods: [
        { name: "headline", text: "J'ai testé cette boisson violette pendant 30 jours" },
        { name: "body_text", text: "Plus d'énergie, zéro crash. L'ube, le secret wellness de l'Asie." },
        { name: "cta_button", text: "DÉCOUVRIR →" },
        { name: "product_image", image_url: BRAND.productImageUrl },
        { name: "logo", image_url: BRAND.logoUrl },
        { name: "background", color: BRAND.backgroundColor },
        { name: "accent", color: BRAND.primaryColor },
      ],
      targetAudience: "Femmes 25-35, intéressées wellness/santé/fitness",
      expectedPerformance: `CTR cible: ${(avgWinnerCTR * 1.1).toFixed(1)}% | Hook rate cible: 30%+`,
    },
    // ── VARIATION 2: Product Hero Feed Ad ──
    {
      id: `ad_${Date.now()}_2`,
      format: "feed",
      dimensions: "1080x1350",
      headline: "3x plus d'antioxydants que le matcha 🟣",
      body: "Uburn — La boisson à l'ube qui booste ton énergie naturellement.\n✅ Sans sucres ajoutés\n✅ Made in France\n✅ Livraison 48h",
      cta: "Commander maintenant",
      hook: "\"Le matcha est dépassé\"",
      visualDirection: "Product shot avec glow violet, fond sombre premium",
      colorScheme: `Noir + ${BRAND.primaryColor} glow + ${BRAND.secondaryColor} text`,
      bannerbearTemplate: TEMPLATES.feed,
      bannerbearMods: [
        { name: "headline", text: "3x plus d'antioxydants que le matcha" },
        { name: "body_text", text: "Sans sucres ajoutés • Made in France • Livraison 48h" },
        { name: "cta_button", text: "COMMANDER" },
        { name: "product_image", image_url: BRAND.productImageUrl },
        { name: "logo", image_url: BRAND.logoUrl },
        { name: "background", color: BRAND.backgroundColor },
      ],
      targetAudience: "Hommes/Femmes 22-40, intéressés nutrition/healthy lifestyle",
      expectedPerformance: `CTR cible: ${avgWinnerCTR.toFixed(1)}% | ROAS cible: ${(roas * 1.2).toFixed(1)}x`,
    },
    // ── VARIATION 3: Social Proof Square Ad ──
    {
      id: `ad_${Date.now()}_3`,
      format: "square",
      dimensions: "1080x1080",
      headline: "Déjà adopté par +2000 français 🇫🇷",
      body: "\"La meilleure découverte de l'année\" — Marine, 28 ans\n\nGoûte l'ube, la boisson wellness qui fait le buzz.",
      cta: "-15% avec UBURN15",
      hook: "\"Pourquoi 2000 personnes ont remplacé leur café par ça\"",
      visualDirection: "Avis clients + produit, style clean/moderne",
      colorScheme: `Blanc + ${BRAND.primaryColor} + ${BRAND.secondaryColor}`,
      bannerbearTemplate: TEMPLATES.square,
      bannerbearMods: [
        { name: "headline", text: "Déjà adopté par +2000 français" },
        { name: "testimonial", text: "\"La meilleure découverte de l'année\" — Marine, 28 ans" },
        { name: "cta_button", text: "-15% AVEC UBURN15" },
        { name: "product_image", image_url: BRAND.productImageUrl },
        { name: "logo", image_url: BRAND.logoUrl },
        { name: "stars", text: "★★★★★" },
      ],
      targetAudience: "Lookalike buyers, retargeting visiteurs site",
      expectedPerformance: `CTR cible: ${(avgWinnerCTR * 0.9).toFixed(1)}% | Conversion focus`,
    },
    // ── VARIATION 4: Before/After Story Ad ──
    {
      id: `ad_${Date.now()}_4`,
      format: "story",
      dimensions: "1080x1920",
      headline: "Ma routine AVANT vs APRÈS Uburn",
      body: "Avant : café → crash à 14h → fatigue\nAprès : Uburn → énergie stable toute la journée\n\nLe switch qui change tout.",
      cta: "Essayer pour 3.90€",
      hook: "\"Mon énergie à 14h a complètement changé\"",
      visualDirection: "Split screen before/after, couleurs contrastées",
      colorScheme: `Gris (before) → ${BRAND.primaryColor} (after)`,
      bannerbearTemplate: TEMPLATES.story,
      bannerbearMods: [
        { name: "headline", text: "AVANT vs APRÈS UBURN" },
        { name: "before_text", text: "Café → Crash → Fatigue" },
        { name: "after_text", text: "Uburn → Énergie stable toute la journée" },
        { name: "cta_button", text: "ESSAYER 3.90€" },
        { name: "product_image", image_url: BRAND.productImageUrl },
      ],
      targetAudience: "Coffee drinkers, wellness curious",
      expectedPerformance: `Hook rate cible: 35%+ | CTR cible: ${(avgWinnerCTR * 1.2).toFixed(1)}%`,
    },
    // ── VARIATION 5: Offer/Promo Landscape Ad ──
    {
      id: `ad_${Date.now()}_5`,
      format: "landscape",
      dimensions: "1200x628",
      headline: "Pack Découverte -20% 🎁 Livraison GRATUITE",
      body: "Goûte l'ube pour la première fois avec notre pack découverte.\n6 bouteilles au lieu de 29.90€ → 23.90€\nCode : DECOUVERTE20",
      cta: "J'en profite",
      hook: "\"Offre limitée — stock limité\"",
      visualDirection: "Product lineup, badge promo, urgence visuelle",
      colorScheme: `${BRAND.backgroundColor} + ${BRAND.secondaryColor} badge + rouge urgence`,
      bannerbearTemplate: TEMPLATES.landscape,
      bannerbearMods: [
        { name: "headline", text: "PACK DÉCOUVERTE -20%" },
        { name: "price", text: "23.90€ au lieu de 29.90€" },
        { name: "code", text: "DECOUVERTE20" },
        { name: "cta_button", text: "J'EN PROFITE →" },
        { name: "product_image", image_url: BRAND.productImageUrl },
        { name: "logo", image_url: BRAND.logoUrl },
        { name: "badge", text: "LIVRAISON GRATUITE" },
      ],
      targetAudience: "Broad — acquisition cold traffic",
      expectedPerformance: `CPO cible: <${(cpo * 0.8).toFixed(0)}€ | ROAS cible: ${(roas * 1.3).toFixed(1)}x`,
    },
    // ── VARIATION 6: Educational Carousel Ad ──
    {
      id: `ad_${Date.now()}_6`,
      format: "square",
      dimensions: "1080x1080",
      headline: "L'ube : 5 bénéfices que tu ne connaissais pas",
      body: "1. Antioxydants puissants\n2. Énergie sans caféine\n3. Anti-inflammatoire naturel\n4. Soutient la digestion\n5. Boost l'humeur",
      cta: "En savoir plus",
      hook: "\"Tu connais pas encore l'ube ? Lis ça.\"",
      visualDirection: "Infographic style, chiffres mis en avant, clean",
      colorScheme: `${BRAND.primaryColor} gradient + blanc`,
      bannerbearTemplate: TEMPLATES.square,
      bannerbearMods: [
        { name: "headline", text: "5 BÉNÉFICES DE L'UBE" },
        { name: "benefit_1", text: "Antioxydants puissants" },
        { name: "benefit_2", text: "Énergie sans caféine" },
        { name: "benefit_3", text: "Anti-inflammatoire" },
        { name: "benefit_4", text: "Soutient la digestion" },
        { name: "benefit_5", text: "Boost l'humeur" },
        { name: "logo", image_url: BRAND.logoUrl },
      ],
      targetAudience: "Éducation — top of funnel, health conscious",
      expectedPerformance: `Engagement cible: 4%+ | Saves cible: 2%+`,
    },
  ];

  const selectedAds = adVariations.slice(0, count);

  // Try to generate via Bannerbear if API key is set
  if (BANNERBEAR_API_KEY) {
    for (const ad of selectedAds) {
      try {
        ad.bannerbearResult = await createBannerbearImage({
          template: ad.bannerbearTemplate,
          modifications: ad.bannerbearMods,
          metadata: ad.id,
        });
      } catch (err) {
        console.error(`Bannerbear generation failed for ${ad.id}:`, err);
      }
    }
  }

  const strategy = roas < 1.5
    ? "URGENCE — ROAS faible, focus sur les créas à forte conversion (social proof + promo)"
    : roas > 2.5
    ? "SCALE — ROAS solide, augmenter le volume avec des créas d'acquisition broad"
    : "OPTIMISATION — Tester de nouvelles angles tout en itérant sur les gagnantes";

  const batch: AdCreativeBatch = {
    batchId: `batch_${Date.now()}`,
    createdAt: format(new Date(), "yyyy-MM-dd HH:mm", { locale: fr }),
    totalCreatives: selectedAds.length,
    creatives: selectedAds,
    strategy,
    basedOnData: { roas, cpo, aov, winnersCount: winners.length, avgWinnerCTR },
    estimatedImpact: `Si ROAS passe de ${roas}x à ${(roas * 1.3).toFixed(1)}x avec ces créas → +${Math.round(aov * 10 * (roas * 1.3 - roas))}€/jour de CA additionnel`,
  };

  const bbStatus = BANNERBEAR_API_KEY ? "✅ Bannerbear connecté — visuels en cours de génération" : "⚠️ Bannerbear non connecté — ajoute BANNERBEAR_API_KEY dans .env.local";

  const plan = `
🎨 **BATCH CRÉATIFS PUBLICITAIRES UBURN**
📅 ${batch.createdAt}
🆔 ${batch.batchId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **STRATÉGIE** : ${strategy}
📊 **BASÉ SUR** : ROAS ${roas}x | CPO ${cpo.toFixed(2)}€ | AOV ${aov.toFixed(0)}€ | ${winners.length} créas gagnantes
🖼️ **${bbStatus}**

${selectedAds.map((ad, i) => `
━━━ CRÉA ${i + 1}/${selectedAds.length} ━━━━━━━━━━━━━━━━━
📐 Format : ${ad.format.toUpperCase()} (${ad.dimensions})
🎣 Hook : ${ad.hook}
📌 Headline : ${ad.headline}
📝 Body : ${ad.body.split("\n")[0]}...
🔘 CTA : ${ad.cta}
🎨 Direction visuelle : ${ad.visualDirection}
🎯 Audience : ${ad.targetAudience}
📈 Perf attendue : ${ad.expectedPerformance}
${ad.bannerbearResult ? `🖼️ Bannerbear : ${ad.bannerbearResult.status} (${ad.bannerbearResult.uid})` : ""}
`).join("")}

📊 **IMPACT ESTIMÉ**
   ${batch.estimatedImpact}

💡 **NEXT STEPS**
   1. Valider les visuels générés dans Bannerbear
   2. Uploader sur Meta Ads Manager
   3. A/B test : 2 créas par ad set, budget €10/jour chacune
   4. L'Agent Créa analysera les résultats dans 48h

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Généré par le Skill Ad Creative Generator — Cockpit Uburn
`.trim();

  return { plan, data: batch };
}
