"use client";

import { Shell } from "@/components/layout/shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { Gauge } from "@/components/charts/gauge";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Period } from "@/lib/date-utils";
import { useShopifyData } from "@/hooks/use-api-data";
import { TARGETS } from "@/lib/constants";
import { Loader2, DollarSign, Tag } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";

export default function RevenuePage() {
  return (
    <Shell title="Revenue Intelligence">
      {(period: Period) => <RevenueContent period={period} />}
    </Shell>
  );
}

function RevenueContent({ period }: { period: Period }) {
  const { data, loading, error } = useShopifyData(period);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement Shopify...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">
        Erreur Shopify : {error}
      </div>
    );
  }

  const days = data.dailyRevenue.length;
  const avgOrdersPerDay = days > 0 ? data.totalOrders / days : 0;

  const recent = data.dailyRevenue.slice(-7);
  const previous = data.dailyRevenue.slice(-14, -7);
  const recentRevenue = recent.reduce((s, d) => s + d.revenue, 0);
  const prevRevenue = previous.reduce((s, d) => s + d.revenue, 0);
  const revenueDelta =
    prevRevenue > 0 ? ((recentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const recentOrders = recent.reduce((s, d) => s + d.orders, 0);
  const prevOrders = previous.reduce((s, d) => s + d.orders, 0);
  const ordersDelta =
    prevOrders > 0 ? ((recentOrders - prevOrders) / prevOrders) * 100 : 0;

  const areaData = data.dailyRevenue.map((d) => ({ date: d.date, value: d.revenue }));
  const barData = data.dailyRevenue.map((d) => ({ name: d.date.slice(5), value: d.orders }));
  const donutData = data.productSplit.map((p) => ({ name: p.name, value: p.revenue }));

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex gap-3">
        <ActionButton label="Ajuster prix" icon={DollarSign} />
        <ActionButton label="Lancer promo" icon={Tag} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Revenue"
          value={`€${data.totalRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}`}
          delta={revenueDelta}
          subtitle={`${days} jours`}
        />
        <KpiCard title="Panier moyen" value={`€${data.aov.toFixed(2)}`} subtitle="AOV" />
        <KpiCard title="Taux conversion" value={`${(data.conversionRate * 100).toFixed(1)}%`} subtitle="Objectif: >2%" />
        <KpiCard
          title="Commandes aujourd'hui"
          value={data.ordersToday.toString()}
          delta={ordersDelta}
          subtitle={`Moy: ${avgOrdersPerDay.toFixed(1)}/jour`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Progression objectif</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center pb-6">
            <Gauge value={data.ordersToday} max={TARGETS.ordersPerDay} label="commandes / jour" />
          </CardContent>
        </Card>
        <Card className="col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue quotidien</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart data={areaData} formatValue={(v) => `€${v.toFixed(0)}`} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commandes par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={barData} />
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Répartition produits</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={donutData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
