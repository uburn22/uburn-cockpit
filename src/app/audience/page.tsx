"use client";

import { useMemo } from "react";
import { Shell } from "@/components/layout/shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { LineChart } from "@/components/charts/line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { periodToDateRange, type Period } from "@/lib/date-utils";
import { getMockAudienceData } from "@/services/mock/audience";
import { TARGETS, COLORS } from "@/lib/constants";
import { Mail, Users as UsersIcon } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";

export default function AudiencePage() {
  return (
    <Shell title="Audience Health">
      {(period: Period) => <AudienceContent period={period} />}
    </Shell>
  );
}

function AudienceContent({ period }: { period: Period }) {
  const data = useMemo(() => {
    const range = periodToDateRange(period);
    return getMockAudienceData(range);
  }, [period]);

  const newPct = data.newVsReturning.new;
  const retPct = 1 - newPct;

  const donutData = [
    { name: "Nouveaux", value: Math.round(newPct * 100) },
    { name: "Récurrents", value: Math.round(retPct * 100) },
  ];

  const cacData = data.cacTrend.map((d) => ({ date: d.date, value: d.cac }));

  const ltvBars = [
    { name: "30j", value: data.ltv30 },
    { name: "60j", value: data.ltv60 },
    { name: "90j", value: data.ltv90 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <ActionButton label="Envoyer email relance" icon={Mail} />
        <ActionButton label="Créer segment" icon={UsersIcon} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Taux repeat" value={`${(data.repeatRate * 100).toFixed(1)}%`} subtitle="Clients récurrents" />
        <KpiCard title="LTV 30j" value={`€${data.ltv30.toFixed(2)}`} subtitle={`90j: €${data.ltv90.toFixed(2)}`} />
        <KpiCard title="CAC" value={`€${data.cac.toFixed(2)}`} subtitle={`Cible: <€${TARGETS.cpaTarget}`} />
        <KpiCard title="New vs Returning" value={`${Math.round(newPct * 100)}% / ${Math.round(retPct * 100)}%`} subtitle="Nouveaux / Récurrents" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">LTV par période</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-6 pt-4">
              {ltvBars.map((bar) => {
                const maxLtv = data.ltv90;
                const heightPct = maxLtv > 0 ? (bar.value / maxLtv) * 100 : 0;
                return (
                  <div key={bar.name} className="flex flex-col items-center gap-2">
                    <span className="text-sm font-bold text-foreground">€{bar.value.toFixed(0)}</span>
                    <div className="w-14 rounded-t-md bg-primary" style={{ height: `${Math.max(heightPct * 1.5, 20)}px` }} />
                    <span className="text-xs text-muted-foreground">{bar.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nouveaux vs Récurrents</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={donutData} height={200} colors={[COLORS.primaryLight, COLORS.primary]} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Évolution CAC</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={cacData} formatValue={(v) => `€${v.toFixed(0)}`} height={200} referenceLine={{ value: TARGETS.cpaTarget, label: `Cible €${TARGETS.cpaTarget}` }} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Rétention par cohorte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Cohorte</th>
                  <th className="pb-2 pr-2 font-medium text-center">Clients</th>
                  {Array.from({ length: 8 }, (_, i) => (
                    <th key={i} className="pb-2 px-1 font-medium text-center">S{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((cohort) => (
                  <tr key={cohort.cohortWeek} className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">{cohort.cohortWeek}</td>
                    <td className="py-2 pr-2 text-center text-muted-foreground">{cohort.totalCustomers}</td>
                    {Array.from({ length: 8 }, (_, i) => {
                      const ret = cohort.retention[i];
                      if (ret === undefined) return <td key={i} className="px-1 py-2 text-center text-muted-foreground/30">—</td>;
                      const intensity = Math.min(ret / 0.2, 1);
                      return (
                        <td key={i} className="px-1 py-2 text-center font-medium" style={{
                          backgroundColor: `rgba(124, 58, 237, ${intensity * 0.25})`,
                          color: intensity > 0.3 ? COLORS.primaryDark : COLORS.muted,
                        }}>
                          {(ret * 100).toFixed(0)}%
                        </td>
                      );
                    })}
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
