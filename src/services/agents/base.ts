import { supabase } from "@/lib/supabase";

export interface AgentLog {
  id?: string;
  agent_name: string;
  action: string;
  details: Record<string, unknown>;
  timestamp?: string;
  status: "success" | "error" | "warning";
}

export interface AgentConfig {
  id: string;
  agent_name: string;
  enabled: boolean;
  interval_hours: number;
  thresholds: Record<string, number>;
  last_run: string | null;
  updated_at: string;
}

export async function logAction(
  agentName: string,
  action: string,
  details: Record<string, unknown>,
  status: "success" | "error" | "warning"
): Promise<void> {
  await supabase.from("agent_logs").insert({
    agent_name: agentName,
    action,
    details,
    status,
  });
}

export async function getConfig(agentName: string): Promise<AgentConfig | null> {
  const { data } = await supabase
    .from("agent_config")
    .select("*")
    .eq("agent_name", agentName)
    .single();
  return data;
}

export async function getAllConfigs(): Promise<AgentConfig[]> {
  const { data } = await supabase
    .from("agent_config")
    .select("*")
    .order("agent_name");
  return data || [];
}

export async function updateLastRun(agentName: string): Promise<void> {
  await supabase
    .from("agent_config")
    .update({ last_run: new Date().toISOString() })
    .eq("agent_name", agentName);
}

export function isDue(config: AgentConfig): boolean {
  if (!config.enabled) return false;
  if (!config.last_run) return true;
  const lastRun = new Date(config.last_run).getTime();
  const intervalMs = config.interval_hours * 3600 * 1000;
  return Date.now() - lastRun >= intervalMs;
}

export async function getRecentLogs(limit = 50, agentName?: string): Promise<AgentLog[]> {
  let query = supabase
    .from("agent_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (agentName) {
    query = query.eq("agent_name", agentName);
  }

  const { data } = await query;
  return data || [];
}
