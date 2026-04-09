"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentLog, AgentConfig } from "@/services/agents/base";

export function useAgentLogs(limit = 50) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch(`/api/agents/logs?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => { setLogs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [limit]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { logs, loading, refresh };
}

export function useAgentConfigs() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/agents/config")
      .then((r) => r.json())
      .then((d) => { setConfigs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (agentName: string, enabled: boolean) => {
    await fetch("/api/agents/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_name: agentName, enabled }),
    });
    refresh();
  };

  return { configs, loading, refresh, toggle };
}

export function useRunAgent() {
  const [running, setRunning] = useState<string | null>(null);

  const run = async (agentName: string): Promise<{ actions: string[] }> => {
    setRunning(agentName);
    try {
      const res = await fetch(`/api/agents/${agentName}/run`, { method: "POST" });
      return await res.json();
    } finally {
      setRunning(null);
    }
  };

  return { run, running };
}
