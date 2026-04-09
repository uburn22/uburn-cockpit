"use client";

import { Shell } from "@/components/layout/shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Period } from "@/lib/date-utils";
import { useSendcloudData } from "@/hooks/use-api-data";
import { COLORS } from "@/lib/constants";
import { Loader2, Package, CheckCircle, Clock, Truck, RotateCcw, AlertTriangle } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";

const STATUS_COLORS: Record<string, string> = {
  Delivered: COLORS.green,
  "In transit": COLORS.primary,
  "Out for delivery": COLORS.primaryLight,
  "Ready to send": COLORS.muted,
  Announced: COLORS.muted,
};

export default function LogisticsPage() {
  return (
    <Shell title="Logistics">
      {(period: Period) => <LogisticsContent period={period} />}
    </Shell>
  );
}

function LogisticsContent({ period }: { period: Period }) {
  const { data, loading, error } = useSendcloudData(period);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement Sendcloud...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-destructive">
        Erreur Sendcloud : {error}
      </div>
    );
  }

  const shipmentBarData = data.dailyShipments.map((d) => ({ name: d.date.slice(5), value: d.shipped }));

  const carrierDonutData = data.carrierSplit.map((c, i) => ({
    name: c.name,
    value: c.count,
    fill: [COLORS.primary, COLORS.primaryLight, COLORS.primaryDark, COLORS.muted, COLORS.border][i % 5],
  }));

  const statusCount = new Map<string, number>();
  for (const p of data.parcels) {
    statusCount.set(p.status, (statusCount.get(p.status) || 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Colis expédiés" value={data.totalShipped.toString()} subtitle={`${period === "7d" ? "7" : period === "30d" ? "30" : "90"} jours`} />
        <KpiCard title="Colis livrés" value={data.totalDelivered.toString()} subtitle={`${(data.deliveryRate * 100).toFixed(1)}% taux livraison`} />
        <KpiCard title="Délai moyen" value={`${data.avgDeliveryDays.toFixed(1)}j`} subtitle="Expédition → Livraison" />
        <KpiCard title="En cours" value={(data.totalShipped - data.totalDelivered).toString()} subtitle="Transit + En livraison" />
      </div>

      <div className="flex flex-wrap gap-3">
        {Array.from(statusCount.entries()).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] || COLORS.muted }} />
            <span className="text-xs font-medium text-foreground">{status}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expéditions par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={shipmentBarData} barColor={COLORS.primary} />
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Répartition transporteurs</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={carrierDonutData} height={250} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Suivi des colis ({data.parcels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Commande</th>
                  <th className="pb-3 pr-4 font-medium">Tracking</th>
                  <th className="pb-3 pr-4 font-medium">Transporteur</th>
                  <th className="pb-3 pr-4 font-medium">Statut</th>
                  <th className="pb-3 pr-4 font-medium">Poids</th>
                  <th className="pb-3 pr-4 font-medium">Créé le</th>
                  <th className="pb-3 pr-4 font-medium">Mis à jour</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.parcels.slice(0, 50).map((p) => (
                  <tr key={p.id} className="border-b border-border/30">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{p.orderNumber}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{p.trackingNumber}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{p.carrier}</td>
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        {p.status === "Delivered" ? <CheckCircle className="h-3 w-3 text-[#22C55E]" /> :
                         p.status === "In transit" ? <Truck className="h-3 w-3 text-primary" /> :
                         p.status === "Out for delivery" ? <Package className="h-3 w-3 text-primary" /> :
                         <Clock className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-xs font-medium" style={{ color: STATUS_COLORS[p.status] || COLORS.muted }}>{p.status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{p.weight} kg</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{p.createdAt}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{p.updatedAt}</td>
                    <td className="py-2.5 text-right">
                      {p.status !== "Delivered" && (
                        <div className="flex justify-end gap-1">
                          <ActionButton label="Relancer" icon={RotateCcw} size="sm" />
                          <ActionButton label="Signaler" icon={AlertTriangle} size="sm" />
                        </div>
                      )}
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
