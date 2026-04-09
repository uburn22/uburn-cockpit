import { subDays } from "date-fns";
import { logAction, getConfig, updateLastRun } from "./base";
import { getRealMetaAdsData } from "@/services/api/meta-ads";
import type { CreativeMetrics } from "@/services/types";

export async function runCreaAgent(): Promise<{ actions: string[] }> {
  const config = await getConfig("crea");
  if (!config || !config.enabled) {
    return { actions: ["Agent crea disabled"] };
  }

  const thresholds = config.thresholds;
  const minHookRate = thresholds.min_hook_rate ?? 0.25;
  const goodCTR = thresholds.good_ctr ?? 0.015;
  const minSpendAnalysis = thresholds.min_spend_analysis ?? 10;

  const actions: string[] = [];

  try {
    const range = { from: subDays(new Date(), 14), to: new Date() };
    const data = await getRealMetaAdsData(range);

    // Filter creatives with enough data
    const activeCreas = data.creatives.filter(
      (c) => c.totals.spend >= minSpendAnalysis
    );

    if (activeCreas.length === 0) {
      actions.push("Pas assez de données créatives pour analyser (min €10 de dépense)");
      await logAction("crea", "insufficient_data", {}, "warning");
      await updateLastRun("crea");
      return { actions };
    }

    // 1. Analyze hook rates — which creatives grab attention?
    const lowHook = activeCreas.filter((c) => c.totals.hookRate < minHookRate);
    const highHook = activeCreas.filter((c) => c.totals.hookRate >= minHookRate);

    if (lowHook.length > 0) {
      const names = lowHook.map((c) => `"${c.creative.name}" (${(c.totals.hookRate * 100).toFixed(1)}%)`).join(", ");
      actions.push(`⚠️ ${lowHook.length} créa(s) avec hook rate faible (<${(minHookRate * 100).toFixed(0)}%) : ${names}`);
      actions.push(`→ Recommandation : changer les 3 premières secondes. Tester un hook plus direct (bénéfice client, question, chiffre choc)`);
      await logAction("crea", "low_hook_rate", {
        count: lowHook.length,
        creatives: lowHook.map((c) => ({ name: c.creative.name, hookRate: c.totals.hookRate })),
      }, "warning");
    }

    // 2. Analyze CTR — which creatives drive clicks?
    const lowCTR = activeCreas.filter((c) => c.totals.ctr < goodCTR * 0.5);
    const highCTR = activeCreas.filter((c) => c.totals.ctr >= goodCTR);

    if (highCTR.length > 0) {
      const best = highCTR.sort((a, b) => b.totals.ctr - a.totals.ctr)[0];
      actions.push(`🟢 Meilleur CTR : "${best.creative.name}" (${(best.totals.ctr * 100).toFixed(2)}%) — à utiliser comme modèle pour les prochaines créas`);
      await logAction("crea", "best_ctr", {
        name: best.creative.name,
        ctr: best.totals.ctr,
        roas: best.totals.roas,
      }, "success");
    }

    if (lowCTR.length > 0) {
      actions.push(`⚠️ ${lowCTR.length} créa(s) avec CTR très faible — le message ne résonne pas avec l'audience`);
      actions.push(`→ Recommandation : tester de nouveaux angles (témoignage, avant/après, UGC style)`);
      await logAction("crea", "low_ctr", { count: lowCTR.length }, "warning");
    }

    // 3. Find winning patterns — what do best creatives have in common?
    const winners = activeCreas.filter((c) => c.totals.roas >= 1.5).sort((a, b) => b.totals.roas - a.totals.roas);
    const losers = activeCreas.filter((c) => c.totals.roas < 0.5 && c.totals.spend > 20);

    if (winners.length > 0) {
      const winnerNames = winners.slice(0, 3).map(
        (c) => `"${c.creative.name}" (ROAS ${c.totals.roas}x, CTR ${(c.totals.ctr * 100).toFixed(2)}%)`
      );
      actions.push(`🏆 Top créatives gagnantes :\n${winnerNames.join("\n")}`);
      await logAction("crea", "winners_analysis", {
        count: winners.length,
        top3: winners.slice(0, 3).map((c) => ({
          name: c.creative.name,
          roas: c.totals.roas,
          ctr: c.totals.ctr,
          hookRate: c.totals.hookRate,
          spend: c.totals.spend,
        })),
      }, "success");

      // Generate brief recommendations based on winners
      const avgWinnerCTR = winners.reduce((s, c) => s + c.totals.ctr, 0) / winners.length;
      const avgWinnerHook = winners.reduce((s, c) => s + c.totals.hookRate, 0) / winners.length;
      actions.push(`📊 Profil de la créa gagnante : Hook rate ~${(avgWinnerHook * 100).toFixed(1)}%, CTR ~${(avgWinnerCTR * 100).toFixed(2)}%`);
      actions.push(`→ Brief créa : s'inspirer de ces patterns pour les prochaines itérations`);
    }

    if (losers.length > 0) {
      const wastedSpend = losers.reduce((s, c) => s + c.totals.spend, 0);
      actions.push(`💸 ${losers.length} créa(s) perdantes ont consommé ${wastedSpend.toFixed(2)}€ sans retour (ROAS <0.5x)`);
      actions.push(`→ Couper ces créas et réallouer le budget vers les gagnantes`);
      await logAction("crea", "wasted_spend", { count: losers.length, wastedSpend }, "warning");
    }

    // 4. Fatigue detection — frequency too high
    const fatigued = activeCreas.filter((c) => c.totals.frequency > 3);
    if (fatigued.length > 0) {
      actions.push(`😴 ${fatigued.length} créa(s) en fatigue (fréquence >3x) — l'audience les a trop vues`);
      actions.push(`→ Remplacer par de nouvelles variations ou élargir l'audience`);
      await logAction("crea", "creative_fatigue", {
        count: fatigued.length,
        creatives: fatigued.map((c) => ({ name: c.creative.name, frequency: c.totals.frequency })),
      }, "warning");
    }

    // 5. Overall recommendation
    const totalCreas = activeCreas.length;
    const winRate = winners.length / totalCreas;
    actions.push(`\n📋 Résumé : ${totalCreas} créas analysées, ${winners.length} gagnantes (${Math.round(winRate * 100)}%), ${losers.length} perdantes`);

    if (winRate < 0.2) {
      actions.push(`🔴 Moins de 20% de créas gagnantes — besoin urgent de nouvelles créatives avec des angles différents`);
    }

    await updateLastRun("crea");
  } catch (err) {
    const msg = `Agent Créa error: ${err}`;
    actions.push(msg);
    await logAction("crea", "agent_error", { error: String(err) }, "error");
  }

  return { actions };
}
