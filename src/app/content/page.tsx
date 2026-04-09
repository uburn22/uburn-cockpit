"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layout/shell";
import type { Period } from "@/components/layout/header";
import {
  Megaphone,
  Share2,
  Image,
  Mail,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Send,
  Wand2,
  Check,
  X,
  Video,
  Eye,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
interface ContentItem {
  id: string;
  type: string;
  status: string;
  title: string;
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  image_url: string | null;
  video_url: string | null;
  platform: string;
  format: string;
  ai_suggestions: Record<string, unknown> | null;
  source: string;
  agent_name: string | null;
  best_time: string | null;
  priority: string;
  meta_post_id: string | null;
  created_at: string;
  published_at: string | null;
}

interface AISuggestions {
  enhanced_caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  best_time: string;
  tips: string[];
  engagement_score: number;
  improvements: string[];
}

const SECTIONS = [
  { id: "all", label: "Tout", icon: Sparkles },
  { id: "ad", label: "Ads", icon: Megaphone },
  { id: "instagram_post", label: "Instagram", icon: Share2 },
  { id: "instagram_reel", label: "Reels / Vidéos", icon: Video },
  { id: "email_sequence", label: "Emails", icon: Mail },
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Brouillon", color: "text-zinc-400", bg: "bg-zinc-500/10" },
  ai_review: { label: "IA en cours...", color: "text-blue-400", bg: "bg-blue-500/10" },
  ready: { label: "Prêt", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  scheduled: { label: "Programmé", color: "text-amber-400", bg: "bg-amber-500/10" },
  published: { label: "Publié", color: "text-green-400", bg: "bg-green-500/10" },
  rejected: { label: "Rejeté", color: "text-red-400", bg: "bg-red-500/10" },
};

// ── Main page ──────────────────────────────────────────────
export default function ContentPage() {
  return (
    <Shell title="Content Gallery">
      {(period: Period) => <ContentPageContent period={period} />}
    </Shell>
  );
}

function ContentPageContent({ period }: { period: Period }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = activeSection === "all" ? "" : `&type=${activeSection}`;
      const res = await fetch(`/api/content/library?limit=50${typeParam}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [activeSection]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent, period]);

  // ── Enhance content with AI ──
  const enhanceContent = async (item: ContentItem) => {
    setEnhancing(item.id);
    try {
      // Update status to ai_review
      await fetch("/api/content/library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: "ai_review" }),
      });

      // Call enhance API
      const res = await fetch("/api/content/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: item.caption,
          type: item.type,
          platform: item.platform,
          format: item.format,
        }),
      });

      if (res.ok) {
        const { suggestions } = await res.json();
        // Save suggestions and update to ready
        await fetch("/api/content/library", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            ai_suggestions: suggestions,
            caption: suggestions.enhanced_caption || item.caption,
            hook: suggestions.hook || item.hook,
            cta: suggestions.cta || item.cta,
            hashtags: suggestions.hashtags || item.hashtags,
            best_time: suggestions.best_time || item.best_time,
            status: "ready",
          }),
        });
      }
    } catch {
      // revert status
      await fetch("/api/content/library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: "draft" }),
      });
    }
    setEnhancing(null);
    fetchContent();
  };

  // ── Publish content ──
  const publishContent = async (item: ContentItem) => {
    setPublishing(item.id);
    try {
      const res = await fetch("/api/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_id: item.id,
          caption: `${item.hook ? item.hook + "\n\n" : ""}${item.caption}${item.hashtags?.length ? "\n\n" + item.hashtags.map(h => `#${h}`).join(" ") : ""}`,
          image_url: item.image_url,
          video_url: item.video_url,
          type: item.type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.manual_publish) {
          alert("Instagram non connecté — contenu marqué comme prêt. Publie manuellement.");
        }
      }
    } catch {
      // silent
    }
    setPublishing(null);
    fetchContent();
  };

  // ── Update status ──
  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/content/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchContent();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type: string) => {
    if (type === "ad") return Megaphone;
    if (type === "instagram_reel") return Video;
    if (type === "email_sequence") return Mail;
    return Share2;
  };

  // ── Count by type ──
  const counts = {
    all: items.length,
    ad: items.filter(i => i.type === "ad").length,
    instagram_post: items.filter(i => i.type === "instagram_post").length,
    instagram_reel: items.filter(i => i.type === "instagram_reel").length,
    email_sequence: items.filter(i => i.type === "email_sequence").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {items.length} contenus — {items.filter(i => i.status === "published").length} publiés,{" "}
          {items.filter(i => i.status === "ready").length} prêts
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
          <button
            onClick={fetchContent}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateContentForm
          onCreated={() => {
            setShowCreate(false);
            fetchContent();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Section tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === section.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
            <span className="text-xs text-muted-foreground">
              {counts[section.id as keyof typeof counts] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-foreground">Aucun contenu</p>
          <p className="text-sm text-muted-foreground mt-1">
            Clique sur &quot;Ajouter&quot; ou demande à l&apos;Agent Manager via le Chat
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            const Icon = getTypeIcon(item.type);
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
            const suggestions = item.ai_suggestions as AISuggestions | null;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/30 flex flex-col"
              >
                {/* Image preview */}
                {item.image_url && (
                  <div className="relative h-48 bg-muted overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    {item.video_url && (
                      <div className="absolute bottom-2 left-2">
                        <Video className="h-5 w-5 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                )}

                {/* Card body */}
                <div className="flex-1 p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {item.platform} · {item.format}
                      </span>
                    </div>
                    {!item.image_url && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  {item.title && (
                    <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                  )}

                  {/* Hook */}
                  {item.hook && (
                    <p className="text-xs text-primary font-medium mb-1">🎣 {item.hook}</p>
                  )}

                  {/* Caption preview */}
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                    {item.caption || "Pas de caption"}
                  </p>

                  {/* Hashtags */}
                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.hashtags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="text-[10px] text-primary/70 bg-primary/5 rounded-full px-2 py-0.5">
                          #{tag}
                        </span>
                      ))}
                      {item.hashtags.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{item.hashtags.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-auto pt-2 border-t border-border/30">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(item.created_at)}
                    </span>
                    {item.source === "agent" && item.agent_name && (
                      <span>🤖 {item.agent_name}</span>
                    )}
                    {item.source === "manual" && <span>✍️ Manuel</span>}
                    {item.best_time && <span>🕐 {item.best_time}</span>}
                  </div>
                </div>

                {/* AI Suggestions badge */}
                {suggestions && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex items-center justify-between px-4 py-2 bg-primary/5 border-t border-border/30 text-xs"
                  >
                    <span className="flex items-center gap-1 text-primary">
                      <Wand2 className="h-3 w-3" />
                      Suggestions IA
                      {suggestions.engagement_score && (
                        <span className="ml-1 font-bold">{suggestions.engagement_score}/10</span>
                      )}
                    </span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}

                {/* Expanded AI suggestions */}
                {isExpanded && suggestions && (
                  <div className="px-4 py-3 bg-muted/20 border-t border-border/30 space-y-2">
                    {suggestions.tips && suggestions.tips.map((tip, i) => (
                      <p key={i} className="text-xs text-muted-foreground">💡 {tip}</p>
                    ))}
                    {suggestions.improvements && suggestions.improvements.map((imp, i) => (
                      <p key={i} className="text-xs text-emerald-400">✅ {imp}</p>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex border-t border-border/30">
                  {/* AI Enhance */}
                  {(item.status === "draft" || item.status === "rejected") && (
                    <button
                      onClick={() => enhanceContent(item)}
                      disabled={enhancing === item.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors border-r border-border/30"
                    >
                      {enhancing === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      {enhancing === item.id ? "Analyse IA..." : "IA Améliore"}
                    </button>
                  )}

                  {/* Preview */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-r border-border/30"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Détails
                  </button>

                  {/* Publish */}
                  {(item.status === "ready" || item.status === "draft") && (
                    <button
                      onClick={() => publishContent(item)}
                      disabled={publishing === item.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/5 transition-colors border-r border-border/30"
                    >
                      {publishing === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Publier
                    </button>
                  )}

                  {/* Published status */}
                  {item.status === "published" && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-green-400">
                      <Check className="h-3.5 w-3.5" />
                      Publié
                    </div>
                  )}

                  {/* Reject */}
                  {item.status === "ready" && (
                    <button
                      onClick={() => updateStatus(item.id, "rejected")}
                      className="flex items-center justify-center px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/5 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Create Content Form ────────────────────────────────────
function CreateContentForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState("instagram_post");
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/content/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          caption,
          image_url: imageUrl || null,
          video_url: videoUrl || null,
          platform: type.startsWith("instagram") ? "instagram" : type === "ad" ? "meta_ads" : "email",
          format: type === "instagram_reel" ? "reel" : type === "ad" ? "landscape" : "feed",
          source: "manual",
          status: "draft",
        }),
      });
      if (res.ok) {
        onCreated();
      }
    } catch {
      // silent
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          Nouveau contenu
        </h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        {[
          { id: "instagram_post", label: "Post Instagram", icon: Image },
          { id: "instagram_reel", label: "Reel / Vidéo", icon: Video },
          { id: "ad", label: "Pub", icon: Megaphone },
          { id: "email_sequence", label: "Email", icon: Mail },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              type === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      <input
        type="text"
        placeholder="Titre (optionnel)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
      <textarea
        placeholder="Caption / Texte du post..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
      />
      <input
        type="url"
        placeholder="URL de l'image (optionnel)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
      {(type === "instagram_reel") && (
        <input
          type="url"
          placeholder="URL de la vidéo (Reel)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      )}

      {/* Submit */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || (!caption && !imageUrl)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Créer
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        💡 Après création, clique &quot;IA Améliore&quot; pour que l&apos;IA optimise ta caption, hashtags et horaire. Puis clique &quot;Publier&quot;.
      </p>
    </div>
  );
}
