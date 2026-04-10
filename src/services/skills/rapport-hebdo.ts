import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");

async function fetchAPI(path: string, from: string, to: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${path}?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) return { error: `${path} failed: ${res.status}` };
  return res.json();
}

interface WeeklyReportData {
  period: string;
  revenue: { total: number; avgPerDay: number; vsLastWeek: number };
  orders: { total: number; avgPerDay: number; vsLastWeek: number; progressVs100: number };
  aov: number;
  ads: { spend: number; roas: number; cpo: number; topCreative: string; worstCreative: string };
  traffic: { sessions: number; topSource: string; newVsReturning: string };
  logistics: { shipped: number; deliveryRate: number; avgDays: number };
  highlights: string[];
  warnings: string[];
  actions: string[];
}

export async function generateRapportHebdo(): Promise<{ report: string; data: WeeklyReportData }> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevWeekStart = subDays(weekStart, 7);
  const prevWeekEnd = subDays(weekStart, 1);

  const from = format(weekStart, "yyyy-MM-dd");
  const to = format(weekEnd, "yyyy-MM-dd");
  const prevFrom = format(prevWeekStart, "yyyy-MM-dd");
  const prevTo = format(prevWeekEnd, "yyyy-MM-dd");

  // Fetch current and previous week data
  const [shopify, shopifyPrev, ads, adsPrev, ga4, sendcloud] = await Promise.all([
    fetchAPI("/api/shopify", from, to),
    fetchAPI("/api/shopify", prevFrom, prevTo),
    fetchAPI("/api/meta-ads", from, to),
    fetchAPI("/api/meta-ads", prevFrom, prevTo),
    fetchAPI("/api/ga4", from, to),
    fetchAPI("/api/sendcloud", from, to),
  ]);

  // Extract data safely
  const s = shopify as Record<string, unknown>;
  const sp = shopifyPrev as Record<string, unknown>;
  const a = ads as Record<string, unknown>;
  const ap = adsPrev as Record<string, unknown>;
  const g = ga4 as Record<string, unknown>;
  const sc = sendcloud as Record<string, unknown>;

  const totalRevenue = (s.totalRevenue as number) || 0;
  const prevRevenue = (sp.totalRevenue as number) || 0;
  const totalOrders = (s.totalOrders as number) || 0;
  const prevOrders = (sp.totalOrders as number) || 0;
  const aov = (s.aov as number) || 0;
  const roas = (a.blendedRoas as number) || 0;
  const prevRoas = (ap.blendedRoas as number) || 0;
  const cpo = (a.averageCpo as number) || 0;
  const totalSpend = (a.totalSpend as number) || 0;
  const sessions = (g.totalSessions as number) || 0;
  const deliveryRate = (sc.deliveryRate as number) || 0;
  const avgDeliveryDays = (sc.avgDeliveryDays as number) || 0;
  const totalShipped = (sc.totalShipped as number) || 0;

  const revenueChange = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;
  const ordersChange = prevOrders > 0 ? Math.round(((totalOrders - prevOrders) / prevOrders) * 100) : 0;
  const avgOrdersPerDay = Math.round(totalOrders / 7);

  // Top creative
  const creatives = (a.creatives as Array<{ creative: { name: string }; totals: { roas: number; spend: number } }>) || [];
  const topCrea = creatives.length > 0 ? creatives.sort((a, b) => b.totals.roas - a.totals.roas)[0]?.creative?.name || "N/A" : "N/A";
  const worstCrea = creatives.length > 0 ? creatives.sort((a, b) => a.totals.roas - b.totals.roas)[0]?.creative?.name || "N/A" : "N/A";

  // Top source
  const sources = (g.sources as Array<{ source: string; medium: string; sessions: number }>) || [];
  const topSource = sources.length > 0 ? `${sources[0].source}/${sources[0].medium}` : "N/A";

  const newVsRet = g.newVsReturning as { new: number; returning: number } | undefined;
  const newVsReturning = newVsRet ? `${newVsRet.new} new / ${newVsRet.returning} returning` : "N/A";

  // Build highlights, warnings, actions
  const highlights: string[] = [];
  const warnings: string[] = [];
  const actions: string[] = [];

  if (revenueChange > 10) highlights.push(`CA en hausse de +${revenueChange}% vs semaine dernière`);
  if (roas > 2) highlights.push(`ROAS solide à ${roas}x`);
  if (avgOrdersPerDay >= 50) highlights.push(`${avgOrdersPerDay} cmd/jour — on se rapproche de l'objectif !`);

  if (revenueChange < -10) warnings.push(`CA en baisse de ${revenueChange}% vs semaine dernière`);
  if (roas < 1.5) warnings.push(`ROAS faible à ${roas}x — attention à la rentabilité`);
  if (deliveryRate < 0.9) warnings.push(`Taux de livraison à ${(deliveryRate * 100).toFixed(1)}% — impact sur la satisfaction`);
  if (cpo > aov * 0.5) warnings.push(`CPO élevé (${cpo.toFixed(2)}€) — plus de 50% du panier moyen`);

  if (roas < 1.5) actions.push("Couper les créas avec ROAS < 1x et relancer des tests");
  if (avgOrdersPerDay < 100) actions.push(`Augmenter le budget ads progressivement (+20%) pour passer de ${avgOrdersPerDay} à ${Math.min(avgOrdersPerDay * 1.2, 100)} cmd/jour`);
  if (deliveryRate < 0.9) actions.push("Contacter Sendcloud pour résoudre les blocages logistiques");
  if (newVsRet && newVsRet.returning < newVsRet.new * 0.15) actions.push("Mettre en place des séquences email post-achat pour améliorer la rétention");
  if (actions.length < 3) actions.push("Tester 3 nouvelles audiences lookalike sur Meta");

  const period = `${format(weekStart, "d MMM", { locale: fr })} — ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;

  const data: WeeklyReportData = {
    period,
    revenue: { total: totalRevenue, avgPerDay: Math.round(totalRevenue / 7), vsLastWeek: revenueChange },
    orders: { total: totalOrders, avgPerDay: avgOrdersPerDay, vsLastWeek: ordersChange, progressVs100: Math.round((avgOrdersPerDay / 100) * 100) },
    aov,
    ads: { spend: totalSpend, roas, cpo, topCreative: topCrea, worstCreative: worstCrea },
    traffic: { sessions, topSource, newVsReturning },
    logistics: { shipped: totalShipped, deliveryRate, avgDays: avgDeliveryDays },
    highlights,
    warnings,
    actions,
  };

  // Generate formatted report
  const report = `
