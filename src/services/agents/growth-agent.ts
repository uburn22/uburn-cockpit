import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { logAction, getConfig, updateLastRun } from "./base";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

async function fetchAPI(path: string): Promise<Record<string, unknown>> {
  const now = new Date();
  const from = format(subDays(now, 30), "yyyy-MM-dd");
  const to = format(now, "yyyy-MM-dd");
  const res = await fetch(`${BASE_URL}${path}?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) return { error: `${path} failed: ${res.status}` };
  return res.json();
}

interface ShopData {
  totalRevenue: number;
  totalOrders: number;
  aov: number;
  ordersToday: number;
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  productSplit: { name: string; revenue: number; orders: number }[];
}

interface AdsData {
  blendedRoas: number;
  averageCpo: number;
  totalSpend: number;
  creatives: { creative: { name: string; status: string }; totals: { roas: number; spend: number; conversions: number } }[];
  funnel: { impressions: number; clicks: number; purchases: number };
}

interface GA4Data {
  totalSessions: number;
  newVsReturning: { new: number; returning: number };
  sources: { source: string; medium: string; sessions: number; percentage: number }[];
}

interface ScData {
  totalShipped: number;
  totalDelivered: number;
  deliveryRate: number;
  avgDeliveryDays: number;
}

export async function runGrowthAgent(): Promise<{ actions: string[] }> {
  const config = await getConfig("growth");
  if (!config || !config.enabled) {
    return { actions: ["Agent growth disabled"] };
  }

  const actions: string[] = [];
  const today = format(new Date(), "EEEE d MMMM", { locale: fr });
  actions.push(`📊 **Rapport Growth — ${today}**\n`);

  try {
    // Fetch all data sources in parallel
    const [shopifyRaw, adsRaw, ga4Raw, sendcloudRaw] = await Promise.all([
      fetchAPI("/api/shopify"),
      fetchAPI("/api/meta-ads"),
      fetchAPI("/api/ga4"),
      fetchAPI("/api/sendcloud"),
    ]);

    const shopify = shopifyRaw as unknown as ShopData;
    const ads = adsRaw as unknown as AdsData;
    const ga4 = ga4Raw as unknown as GA4Data;
    const sendcloud = sendcloudRaw as unknown as ScData;

    // ─── 1. OBJECTIF 100 CMD/JOUR ─────────────────────
    const ordersToday = shopify.ordersToday || 0;
    const avgOrdersPerDay = shopify.totalOrders ? Math.round(shopify.totalOrders / 30) : 0;
    const objectif = 100;
    const pctObjectif = Math.round((avgOrdersPerDay / objectif) * 100);

    actions.push(`🎯 **Progression objectif** : ${avgOrdersPerDay} cmd/jour en moyenne (${pctObjectif}% de l'objectif 100)`);
    actions.push(`   Aujourd'hui : ${ordersToday} commandes\n`);

    // ─── 2. RENTABILITÉ ─────────────────────────────────
    const roas = ads.blendedRoas || 0;
    const cpo = ads.averageCpo || 0;
    const aov = shopify.aov || 0;
    const margin = aov * 0.4; // Estimation marge 40%
    const profitPerOrder = margin - cpo;

    actions.push(`💰 **Rentabilité** :`);
    actions.push(`   ROAS : ${roas}x | CPO : ${cpo.toFixed(2)}€ | AOV : ${aov.toFixed(2)}€`);
    actions.push(`   Marge estimée/cmd : ${margin.toFixed(2)}€ | Profit/cmd après ads : ${profitPerOrder.toFixed(2)}€`);

    if (profitPerOrder < 0) {
      actions.push(`   🔴 TU PERDS ${Math.abs(profitPerOrder).toFixed(2)}€ PAR COMMANDE — il faut soit baisser le CPO soit augmenter l'AOV\n`);
      await logAction("growth", "negative_profit", { profitPerOrder, cpo, aov }, "warning");
    } else if (profitPerOrder < 5) {
      actions.push(`   🟡 Marge faible — scale avec prudence\n`);
    } else {
      actions.push(`   🟢 Profitable — prêt à scale\n`);
    }

    // ─── 3. MEILLEUR CANAL D'ACQUISITION ────────────────
    if (ga4.sources && ga4.sources.length > 0) {
      const topSources = ga4.sources.slice(0, 3);
      actions.push(`📈 **Top sources de trafic** :`);
      for (const s of topSources) {
        actions.push(`   ${s.source}/${s.medium} : ${s.sessions} sessions (${s.percentage.toFixed(1)}%)`);
      }

      // Check if paid is converting well
      const paidSource = ga4.sources.find((s) => s.medium === "cpc" || s.medium === "paid" || s.source === "facebook");
      const organicSource = ga4.sources.find((s) => s.medium === "organic");

      if (paidSource && organicSource && organicSource.sessions > paidSource.sessions * 0.5) {
        actions.push(`   💡 L'organique représente un bon volume — investir dans le contenu peut réduire ta dépendance aux ads\n`);
      }
    }

    // ─── 4. PLAN D'ACTION DU JOUR ───────────────────────
    actions.push(`\n⚡ **3 ACTIONS PRIORITAIRES AUJOURD'HUI** :\n`);

    let actionNum = 1;

    // Action basée sur le ROAS
    if (roas < 1) {
      actions.push(`${actionNum}. 🔴 ROAS sous 1x — Couper les créas perdantes immédiatement et tester 3 nouveaux hooks`);
      actionNum++;
    } else if (roas < 2) {
      actions.push(`${actionNum}. 🟡 ROAS entre 1-2x — Itérer sur les meilleures créas (variations de hook et CTA)`);
      actionNum++;
    } else {
      actions.push(`${actionNum}. 🟢 ROAS >2x — Scale le budget de 20% sur les top créatives`);
      actionNum++;
    }

    // Action basée sur l'email
    if (shopify.totalOrders > 0) {
      const estimatedAbandoned = Math.round(shopify.totalOrders * 0.7); // ~70% taux abandon moyen
      actions.push(`${actionNum}. ✉️ Activer les emails panier abandonné — potentiel de récupérer ~${Math.round(estimatedAbandoned * 0.1)} cmd/jour supplémentaires`);
      actionNum++;
    }

    // Action basée sur le trafic
    if (ga4.totalSessions < 500) {
      actions.push(`${actionNum}. 📈 Trafic faible (${ga4.totalSessions} sessions/30j) — Augmenter la fréquence de posts Instagram + tester TikTok organique`);
    } else if (ga4.newVsReturning && ga4.newVsReturning.returning < ga4.newVsReturning.new * 0.2) {
      actions.push(`${actionNum}. 🔄 Peu de returning visitors — Mettre en place une séquence email post-achat et du retargeting`);
    } else {
      actions.push(`${actionNum}. 🎯 Tester une nouvelle audience Meta (lookalike basé sur tes meilleurs clients)`);
    }

    // ─── 5. PROJECTION ──────────────────────────────────
    actions.push(`\n📊 **Projection** :`);
    const currentDaily = avgOrdersPerDay;
    if (currentDaily > 0 && roas > 0) {
      const budgetNeeded = (objectif * cpo);
      const revenueAt100 = objectif * aov;
      actions.push(`   Pour 100 cmd/jour au CPO actuel (${cpo.toFixed(2)}€) → budget ads nécessaire : ${budgetNeeded.toFixed(0)}€/jour`);
      actions.push(`   CA projeté à 100 cmd/jour : ${revenueAt100.toFixed(0)}€/jour (${(revenueAt100 * 30).toFixed(0)}€/mois)`);

      if (profitPerOrder > 0) {
        actions.push(`   Profit projeté à 100 cmd/jour : ${(profitPerOrder * 100).toFixed(0)}€/jour`);
      }
    }

    // ─── 6. LOGISTIQUE ──────────────────────────────────
    if (sendcloud.deliveryRate < 0.9) {
      actions.push(`\n⚠️ **Logistique** : Taux de livraison à ${(sendcloud.deliveryRate * 100).toFixed(1)}% — risque d'avis négatifs qui freinent la croissance`);
    }

    await logAction("growth", "daily_report", {
      ordersToday,
      avgOrdersPerDay,
      roas,
      cpo,
      aov,
      profitPerOrder,
      totalSessions: ga4.totalSessions,
      deliveryRate: sendcloud.deliveryRate,
    }, "success");

    await updateLastRun("growth");
  } catch (err) {
    const msg = `Agent Growth error: ${err}`;
    actions.push(msg);
    await logAction("growth", "agent_error", { error: String(err) }, "error");
  }

  return { actions };
}
