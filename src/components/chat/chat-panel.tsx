"use client";

import { useState, useRef, useEffect } from "react";
import { useChat, type ChatMessage } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  Trash2,
  Bot,
  User,
} from "lucide-react";

// Simple markdown-like bold rendering
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
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary" : "bg-violet-100"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-white" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-primary" />
        )}
      </div>

      {/* Message */}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? "bg-primary text-white"
            : "bg-gray-100 text-foreground"
        }`}
      >
        {isUser ? msg.content : renderContent(msg.content)}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "Comment vont mes ads ?",
  "Combien de commandes aujourd'hui ?",
  "Y a-t-il des colis bloqués ?",
  "Statut des agents",
];

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, send, clear } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput("");
    send(trimmed);
  };

  const handleSuggestion = (text: string) => {
    send(text);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Ouvrir le chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Assistant Uburn</p>
            <p className="text-[11px] text-muted-foreground">Données en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clear}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 hover:text-foreground"
            title="Effacer le chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 hover:text-foreground"
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="rounded-2xl bg-gray-100 px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}

        {/* Suggestions (only show after welcome message) */}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-white p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Pose ta question..."
            className="flex-1 rounded-xl border border-border bg-gray-50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-10 w-10 rounded-xl p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
