"use client";

import { useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Salut Charles ! 👋 Je suis ton assistant IA Uburn. Je vois tes données Shopify, Meta Ads et Sendcloud en temps réel.\n\nPose-moi n'importe quelle question — stratégie, performance, rapports, recommandations... je suis là pour t'aider à atteindre les 100 cmd/jour.",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        // Build history from existing messages (exclude welcome)
        const history = messages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history }),
        });

        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.response || "Pas de réponse.",
          timestamp: new Date(),
          intent: data.intent,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: "❌ Erreur de connexion. Vérifie que le serveur tourne.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  const clear = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Salut Charles ! 👋 Je suis ton assistant IA Uburn. Je vois tes données Shopify, Meta Ads et Sendcloud en temps réel.\n\nPose-moi n'importe quelle question — stratégie, performance, rapports, recommandations... je suis là pour t'aider à atteindre les 100 cmd/jour.",
        timestamp: new Date(),
      },
    ]);
  }, []);

  return { messages, loading, send, clear };
}
