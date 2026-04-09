"use client";

import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentLogs, useAgentConfigs, useRunAgent } from "@/hooks/use-agents";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  Bot,
  Megaphone,
  ShoppingBag,
  Truck,
  Mail,
  BarChart3,
  Palette,
  Rocket,
  PenTool,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const AGENT_META: Record<string, { label: string; description: string; icon: typeof Bot }> = {
  "meta-ads": { label: "Agent Meta Ads", description: "ROAS check, pause/scale, budget alerts", icon: Megaphone },
  shopify: { label: "Agent Shopify", description: "Stock, AOV trend, repeat customers", icon: ShoppingBag },
  sendcloud: { label: "Agent Sendcloud", description: "Colis bloqués, delivery rate, carrier delays", icon: Truck },
  "email-crm": { label: "Agent Email/CRM", description: "Paniers abandonnés, relance, fidélisation", icon: Mail },
  ga4: { label: "Agent GA4", description: "Trafic, sources, new vs returning, alertes", icon: BarChart3 },
  crea: { label: "Agent Créa", description: "Analyse créatives, hook rate, CTR, fatigue", icon: Palette },
  growth: { label: "Agent Growth", description: "Stratégie globale, 3 actions/jour, projections", icon: Rocket },
  content: { label: "Agent Content", description: "Créas pub auto (Bannerbear), infographies (Napkin AI), posts social", icon: PenTool },
};

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  success: { variant: "default", label: "OK" },
  warning: { variant: "secondary", label: "Warning" },
  error: { variant: "destructive", label: "Error" },
};

export default function AgentsPage() {
  return (
    <Shell title="Agents IA">
      {() => <AgentsContent />}
    </Shell>
  );
}

function AgentsContent() {
  const { configs, loading: loadingConfigs, toggle } = useAgentConfigs();
  const { logs, loading: loadingLogs, refresh: refreshLogs } = useAgentLogs(30);
  const { run, running } = useRunAgent();

  const handleRun = async (agentName: string) => {
    const result = await run(agentName);
    toast.success(`${AGENT_META[agentName]?.label || agentName}`, {
      description: result.actions.join("\n"),
    });
    refreshLogs();
  };

  const handleToggle = async (agentName: string, enabled: boolean) => {
    await toggle(agentName, enabled);
    toast.info(`${AGENT_META[agentName]?.label} ${enabled ? "activé" : "désactivé"}`);
  };

  if (loadingConfigs) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement agents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Status Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {configs.map((config) => {
          const meta = AGENT_META[config.agent_name] || { label: config.agent_name, description: "", icon: Bot };
          const Icon = meta.icon;
          const lastLog = logs.find((l) => l.agent_name === config.agent_name);

          return (
            <Card key={config.agent_name} className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-semibold">{meta.label}</CardTitle>
                  </div>
                  <button
                    onClick={() => handleToggle(config.agent_name, !config.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enabled ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Intervalle</span>
                  <span className="font-medium">{config.interval_hours}h</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dernière exécution</span>
                  <span className="font-medium">
                    {config.last_run
                      ? formatDistanceToNow(new Date(config.last_run), { addSuffix: true, locale: fr })
                      : "Jamais"}
                  </span>
                </div>
                {lastLog && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Dernière action</span>
                    <Badge variant={STATUS_BADGE[lastLog.status]?.variant || "outline"} className="text-[10px]">
                      {lastLog.action}
                    </Badge>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => handleRun(config.agent_name)}
                  disabled={running === config.agent_name}
                >
                  {running === config.agent_name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Run Now
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Logs */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Logs récents ({logs.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={refreshLogs} className="text-xs">
              Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun log — lancez un agent pour commencer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Horodatage</th>
                    <th className="pb-3 pr-4 font-medium">Agent</th>
                    <th className="pb-3 pr-4 font-medium">Action</th>
                    <th className="pb-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/30">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                        {log.timestamp
                          ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: fr })
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {AGENT_META[log.agent_name]?.label || log.agent_name}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{log.action}</td>
                      <td className="py-2.5">
                        <Badge variant={STATUS_BADGE[log.status]?.variant || "outline"} className="text-[10px]">
                          {STATUS_BADGE[log.status]?.label || log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
