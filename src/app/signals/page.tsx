"use client";

import { useMemo } from "react";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Period } from "@/lib/date-utils";
import { computeSignals } from "@/components/signals/signal-engine";
import { useMetaAdsData, useShopifyData } from "@/hooks/use-api-data";
import { COLORS } from "@/lib/constants";
import { AlertTriangle, AlertCircle, CheckCircle, Zap, Loader2, Play } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import type { AlertSeverity } from "@/services/types";

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { icon: typeof AlertCircle; color: string; bg: string }
> = {
  critical: { icon: AlertCircle, color: COLORS.red, bg: "rgba(239, 68, 68, 0.08)" },
  warning: { icon: AlertTriangle, color: COLORS.orange, bg: "rgba(245, 158, 11, 0.08)" },
  success: { icon: CheckCircle, color: COLORS.green, bg: "rgba(34, 197, 94, 0.08)" },
};

export default function SignalsPage() {
  return (
    <Shell title="Weekly Signal">
      {(period: Period) => <SignalsContent period={period} />}
    </Shell>
  );
}

function SignalsContent({ period }: { period: Period }) {
  const { data: ads, loading: loadingAds } = useMetaAdsData(period);
  const { data: shopify, loading: loadingShopify } = useShopifyData(period);

  const signals = useMemo(() => {
    if (!ads || !shopify) return { alerts: [], priorityActions: [] };
    return computeSignals(ads, shopify);
  }, [ads, shopify]);

  if (loadingAds || loadingShopify || !ads || !shopify) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement des signaux...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
            <Zap className="h-5 w-5" />
            Top 3 actions cette semaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {signals.priorityActions.map((pa) => (
              <div key={pa.rank} className="rounded-lg border border-border bg-secondary p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {pa.rank}
                </div>
                <p className="text-sm font-medium text-foreground">{pa.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">{pa.reason}</p>
              </div>
            ))}
            {signals.priorityActions.length === 0 && (
              <p className="col-span-3 text-sm text-muted-foreground">Aucune action prioritaire.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Alertes ({signals.alerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {signals.alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.icon;
              return (
                <div key={alert.id} className="rounded-lg border border-border p-4" style={{ backgroundColor: config.bg }}>
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: config.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <p className="text-xs font-medium" style={{ color: config.color }}>→ {alert.action}</p>
                        <ActionButton label="Appliquer" icon={Play} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {signals.alerts.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune alerte — performance nominale.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