📊 **RAPPORT HEBDOMADAIRE UBURN**
📅 ${period}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 **REVENUE**
   CA total : ${totalRevenue.toFixed(0)}€ (${revenueChange >= 0 ? "+" : ""}${revenueChange}% vs sem. précédente)
   CA moyen/jour : ${Math.round(totalRevenue / 7)}€
   Panier moyen (AOV) : ${aov.toFixed(2)}€

📦 **COMMANDES**
   Total : ${totalOrders} commandes
   Moyenne/jour : ${avgOrdersPerDay} cmd/jour
   Progression objectif 100/jour : ${data.orders.progressVs100}%
   ${ordersChange >= 0 ? "📈" : "📉"} ${ordersChange >= 0 ? "+" : ""}${ordersChange}% vs sem. précédente

📣 **ADS (META)**
   Dépense : ${totalSpend.toFixed(0)}€
   ROAS : ${roas}x ${roas > prevRoas ? "📈" : roas < prevRoas ? "📉" : "➡️"}
   CPO : ${cpo.toFixed(2)}€
   Top créa : ${topCrea}
   Pire créa : ${worstCrea}

📈 **TRAFIC (GA4)**
   Sessions : ${sessions}
   Top source : ${topSource}
   New vs Returning : ${newVsReturning}

🚚 **LOGISTIQUE**
   Expédiés : ${totalShipped}
   Taux livraison : ${(deliveryRate * 100).toFixed(1)}%
   Délai moyen : ${avgDeliveryDays.toFixed(1)} jours

${highlights.length > 0 ? `✅ **POINTS POSITIFS**\n${highlights.map(h => `   • ${h}`).join("\n")}\n` : ""}
${warnings.length > 0 ? `⚠️ **ALERTES**\n${warnings.map(w => `   • ${w}`).join("\n")}\n` : ""}
⚡ **ACTIONS PRIORITAIRES**
${actions.map((a, i) => `   ${i + 1}. ${a}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Généré par l'Agent Growth — Cockpit Uburn
`.trim();

  return { report, data };
}
