"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const GOLD = "#C9A84C";
const PURPLE = "#6B21A8";
const GREEN = "#22C55E";
const RED = "#EF4444";
const ORANGE = "#F97316";
const BLUE = "#3B82F6";
const PINK = "#EC4899";
const AMBER = "#F59E0B";
const VIOLET = "#8B5CF6";
const BG = "#09090B";
const CARD = "#111113";
const CARD2 = "#18181B";
const BORDER = "#1E1E22";
const GRAY = "#71717A";
const WHITE = "#FAFAFA";
const DIMWHITE = "#A1A1AA";

interface AgentDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  interval: string;
  angle: number;
  kpis: { l: string; v: string; c: string }[];
  lastAction: string;
  lastTime: string;
  status: string;
}

interface ContentItem {
  id: string;
  type: string;
  title: string;
  status: string;
  platform: string;
  caption: string;
  score: number | null;
  image_url?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface LiveLog {
  time: string;
  agent: string;
  msg: string;
  type: string;
}

const AGENTS: AgentDef[] = [
  { id: "meta-ads", label: "Meta Ads", icon: "📡", color: BLUE, interval: "4h", angle: 0,
    kpis: [{ l: "ROAS", v: "—", c: GREEN }, { l: "CPO", v: "—", c: WHITE }, { l: "Dépense", v: "—", c: ORANGE }],
    lastAction: "En attente de données...", lastTime: "", status: "active" },
  { id: "shopify", label: "Shopify", icon: "🛒", color: GREEN, interval: "6h", angle: 45,
    kpis: [{ l: "Commandes", v: "—", c: GOLD }, { l: "AOV", v: "—", c: WHITE }, { l: "Repeat", v: "—", c: GREEN }],
    lastAction: "En attente de données...", lastTime: "", status: "active" },
  { id: "ga4", label: "Analytics", icon: "📊", color: ORANGE, interval: "4h", angle: 90,
    kpis: [{ l: "Sessions", v: "—", c: WHITE }, { l: "Conv.", v: "—", c: GREEN }, { l: "Bounce", v: "—", c: ORANGE }],
    lastAction: "En attente de données...", lastTime: "", status: "active" },
  { id: "sendcloud", label: "Logistique", icon: "📦", color: PURPLE, interval: "2h", angle: 135,
    kpis: [{ l: "Livré", v: "—", c: GREEN }, { l: "Transit", v: "—", c: WHITE }, { l: "Bloqué", v: "—", c: RED }],
    lastAction: "En attente de données...", lastTime: "", status: "active" },
  { id: "email-crm", label: "Email CRM", icon: "💌", color: PINK, interval: "3h", angle: 180,
    kpis: [{ l: "Abandon", v: "—", c: ORANGE }, { l: "Open", v: "—", c: GREEN }, { l: "Récup.", v: "—", c: WHITE }],
    lastAction: "En attente de données...", lastTime: "", status: "active" },
  { id: "crea", label: "Créatif", icon: "🎨", color: AMBER, interval: "6h", angle: 225,
    kpis: [{ l: "Actives", v: "—", c: WHITE }, { l: "Fatigue", v: "—", c: RED }, { l: "Top CTR", v: "—", c: GREEN }],
    lastAction: "En attente de données...", lastTime: "", status: "active" },
  { id: "growth", label: "Growth", icon: "🚀", color: GOLD, interval: "24h", angle: 270,
    kpis: [{ l: "CA/jour", v: "—", c: GOLD }, { l: "vs hier", v: "—", c: GREEN }, { l: "Obj.", v: "—", c: ORANGE }],
    lastAction: "En attente de données...", lastTime: "", status: "active" },
  { id: "content", label: "Content", icon: "✍️", color: VIOLET, interval: "12h", angle: 315,
    kpis: [{ l: "Créés", v: "—", c: WHITE }, { l: "Attente", v: "—", c: ORANGE }, { l: "Publiés", v: "—", c: GREEN }],
    lastAction: "En attente de données...", lastTime: "", status: "pending" },
];

// ── Sub-Components ──

function AgentDetailPanel({ agent, onClose }: { agent: AgentDef; onClose: () => void }) {
  const statusLabel = agent.status === "warning" ? "Attention" : agent.status === "pending" ? "En attente" : "Actif";
  const statusColor = agent.status === "warning" ? ORANGE : agent.status === "pending" ? AMBER : GREEN;
  return (
    <div style={{ background: CARD, border: `1px solid ${agent.color}33`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{agent.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: WHITE }}>{agent.label}</p>
          <p style={{ margin: 0, fontSize: 11, color: GRAY }}>Toutes les {agent.interval}</p>
        </div>
        <div style={{ padding: "3px 10px", borderRadius: 20, background: `${statusColor}22`, border: `1px solid ${statusColor}44` }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: GRAY, fontSize: 18, cursor: "pointer", padding: 4 }}>×</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {agent.kpis.map((kpi, i) => (
          <div key={i} style={{ flex: 1, background: CARD2, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 9, color: GRAY, textTransform: "uppercase", letterSpacing: 0.5 }}>{kpi.l}</p>
            <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: kpi.c }}>{kpi.v}</p>
          </div>
        ))}
      </div>
      <div style={{ background: CARD2, borderRadius: 10, padding: "10px 12px" }}>
        <p style={{ margin: 0, fontSize: 10, color: GRAY }}>Dernière action {agent.lastTime ? `— ${agent.lastTime}` : ""}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: WHITE, lineHeight: 1.4 }}>{agent.lastAction}</p>
      </div>
    </div>
  );
}

