"use client";

import { useState, useRef, useEffect } from "react";
import { Shell } from "@/components/layout/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { Send, Loader2, Trash2, Bot, User } from "lucide-react";

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary" : "bg-violet-100"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-line ${
          isUser ? "bg-primary text-white" : "bg-gray-100 text-foreground"
        }`}
      >
        {isUser ? msg.content : renderContent(msg.content)}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Comment vont mes ads ?",
  "Quel est mon ROAS ?",
  "Combien de commandes aujourd'hui ?",
  "Quels produits se vendent le mieux ?",
  "Y a-t-il des colis bloqués ?",
  "Statut des agents",
  "Derniers logs agents",
  "Aide",
];

function ChatPageContent() {
  const [input, setInput] = useState("");
  const { messages, loading, send, clear } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput("");
    send(trimmed);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {/* Main Chat */}
      <Card className="flex flex-1 flex-col overflow-hidden border-border bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Assistant Uburn</p>
              <p className="text-xs text-muted-foreground">
                Données en temps réel — Shopify · Meta Ads · Sendcloud
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={clear} className="gap-1.5 text-xs">
            <Trash2 className="h-3.5 w-3.5" />
            Effacer
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl bg-gray-100 px-5 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Analyse en cours...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-white p-4">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Pose ta question... (ex: « Comment vont mes ads ? »)"
              className="flex-1 rounded-xl border border-border bg-gray-50 px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="h-11 w-11 rounded-xl p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Sidebar - Quick Actions */}
      <div className="w-[240px] shrink-0 space-y-3">
        <Card className="border-border bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Questions rapides
          </p>
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(""); send(s); }}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary hover:bg-violet-50 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Shell title="Chat IA">
      {() => <ChatPageContent />}
    </Shell>
  );
}
