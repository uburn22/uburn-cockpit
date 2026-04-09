import { logAction, getConfig, updateLastRun } from "./base";
import { format, subDays } from "date-fns";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

interface GA4Data {
  totalSessions: number;
  newVsReturning: { new: number; returning: number };
  sources: { source: string; medium: string; sessions: number; percentage: number }[];
  daily: { date: string; sessions: number; newUsers: number; returningUsers: number }[];
}

async function fetchGA4(): Promise<GA4Data> {
  const now = new Date();
  const from = format(subDays(now, 30), "yyyy-MM-dd");
  const to = format(now, "yyyy-MM-dd");
  const res = await fetch(`${BASE_URL}/api/ga4?from=${from}&to=${to}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GA4 API: ${res.status}`);
  return res.json();
}

export async function runGA4Agent(): Promise<{ actions: string[] }> {
  const config = await getConfig("ga4");
  if (!config || !config.enabled) {
    return { actions: ["Agent ga4 disabled"] };
  }

  const thresholds = config.thresholds;
  const sessionDropPct = thresholds.session_drop_pct ?? 0.2;
  const sessionSpikePct = thresholds.session_spike_pct ?? 0.5;
  const minReturningPct = thresholds.min_returning_pct ?? 0.15;

  const actions: string[] = [];

  try {
    const data = await fetchGA4();

    // 1. Check for session drops/spikes (compare last 7 days vs previous 7 days)
    const daily = data.daily;
    if (daily.length >= 14) {
      const last7 = daily.slice(-7).reduce((s, d) => s + d.sessions, 0);
      const prev7 = daily.slice(-14, -7).reduce((s, d) => s + d.sessions, 0);

      if (prev7 > 0) {
        const change = (last7 - prev7) / prev7;

        if (change < -sessionDropPct) {
          const msg = `⚠️ Chute de trafic : ${Math.abs(Math.round(change * 100))}% de sessions en moins cette semaine vs la précédente (${last7} vs ${prev7})`;
          actions.push(msg);
          await logAction("ga4", "session_drop", { last7, prev7, changePct: Math.round(change * 100) }, "warning");
          actions.push(`→ Vérifier : campagnes Meta actives ? SEO ? Problème technique sur le site ?`);
        } else if (change > sessionSpikePct) {
          const msg = `🟢 Pic de trafic : +${Math.round(change * 100)}% de sessions cette semaine (${last7} vs ${prev7})`;
          actions.push(msg);
          await logAction("ga4", "session_spike", { last7, prev7, changePct: Math.round(change * 100) }, "success");
          actions.push(`→ Identifier la source et doubler dessus`);
        }
      }
    }

    // 2. Analyze traffic sources — find best and worst
    const sources = data.sources.sort((a, b) => b.sessions - a.sessions);
    if (sources.length > 0) {
      const topSource = sources[0];
      const msg = `📊 Top source de trafic : ${topSource.source}/${topSource.medium} (${topSource.sessions} sessions, ${topSource.percentage.toFixed(1)}%)`;
      actions.push(msg);
      await logAction("ga4", "top_source", {
        source: topSource.source,
        medium: topSource.medium,
        sessions: topSource.sessions,
        pct: topSource.percentage,
      }, "success");

      // Flag if one source dominates > 70%
      if (topSource.percentage > 70) {
        actions.push(`⚠️ Dépendance : ${topSource.source} représente ${topSource.percentage.toFixed(0)}% du trafic. Diversifier les sources.`);
        await logAction("ga4", "source_dependency", { source: topSource.source, pct: topSource.percentage }, "warning");
      }
    }

    // 3. New vs Returning ratio
    const totalUsers = data.newVsReturning.new + data.newVsReturning.returning;
    if (totalUsers > 0) {
      const returningPct = data.newVsReturning.returning / totalUsers;
      if (returningPct < minReturningPct) {
        const msg = `⚠️ Faible rétention : seulement ${Math.round(returningPct * 100)}% de visiteurs récurrents (objectif >${Math.round(minReturningPct * 100)}%)`;
        actions.push(msg);
        await logAction("ga4", "low_retention", { returningPct: Math.round(returningPct * 100), target: Math.round(minReturningPct * 100) }, "warning");
        actions.push(`→ Renforcer l'email marketing et le contenu social pour faire revenir les visiteurs`);
      } else {
        const msg = `🟢 Rétention OK : ${Math.round(returningPct * 100)}% de visiteurs récurrents`;
        actions.push(msg);
        await logAction("ga4", "retention_ok", { returningPct: Math.round(returningPct * 100) }, "success");
      }
    }

    // 4. Total sessions report
    actions.push(`📈 Sessions totales (30j) : ${data.totalSessions.toLocaleString("fr-FR")}`);

    if (actions.length === 0) {
      actions.push("Aucune anomalie détectée — trafic stable");
      await logAction("ga4", "check_ok", {}, "success");
    }

    await updateLastRun("ga4");
  } catch (err) {
    const msg = `Agent GA4 error: ${err}`;
    actions.push(msg);
    await logAction("ga4", "agent_error", { error: String(err) }, "error");
  }

  return { actions };
}