function ContentCard({ item, onAction }: { item: ContentItem; onAction: (item: ContentItem, action: string) => void }) {
  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: `${GRAY}22`, color: GRAY, label: "Brouillon" },
    ai_review: { bg: `${PURPLE}22`, color: PURPLE, label: "IA Review" },
    ready: { bg: `${GREEN}22`, color: GREEN, label: "Prêt" },
    published: { bg: `${BLUE}22`, color: BLUE, label: "Publié" },
    rejected: { bg: `${RED}22`, color: RED, label: "Rejeté" },
  };
  const s = statusStyles[item.status] || statusStyles.draft;
  const typeIcons: Record<string, string> = { ad: "📢", instagram_post: "📸", instagram_reel: "🎬", email_sequence: "📧" };
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{typeIcons[item.type] || "📄"}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: WHITE }}>{item.title || "Sans titre"}</p>
          <p style={{ margin: 0, fontSize: 10, color: GRAY }}>{item.platform || item.type}</p>
        </div>
        <div style={{ padding: "2px 8px", borderRadius: 12, background: s.bg }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: s.color }}>{s.label}</span>
        </div>
      </div>
      {item.caption && (
        <div style={{ background: CARD2, borderRadius: 10, padding: 10, minHeight: 40 }}>
          <p style={{ margin: 0, fontSize: 11, color: DIMWHITE, lineHeight: 1.5, fontStyle: "italic" }}>
            &quot;{item.caption.substring(0, 120)}{item.caption.length > 120 ? "..." : ""}&quot;
          </p>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {item.score ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: BORDER, overflow: "hidden" }}>
              <div style={{ width: `${item.score}%`, height: "100%", borderRadius: 2, background: item.score > 80 ? GREEN : item.score > 60 ? ORANGE : RED }} />
            </div>
            <span style={{ fontSize: 10, color: GRAY }}>{item.score}/100</span>
          </div>
        ) : <div />}
        <div style={{ display: "flex", gap: 4 }}>
          {item.status === "draft" && <button onClick={() => onAction(item, "enhance")} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${PURPLE}44`, background: `${PURPLE}22`, color: PURPLE, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>IA Améliore</button>}
          {item.status === "ai_review" && <button onClick={() => onAction(item, "approve")} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${GREEN}44`, background: `${GREEN}22`, color: GREEN, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Valider</button>}
          {item.status === "ready" && <button onClick={() => onAction(item, "publish")} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${GOLD}44`, background: `${GOLD}22`, color: GOLD, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Publier</button>}
        </div>
      </div>
    </div>
  );
}

function LiveEntry({ entry }: { entry: LiveLog }) {
  const agent = AGENTS.find(a => a.id === entry.agent);
  const typeColor = entry.type === "success" ? GREEN : entry.type === "warning" ? ORANGE : RED;
  return (
    <div style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: `1px solid ${BORDER}08` }}>
      <span style={{ fontSize: 10, color: GRAY, minWidth: 34, paddingTop: 2 }}>{entry.time}</span>
      <span style={{ fontSize: 13 }}>{agent?.icon || "🔹"}</span>
      <p style={{ margin: 0, fontSize: 11, color: DIMWHITE, lineHeight: 1.4, flex: 1 }}>{entry.msg}</p>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: typeColor, marginTop: 5, flexShrink: 0 }} />
    </div>
  );
}

// ── Main Page ──

export default function CockpitV3() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Salut Charles ! Dis-moi ce que tu veux — je lance les agents. Tu peux aussi cliquer sur un agent à gauche pour voir ses stats." }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);
  const [pulsingAgent, setPulsingAgent] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<"chat" | "content">("chat");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [contentFilter, setContentFilter] = useState("all");
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>([]);
  const [agentData, setAgentData] = useState(AGENTS);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch live data on mount
  useEffect(() => {
    // Build a 30-day date range for APIs that require from/to
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 30);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const range = `?from=${fromStr}&to=${toStr}`;

    // Fetch content
    fetch("/api/content/library").then(r => r.json()).then(data => {
      if (data.items) setContentItems(data.items);
    }).catch(() => {});

    // Fetch agent logs for live feed
    fetch("/api/agents/logs").then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const logs: LiveLog[] = data.slice(0, 12).map((log: { timestamp?: string; created_at?: string; agent_name: string; action: string; status: string }) => {
          const raw = log.timestamp || log.created_at;
          const d = raw ? new Date(raw) : null;
          const time = d && !isNaN(d.getTime())
            ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            : "--:--";
          return {
            time,
            agent: log.agent_name,
            msg: log.action,
            type: log.status === "success" ? "success" : log.status === "error" ? "error" : "warning",
          };
        });
        setLiveLogs(logs);
      }
    }).catch(() => {});

    // Fetch KPIs for agents — ALL routes require from/to params
    Promise.all([
      fetch(`/api/meta-ads${range}`).then(r => r.json()).catch(() => null),
      fetch(`/api/shopify${range}`).then(r => r.json()).catch(() => null),
      fetch(`/api/ga4${range}`).then(r => r.json()).catch(() => null),
    ]).then(([meta, shopify, ga4]) => {
      setAgentData(prev => prev.map(a => {
        if (a.id === "meta-ads" && meta && !meta.error) {
          return { ...a, kpis: [
            { l: "ROAS", v: `${(meta.blendedRoas || 0).toFixed(1)}x`, c: GREEN },
            { l: "CPO", v: `${(meta.averageCpo || 0).toFixed(0)}€`, c: WHITE },
            { l: "Dépense", v: `${(meta.totalSpend || 0).toFixed(0)}€`, c: ORANGE },
          ], lastAction: `ROAS ${(meta.blendedRoas || 0).toFixed(1)}x — ${meta.creatives?.length || 0} créatives actives`, lastTime: "live" };
        }
        if (a.id === "shopify" && shopify && !shopify.error) {
          return { ...a, kpis: [
            { l: "Commandes", v: `${shopify.totalOrders || 0}`, c: GOLD },
            { l: "AOV", v: `${(shopify.aov || 0).toFixed(0)}€`, c: WHITE },
            { l: "CA", v: `${(shopify.totalRevenue || 0).toFixed(0)}€`, c: GREEN },
          ], lastAction: `${shopify.totalOrders || 0} commandes — AOV ${(shopify.aov || 0).toFixed(0)}€`, lastTime: "live" };
        }
        if (a.id === "ga4" && ga4 && !ga4.error) {
          const newUsers = ga4.newVsReturning?.new || 0;
          const returningUsers = ga4.newVsReturning?.returning || 0;
          const totalUsers = newUsers + returningUsers;
          return { ...a, kpis: [
            { l: "Sessions", v: `${ga4.totalSessions || 0}`, c: WHITE },
            { l: "Utilisateurs", v: `${totalUsers}`, c: GREEN },
            { l: "New", v: `${newUsers}`, c: ORANGE },
          ], lastAction: `${ga4.totalSessions || 0} sessions — ${totalUsers} utilisateurs`, lastTime: "live" };
        }
        return a;
      }));
    });
  }, []);

  // Simulate pulse
  useEffect(() => {
    const interval = setInterval(() => {
      const r = AGENTS[Math.floor(Math.random() * AGENTS.length)];
      setPulsingAgent(r.id);
      setTimeout(() => setPulsingAgent(null), 2000);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real chat with API
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setInput("");
    setSending(true);

    // Detect which agent might pulse
    if (/pub|créa|ad/i.test(msg)) setPulsingAgent("crea");
    else if (/post|social|instagram/i.test(msg)) setPulsingAgent("content");
    else if (/rapport|comment.*va|business/i.test(msg)) setPulsingAgent("growth");
    else if (/email|abandon|panier/i.test(msg)) setPulsingAgent("email-crm");
    else if (/landing|page|site/i.test(msg)) setPulsingAgent("ga4");

    try {
      const history = messages.map(m => ({ role: m.role, content: m.text }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.response || "Erreur — réessaie." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Erreur de connexion. Réessaie dans quelques secondes." }]);
    }
    setSending(false);
    setPulsingAgent(null);
  }, [input, sending, messages]);

  // Content actions
  const handleContentAction = async (item: ContentItem, action: string) => {
    if (action === "enhance") {
      setContentItems(prev => prev.map(c => c.id === item.id ? { ...c, status: "ai_review" } : c));
      try {
        const res = await fetch("/api/content/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: item.caption, type: item.type, platform: item.platform }),
        });
        const data = await res.json();
        if (data.engagement_score) {
          setContentItems(prev => prev.map(c => c.id === item.id ? { ...c, status: "ai_review", score: data.engagement_score } : c));
        }
      } catch { /* silent */ }
    } else if (action === "approve") {
      setContentItems(prev => prev.map(c => c.id === item.id ? { ...c, status: "ready" } : c));
      await fetch("/api/content/library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: "ready" }),
      }).catch(() => {});
    } else if (action === "publish") {
      setContentItems(prev => prev.map(c => c.id === item.id ? { ...c, status: "published" } : c));
      await fetch("/api/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: item.id }),
      }).catch(() => {});
    }
  };

  const filteredContent = contentFilter === "all" ? contentItems : contentItems.filter(c => c.type === contentFilter);

  return (
    <div style={{ width: "100%", height: "100vh", background: BG, display: "flex", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: WHITE, overflow: "hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        input::placeholder { color: ${GRAY}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 4px; }
      `}</style>

      {/* ═══ LEFT — Command Center ═══ */}
      <div style={{ width: 480, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${PURPLE}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: WHITE }}>U</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>UBURN COCKPIT</p>
            <p style={{ margin: 0, fontSize: 10, color: GOLD }}>{agentData.filter(a => a.status === "active").length} agents actifs</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>LIVE</span>
          </div>
        </div>

        {/* Orbit */}
        <div style={{ position: "relative", width: 400, height: 380, margin: "0 auto", flexShrink: 0 }}>
          <svg width={400} height={380} style={{ position: "absolute", top: 0, left: 0 }}>
            <circle cx={200} cy={190} r={155} fill="none" stroke={BORDER} strokeWidth={1} strokeDasharray="3,5" opacity={0.25} />
            {agentData.map(a => {
              const rad = (a.angle - 90) * (Math.PI / 180);
              return <line key={a.id} x1={200} y1={190} x2={200 + Math.cos(rad) * 125} y2={190 + Math.sin(rad) * 125} stroke={selectedAgent?.id === a.id ? a.color : BORDER} strokeWidth={selectedAgent?.id === a.id ? 2 : 1} strokeDasharray={selectedAgent?.id === a.id ? "none" : "4,4"} opacity={selectedAgent?.id === a.id ? 0.5 : 0.15} />;
            })}
          </svg>
          {/* Brain */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 80, height: 80, borderRadius: 22, background: `linear-gradient(135deg, ${PURPLE}33, ${GOLD}33)`, border: `2px solid ${GOLD}55`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px ${GOLD}15`, zIndex: 20 }}>
            <span style={{ fontSize: 28 }}>🧠</span>
            <span style={{ fontSize: 8, color: GOLD, fontWeight: 700, marginTop: 1 }}>MANAGER</span>
          </div>
          {/* Agent nodes */}
          {agentData.map(a => {
            const rad = (a.angle - 90) * (Math.PI / 180);
            const nx = 200 + Math.cos(rad) * 155 - 26;
            const ny = 190 + Math.sin(rad) * 155 - 26;
            const isSel = selectedAgent?.id === a.id;
            const sc = a.status === "warning" ? ORANGE : a.status === "pending" ? AMBER : GREEN;
            return (
              <div key={a.id} onClick={() => setSelectedAgent(isSel ? null : a)} style={{ position: "absolute", left: nx, top: ny, width: 52, height: 52, borderRadius: 14, background: isSel ? `${a.color}15` : CARD, border: `2px solid ${isSel ? a.color : BORDER}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.3s", boxShadow: isSel ? `0 0 20px ${a.color}33` : "none", animation: pulsingAgent === a.id ? "pulse 1.5s ease infinite" : "none", zIndex: 10 }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <span style={{ fontSize: 7, color: isSel ? a.color : DIMWHITE, fontWeight: 700, marginTop: 1 }}>{a.label}</span>
                <div style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%", background: sc, border: `2px solid ${BG}` }} />
              </div>
            );
          })}
        </div>

        {/* Detail or Live Feed */}
        <div style={{ flex: 1, overflow: "auto", padding: "0 16px 12px" }}>
          {selectedAgent ? (
            <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
          ) : (
            <div>
              <p style={{ fontSize: 10, color: GRAY, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Live Feed — activité des agents</p>
              {liveLogs.length > 0 ? liveLogs.map((e, i) => <LiveEntry key={i} entry={e} />) : (
                <p style={{ fontSize: 12, color: GRAY, textAlign: "center", marginTop: 20 }}>Aucune activité récente. Parle-moi dans le chat pour lancer les agents !</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT — Chat + Content ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
          <button onClick={() => setRightPanel("chat")} style={{ flex: 1, padding: "14px 0", background: "transparent", border: "none", borderBottom: rightPanel === "chat" ? `2px solid ${GOLD}` : "2px solid transparent", color: rightPanel === "chat" ? GOLD : GRAY, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>💬 Chat</button>
          <button onClick={() => setRightPanel("content")} style={{ flex: 1, padding: "14px 0", background: "transparent", border: "none", borderBottom: rightPanel === "content" ? `2px solid ${GOLD}` : "2px solid transparent", color: rightPanel === "content" ? GOLD : GRAY, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            🖼️ Contenu
            {contentItems.filter(c => c.status === "ai_review" || c.status === "ready").length > 0 && (
              <span style={{ background: ORANGE, borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800, color: WHITE }}>{contentItems.filter(c => c.status === "ai_review" || c.status === "ready").length}</span>
            )}
          </button>
        </div>

        {/* Chat */}
        {rightPanel === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: 14, background: msg.role === "user" ? PURPLE : CARD, border: msg.role === "user" ? "none" : `1px solid ${BORDER}`, borderBottomRightRadius: msg.role === "user" ? 4 : 14, borderBottomLeftRadius: msg.role === "user" ? 14 : 4 }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: WHITE, whiteSpace: "pre-wrap" }}>{msg.text}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "10px 14px", borderRadius: 14, background: CARD, border: `1px solid ${BORDER}` }}>
                    <p style={{ margin: 0, fontSize: 13, color: GOLD }}>⏳ Les agents travaillent...</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: "0 20px 6px", display: "flex", gap: 5, flexWrap: "wrap" }}>
              {["Comment va mon business ?", "Génère 3 pubs", "Plan social semaine", "Audit ma landing page", "A/B test"].map(q => (
                <button key={q} onClick={() => setInput(q)} style={{ background: `${GOLD}0D`, border: `1px solid ${GOLD}28`, borderRadius: 18, padding: "5px 12px", color: GOLD, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{q}</button>
              ))}
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Dis-moi ce que tu veux..." style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "11px 14px", color: WHITE, fontSize: 13, outline: "none" }} />
              <button onClick={handleSend} disabled={sending} style={{ width: 42, height: 42, borderRadius: 12, border: "none", background: sending ? GRAY : `linear-gradient(135deg, ${PURPLE}, ${GOLD})`, cursor: sending ? "default" : "pointer", fontSize: 16, color: WHITE, display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
            </div>
          </div>
        )}

        {/* Content */}
        {rightPanel === "content" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 20px", display: "flex", gap: 6, borderBottom: `1px solid ${BORDER}` }}>
              {[
                { key: "all", label: "Tout", count: contentItems.length },
                { key: "ad", label: "📢 Ads", count: contentItems.filter(c => c.type === "ad").length },
                { key: "instagram_post", label: "📸 Insta", count: contentItems.filter(c => c.type === "instagram_post").length },
                { key: "instagram_reel", label: "🎬 Reels", count: contentItems.filter(c => c.type === "instagram_reel").length },
                { key: "email_sequence", label: "📧 Email", count: contentItems.filter(c => c.type === "email_sequence").length },
              ].map(f => (
                <button key={f.key} onClick={() => setContentFilter(f.key)} style={{ padding: "5px 12px", borderRadius: 10, cursor: "pointer", background: contentFilter === f.key ? `${GOLD}15` : "transparent", border: `1px solid ${contentFilter === f.key ? GOLD + "44" : BORDER}`, color: contentFilter === f.key ? GOLD : GRAY, fontSize: 11, fontWeight: 600 }}>{f.label} ({f.count})</button>
              ))}
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
              {filteredContent.length > 0 ? filteredContent.map(item => (
                <ContentCard key={item.id} item={item} onAction={handleContentAction} />
              )) : (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
                  <p style={{ fontSize: 32, margin: "0 0 8px" }}>🖼️</p>
                  <p style={{ fontSize: 14, color: GRAY }}>Aucun contenu. Demande-moi d&apos;en générer dans le Chat !</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
