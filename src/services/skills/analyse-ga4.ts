import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");

async function fetchAPI(path: string, from: string, to: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${path}?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) return { error: `${path} failed: ${res.status}` };
  return res.json();
}

interface GA4Report {
  period: string;
  overview: {
    sessions: number;
    sessionsChange: number;
    users: number;
    newUsers: number;
    returningUsers: number;
    bounceRate: number;
  };
  sources: SourceAnalysis[];
  funnel: { impressions: number; clicks: number; addToCarts: number; purchases: number; conversionRate: number };
  insights: string[];
  recommendations: string[];
}

interface SourceAnalysis {
  source: string;
  medium: string;
  sessions: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  note: string;
}

export async function generateAnalyseGA4(): Promise<{ report: string; data: GA4Report }> {
  const now = new Date();
  const thisFrom = format(subDays(now, 7), "yyyy-MM-dd");
  const thisTo = format(now, "yyyy-MM-dd");
  const prevFrom = format(subDays(now, 14), "yyyy-MM-dd");
  const prevTo = format(subDays(now, 7), "yyyy-MM-dd");

  const [ga4Raw, ga4PrevRaw, shopifyRaw, adsRaw] = await Promise.all([
    fetchAPI("/api/ga4", thisFrom, thisTo),
    fetchAPI("/api/ga4", prevFrom, prevTo),
    fetchAPI("/api/shopify", thisFrom, thisTo),
    fetchAPI("/api/meta-ads", thisFrom, thisTo),
  ]);

  const ga4 = ga4Raw as Record<string, unknown>;
  const ga4Prev = ga4PrevRaw as Record<string, unknown>;
  const shopify = shopifyRaw as Record<string, unknown>;
  const ads = adsRaw as Record<string, unknown>;

  const sessions = (ga4.totalSessions as number) || 0;
  const prevSessions = (ga4Prev.totalSessions as number) || 0;
  const sessionsChange = prevSessions > 0 ? Math.round(((sessions - prevSessions) / prevSessions) * 100) : 0;

  const newVsRet = ga4.newVsReturning as { new: number; returning: number } | undefined;
  const prevNewVsRet = ga4Prev.newVsReturning as { new: number; returning: number } | undefined;
  const newUsers = newVsRet?.new || 0;
  const returningUsers = newVsRet?.returning || 0;
  const totalUsers = newUsers + returningUsers;

  const totalOrders = (shopify.totalOrders as number) || 0;
  const conversionRate = sessions > 0 ? (totalOrders / sessions) * 100 : 0;

  // Funnel data from ads
  const funnel = ads.funnel as { impressions: number; clicks: number; purchases: number } | undefined;
  const impressions = funnel?.impressions || 0;
  const clicks = funnel?.clicks || 0;
  const purchases = funnel?.purchases || totalOrders;

  // Source analysis
  const sources = (ga4.sources as Array<{ source: string; medium: string; sessions: number; percentage: number }>) || [];
  const prevSources = (ga4Prev.sources as Array<{ source: string; medium: string; sessions: number }>) || [];

  const sourceAnalysis: SourceAnalysis[] = sources.map(s => {
    const prev = prevSources.find(p => p.source === s.source && p.medium === s.medium);
    const prevSess = prev?.sessions || 0;
    const trend: "up" | "down" | "stable" = prevSess === 0 ? "stable" : s.sessions > prevSess * 1.1 ? "up" : s.sessions < prevSess * 0.9 ? "down" : "stable";

    let note = "";
    if (trend === "up") note = `+${Math.round(((s.sessions - prevSess) / prevSess) * 100)}% vs semaine dernière`;
    else if (trend === "down") note = `${Math.round(((s.sessions - prevSess) / prevSess) * 100)}% vs semaine dernière`;
    else note = "Stable";

    return { ...s, trend, note };
  });

  // Generate insights
  const insights: string[] = [];
  const recommendations: string[] = [];

  if (sessionsChange > 20) {
    insights.push(`📈 Forte hausse du trafic (+${sessionsChange}%) — identifier la source de cette croissance`);
  } else if (sessionsChange < -20) {
    insights.push(`📉 Baisse significative du trafic (${sessionsChange}%) — vérifier les campagnes ads et le SEO`);
  }

  if (returningUsers > 0 && (returningUsers / totalUsers) < 0.15) {
    insights.push(`🔄 Seulement ${((returningUsers / totalUsers) * 100).toFixed(1)}% de visiteurs récurrents — la rétention est faible`);
    recommendations.push("Mettre en place email post-achat + pixel de retargeting Meta");
  }

  if (conversionRate < 1) {
    insights.push(`⚠️ Taux de conversion très faible (${conversionRate.toFixed(2)}%) — le site ne convertit pas assez`);
    recommendations.push("Audit CRO urgent : optimiser les fiches produits, le checkout et les CTAs");
  } else if (conversionRate > 3) {
    insights.push(`✅ Excellent taux de conversion (${conversionRate.toFixed(2)}%) — le site convertit bien`);
  }

  // Check source dependency
  if (sources.length > 0 && sources[0].percentage > 70) {
    insights.push(`⚠️ Dépendance à ${sources[0].source}/${sources[0].medium} (${sources[0].percentage.toFixed(0)}% du trafic)`);
    recommendations.push("Diversifier les sources : SEO, TikTok organique, email, partenariats");
  }

  // Check organic vs paid
  const paidSessions = sources.filter(s => s.medium === "cpc" || s.medium === "paid").reduce((acc, s) => acc + s.sessions, 0);
  const organicSessions = sources.filter(s => s.medium === "organic").reduce((acc, s) => acc + s.sessions, 0);

  if (paidSessions > 0 && organicSessions < paidSessions * 0.3) {
    insights.push(`💰 Le trafic payant domine (${paidSessions} paid vs ${organicSessions} organic) — très dépendant des ads`);
    recommendations.push("Investir dans le SEO et le contenu organique pour réduire le coût d'acquisition");
  }

  if (recommendations.length < 3) {
    recommendations.push("Tester des landing pages dédiées par source de trafic");
    recommendations.push("Analyser les pages de sortie pour identifier les points de friction");
  }

  const period = `${format(subDays(now, 7), "d MMM", { locale: fr })} — ${format(now, "d MMM yyyy", { locale: fr })}`;

  const data: GA4Report = {
    period,
    overview: {
      sessions,
      sessionsChange,
      users: totalUsers,
      newUsers,
      returningUsers,
      bounceRate: 0,
    },
    sources: sourceAnalysis,
    funnel: {
      impressions,
      clicks,
      addToCarts: Math.round(clicks * 0.3),
      purchases,
      conversionRate,
    },
    insights,
    recommendations,
  };

  const trendIcon = (t: "up" | "down" | "stable") => t === "up" ? "📈" : t === "down" ? "📉" : "➡️";

  const report = `
📊 **ANALYSE GA4 — UBURN**
📅 ${period}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 **VUE D'ENSEMBLE**
   Sessions : ${sessions} (${sessionsChange >= 0 ? "+" : ""}${sessionsChange}% vs sem. précédente)
   Utilisateurs : ${totalUsers} (${newUsers} nouveaux / ${returningUsers} récurrents)
   Taux de conversion : ${conversionRate.toFixed(2)}%
   Ratio returning : ${totalUsers > 0 ? ((returningUsers / totalUsers) * 100).toFixed(1) : 0}%

🌐 **SOURCES DE TRAFIC**
${sourceAnalysis.slice(0, 5).map(s => `   ${trendIcon(s.trend)} ${s.source}/${s.medium} : ${s.sessions} sessions (${s.percentage.toFixed(1)}%) — ${s.note}`).join("\n")}

🔄 **FUNNEL**
   Impressions → Clics → Paniers → Achats
   ${impressions} → ${clicks} → ${data.funnel.addToCarts} → ${purchases}
   Taux conversion global : ${conversionRate.toFixed(2)}%

💡 **INSIGHTS**
${insights.map(i => `   ${i}`).join("\n")}

⚡ **RECOMMANDATIONS**
${recommendations.map((r, i) => `   ${i + 1}. ${r}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Rapport GA4 généré par le Skill Analyse GA4 — Cockpit Uburn
`.trim();

  return { report, data };
}
