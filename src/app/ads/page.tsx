"use client";

import { Shell } from "@/components/layout/shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Period } from "@/lib/date-utils";
import { useMetaAdsData } from "@/hooks/use-api-data";
import { TARGETS, COLORS } from "@/lib/constants";
import { Loader2, Pause, TrendingUp, XCircle } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";

export default function AdsPage() {
  return (
    <Shell title="Ads Performance">
      {(period: Period) => <AdsContent period={period} />}
    </Shell>
  );
}

function AdsContent({ period }: { period: Period }) {
  const { data, loading, error } = useMetaAdsData(period);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement Meta Ads...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">
        Erreur Meta Ads : {error}
      </div>
    );
  }

  const roasData = data.creatives.map((c) => ({
    name: c.creative.name.length > 16 ? c.creative.name.slice(0, 16) + "…" : c.creative.name,
    value: c.totals.roas,
    fill: c.totals.roas >= TARGETS.roasTarget ? COLORS.primary : COLORS.red,
  }));

  const spendData = data.dailySpend.map((d) => ({ date: d.date, value: d.spend }));

  const funnel = data.funnel;
  const funnelSteps = [
    { name: "Impressions", value: funnel.impressions, rate: "" },
    { name: "Hook (3s)", value: Math.round(funnel.impressions * funnel.hookRate), rate: `${(funnel.hookRate * 100).toFixed(1)}%` },
    { name: "Clics", value: funnel.clicks, rate: `${(funnel.ctr * 100).toFixed(2)}%` },
    { name: "ATC", value: funnel.atc, rate: `${(funnel.atcRate * 100).toFixed(1)}%` },
    { name: "Checkout", value: funnel.checkouts, rate: `${(funnel.checkoutRate * 100).toFixed(1)}%` },
    { name: "Achats", value: funnel.purchases, rate: `${(funnel.conversionRate * 100).toFixed(2)}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="ROAS blended" value={`${data.blendedRoas.toFixed(2)}x`} subtitle={`Objectif: >${TARGETS.roasTarget}x`} />
        <KpiCard title="CPO moyen" value={`€${data.averageCpo.toFixed(2)}`} subtitle={`Cible: <€${TARGETS.cpaMax}`} />
        <KpiCard title="Dépense totale" value={`€${data.totalSpend.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`} subtitle={`~€${(data.totalSpend / (data.dailySpend.length || 1)).toFixed(0)}/jour`} />
        <KpiCard title="CTR moyen" value={`${(data.averageCtr * 100).toFixed(2)}%`} subtitle="Objectif: >1.5%" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROAS par créative</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={roasData} layout="vertical" formatValue={(v) => `${v.toFixed(2)}x`} showTarget={TARGETS.roasTarget} height={250} />
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dépense quotidienne</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={spendData} formatValue={(v) => `€${v.toFixed(0)}`} height={250} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Funnel d&apos;acquisition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            {funnelSteps.map((step, i) => {
              const maxVal = funnelSteps[0].value;
              const heightPct = maxVal > 0 ? Math.max((step.value / maxVal) * 100, 8) : 8;
              return (
                <div key={step.name} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{step.value.toLocaleString("fr-FR")}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${heightPct * 2}px`,
                      backgroundColor: i === funnelSteps.length - 1 ? COLORS.primary : `rgba(124, 58, 237, ${0.15 + (1 - i / funnelSteps.length) * 0.45})`,
                    }}
                  />
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground">{step.name}</p>
                    {step.rate && <p className="text-xs text-primary">{step.rate}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Performance par créative</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Créative</th>
                  <th className="pb-3 pr-4 font-medium text-right">Dépense</th>
                  <th className="pb-3 pr-4 font-medium text-right">Impressions</th>
                  <th className="pb-3 pr-4 font-medium text-right">CTR</th>
                  <th className="pb-3 pr-4 font-medium text-right">Conv.</th>
                  <th className="pb-3 pr-4 font-medium text-right">ROAS</th>
                  <th className="pb-3 pr-4 font-medium text-right">CPO</th>
                  <th className="pb-3 pr-4 font-medium text-right">Statut</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.creatives.map((c) => (
                  <tr key={c.creative.id} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium text-foreground">{c.creative.name}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">€{c.totals.spend.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{c.totals.impressions.toLocaleString("fr-FR")}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{(c.totals.ctr * 100).toFixed(2)}%</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{c.totals.conversions}</td>
                    <td className={`py-3 pr-4 text-right font-medium ${c.totals.roas >= TARGETS.roasTarget ? "text-[#22C55E]" : "text-[#EF4444]"}`}>{c.totals.roas.toFixed(2)}x</td>
                    <td className={`py-3 pr-4 text-right ${c.totals.cpo <= TARGETS.cpaMax ? "text-muted-foreground" : "text-[#EF4444]"}`}>€{c.totals.cpo.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.creative.status === "ACTIVE" ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-muted text-muted-foreground"}`}>
                        {c.creative.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <ActionButton label="Pauser" icon={Pause} size="sm" />
                        <ActionButton label="+20%" icon={TrendingUp} size="sm" />
                        <ActionButton label="Couper" icon={XCircle} size="sm" variant="outline" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
