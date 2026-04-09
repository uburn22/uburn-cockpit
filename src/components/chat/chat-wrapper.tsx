"use client";

import dynamic from "next/dynamic";

const ChatPanel = dynamic(
  () => import("./chat-panel").then((mod) => ({ default: mod.ChatPanel })),
  { ssr: false }
);

export function ChatWrapper() {
  return <ChatPanel />;
}
