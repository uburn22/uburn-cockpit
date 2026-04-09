import type { MetaAdsData, ShopifyData, Alert, SignalsData } from "@/services/types";
import { ALERT_RULES, TARGETS } from "@/lib/constants";

export function computeSignals(
  ads: MetaAdsData,
  shopify: ShopifyData
): SignalsData {
  const alerts: Alert[] = [];
  let id = 0;

  // Creative fatigue: frequency > 3 on any active ad
  for (const c of ads.creatives) {
    if (
      c.creative.status === "ACTIVE" &&
      c.totals.frequency > ALERT_RULES.creativeFatigueFrequency
    ) {
      alerts.push({
        id: `alert_${id++}`,
        severity: "warning",
        title: `Fatigue créative : ${c.creative.name}`,
        description: `Fréquence à ${c.totals.frequency.toFixed(1)} (seuil: ${ALERT_RULES.creativeFatigueFrequency}). L'audience voit cette ad trop souvent.`,
        action: "Remplacer par une nouvelle créative ou pauser pendant 48h.",
      });
    }
  }

  // Budget burned without conversions
  for (const c of ads.creatives) {
    if (
      c.creative.status === "ACTIVE" &&
      c.totals.spend > ALERT_RULES.budgetBurnedThreshold &&
      c.totals.conversions === 0
    ) {
      alerts.push({
        id: `alert_${id++}`,
        severity: "critical",
        title: `Budget brûlé : ${c.creative.name}`,
        description: `€${c.totals.spend.toFixed(2)} dépensés, 0 conversions.`,
        action: "Couper immédiatement et analyser la landing page.",
      });
    }
  }

  // Low ROAS
  if (ads.blendedRoas < ALERT_RULES.lowRoasThreshold) {
    alerts.push({
      id: `alert_${id++}`,
      severity: "critical",
      title: "ROAS blended trop bas",
      description: `ROAS actuel: ${ads.blendedRoas.toFixed(2)}x (seuil: ${ALERT_RULES.lowRoasThreshold}x).`,
      action: "Réduire le budget et auditer les créatives sous-performantes.",
    });
  }

  // CPA above target
  if (ads.averageCpo > ALERT_RULES.cpaAboveTarget) {
    alerts.push({
      id: `alert_${id++}`,
      severity: "warning",
      title: "CPA au-dessus de la cible",
      description: `CPO moyen: €${ads.averageCpo.toFixed(2)} (cible: <€${ALERT_RULES.cpaAboveTarget}).`,
      action: "Vérifier la landing page et le checkout funnel.",
    });
  }

  // Low CTR
  for (const c of ads.creatives) {
    if (
      c.creative.status === "ACTIVE" &&
      c.totals.ctr < ALERT_RULES.ctrDropThreshold
    ) {
      alerts.push({
        id: `alert_${id++}`,
        severity: "warning",
        title: `CTR faible : ${c.creative.name}`,
        description: `CTR: ${(c.totals.ctr * 100).toFixed(2)}% (seuil: ${(ALERT_RULES.ctrDropThreshold * 100).toFixed(1)}%).`,
        action: "Couper après 3 jours si pas d'amélioration.",
      });
    }
  }

  // Scaling opportunity
  const highRoasCreatives = ads.creatives.filter(
    (c) =>
      c.creative.status === "ACTIVE" &&
      c.totals.roas >= ALERT_RULES.scalingOpportunityRoas
  );
  if (highRoasCreatives.length > 0) {
    alerts.push({
      id: `alert_${id++}`,
      severity: "success",
      title: "Opportunité de scaling",
      description: `${highRoasCreatives.length} créative(s) avec ROAS ≥ ${ALERT_RULES.scalingOpportunityRoas}x : ${highRoasCreatives.map((c) => c.creative.name).join(", ")}.`,
      action: "Augmenter le budget de +15% tous les 2-3 jours.",
    });
  }

  // Low orders vs goal
  const avgOrders =
    shopify.dailyRevenue.length > 0
      ? shopify.totalOrders / shopify.dailyRevenue.length
      : 0;
  if (avgOrders < TARGETS.ordersPerDay * 0.1) {
    alerts.push({
      id: `alert_${id++}`,
      severity: "warning",
      title: "Loin de l'objectif 100 cmd/jour",
      description: `Moyenne: ${avgOrders.toFixed(1)} commandes/jour (objectif: ${TARGETS.ordersPerDay}).`,
      action: "Augmenter le budget ads et diversifier les créatives.",
    });
  }

  // Sort: critical first, then warning, then success
  const severityOrder = { critical: 0, warning: 1, success: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Top 3 priority actions
  const priorityActions = alerts.slice(0, 3).map((a, i) => ({
    rank: i + 1,
    action: a.action,
    reason: a.title,
  }));

  return { alerts, priorityActions };
}
