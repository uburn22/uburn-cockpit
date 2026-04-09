import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

async function fetchAPI(path: string): Promise<Record<string, unknown>> {
  const now = new Date();
  const from = format(subDays(now, 14), "yyyy-MM-dd");
  const to = format(now, "yyyy-MM-dd");
  const res = await fetch(`${BASE_URL}${path}?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) return { error: `${path} failed: ${res.status}` };
  return res.json();
}

interface CreativeBrief {
  context: string;
  winningPatterns: string[];
  losingPatterns: string[];
  recommendations: BriefRecommendation[];
  hooks: string[];
  ctas: string[];
  formats: string[];
  urgency: "low" | "medium" | "high" | "critical";
}

interface BriefRecommendation {
  type: string;
  description: string;
  reason: string;
}

export async function generateBriefCrea(): Promise<{ brief: string; data: CreativeBrief }> {
  const [adsRaw, shopifyRaw] = await Promise.all([
    fetchAPI("/api/meta-ads"),
    fetchAPI("/api/shopify"),
  ]);

  const ads = adsRaw as Record<string, unknown>;
  const shopify = shopifyRaw as Record<string, unknown>;

  const roas = (ads.blendedRoas as number) || 0;
  const cpo = (ads.averageCpo as number) || 0;
  const aov = (shopify.aov as number) || 0;
  const totalSpend = (ads.totalSpend as number) || 0;

  const creatives = (ads.creatives as Array<{
    creative: { name: string; status: string };
    totals: { roas: number; spend: number; conversions: number; ctr: number; cpc: number; hookRate?: number };
  }>) || [];

  // Analyze winning vs losing patterns
  const winners = creatives.filter(c => c.totals.roas >= 1.5);
  const losers = creatives.filter(c => c.totals.roas < 1 && c.totals.spend > 10);

  const winningPatterns: string[] = [];
  const losingPatterns: string[] = [];

  if (winners.length > 0) {
    const avgWinnerCTR = winners.reduce((acc, c) => acc + (c.totals.ctr || 0), 0) / winners.length;
    winningPatterns.push(`CTR moyen des gagnantes : ${avgWinnerCTR.toFixed(2)}%`);
    winners.forEach(w => winningPatterns.push(`✅ "${w.creative.name}" — ROAS ${w.totals.roas}x`));
  }

  if (losers.length > 0) {
    const wastedSpend = losers.reduce((acc, c) => acc + c.totals.spend, 0);
    losingPatterns.push(`${wastedSpend.toFixed(0)}€ dépensés sur des créas perdantes`);
    losers.forEach(l => losingPatterns.push(`❌ "${l.creative.name}" — ROAS ${l.totals.roas}x`));
  }

  // Generate hook ideas based on product
  const hooks = [
    "🟣 \"Tu connais pas encore l'ube ? La boisson qui a rendu TikTok fou...\"",
    "💪 \"J'ai remplacé mon café par ça pendant 30 jours — résultat :\"",
    "🤯 \"Cette boisson violette a 3x plus d'antioxydants que le matcha\"",
    "📦 \"Unboxing de la boisson la plus instagrammable de 2024\"",
    "🧪 \"Test : est-ce que l'ube tient ses promesses wellness ?\"",
    "👀 \"Pourquoi tout le monde parle de cette boisson violette ?\"",
    "⏰ \"Ma routine matinale a changé depuis que j'ai découvert ça\"",
    "🇫🇷 \"Made in France, inspiré d'Asie — l'ube arrive enfin chez nous\"",
  ];

  const ctas = [
    "🛒 Commande maintenant et goûte la différence",
    "🎁 -15% avec le code UBURN15 — limité à 48h",
    "📦 Livraison gratuite dès 2 packs commandés",
    "⚡ Stock limité — ne rate pas la prochaine vague",
    "👇 Lien en bio — rejoins la communauté Uburn",
  ];

  const formats = [
    "📱 UGC vertical (9:16) — témoignage client avec hook texte",
    "🎬 Before/After — routine sans vs avec Uburn",
    "📸 Carrousel Instagram — 5 bénéfices en slides",
    "🎵 TikTok trend — recette avec Uburn",
    "🖼️ Image statique — produit lifestyle avec copy bold",
    "📹 Reel unboxing — reaction authentique",
  ];

  // Determine urgency
  let urgency: "low" | "medium" | "high" | "critical" = "low";
  if (roas < 1) urgency = "critical";
  else if (roas < 1.5) urgency = "high";
  else if (winners.length < 2) urgency = "medium";

  const recommendations: BriefRecommendation[] = [];

  if (urgency === "critical" || urgency === "high") {
    recommendations.push({
      type: "URGENT",
      description: "Produire 5 nouvelles créas UGC cette semaine",
      reason: `ROAS à ${roas}x — les créas actuelles ne convertissent pas assez`,
    });
  }

  if (losers.length > winners.length) {
    recommendations.push({
      type: "ITÉRATION",
      description: "Faire 3 variations des créas gagnantes (nouveau hook, même body)",
      reason: "Plus de perdantes que de gagnantes — il faut capitaliser sur ce qui marche",
    });
  }

  recommendations.push({
    type: "TEST",
    description: "Tester le format Before/After et UGC témoignage",
    reason: "Ces formats ont les meilleurs taux de conversion en DTC",
  });

  if (aov < 40) {
    recommendations.push({
      type: "AOV",
      description: "Créer une créa push bundle/pack pour augmenter le panier",
      reason: `AOV actuel ${aov.toFixed(0)}€ — une offre bundle peut l'augmenter de 30%`,
    });
  }

  const data: CreativeBrief = {
    context: `ROAS ${roas}x | CPO ${cpo.toFixed(2)}€ | AOV ${aov.toFixed(2)}€ | Budget ${totalSpend.toFixed(0)}€/14j`,
    winningPatterns,
    losingPatterns,
    recommendations,
    hooks,
    ctas,
    formats,
    urgency,
  };

  const urgencyEmoji = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" };

  const brief = `
🎨 **BRIEF CRÉATIF UBURN**
📅 ${format(new Date(), "d MMMM yyyy", { locale: fr })}
${urgencyEmoji[urgency]} Urgence : **${urgency.toUpperCase()}**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **CONTEXTE PERF**
   ${data.context}

${winningPatterns.length > 0 ? `✅ **CRÉAS GAGNANTES**\n${winningPatterns.map(p => `   ${p}`).join("\n")}\n` : ""}
${losingPatterns.length > 0 ? `❌ **CRÉAS À COUPER**\n${losingPatterns.map(p => `   ${p}`).join("\n")}\n` : ""}

📝 **RECOMMANDATIONS**
${recommendations.map((r, i) => `   ${i + 1}. [${r.type}] ${r.description}\n      → ${r.reason}`).join("\n")}

💡 **HOOKS À TESTER**
${hooks.slice(0, 5).map(h => `   ${h}`).join("\n")}

📢 **CTAs RECOMMANDÉS**
${ctas.slice(0, 3).map(c => `   ${c}`).join("\n")}

🎬 **FORMATS PRIORITAIRES**
${formats.slice(0, 4).map(f => `   ${f}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Brief généré par l'Agent Créa — Cockpit Uburn
`.trim();

  return { brief, data };
}
