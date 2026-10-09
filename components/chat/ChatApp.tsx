"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatSummary } from "@/lib/types";
import { ChatSidebar, type WindowFilter } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { ThemeProvider, useTheme } from "./ThemeContext";

const CHATS_POLL_MS = 5000;
const MESSAGES_POLL_MS = 3000;

export function ChatApp() {
  return (
    <ThemeProvider>
      <ChatAppInner />
    </ThemeProvider>
  );
}

function ChatAppInner() {
  const { colors } = useTheme();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("all");
  const [collapsed, setCollapsed] = useState(false);
  const selectedRef = useRef<string | null>(null);

  selectedRef.current = selectedSessionId;

  const loadChats = useCallback(async () => {
    const res = await fetch("/api/chats", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setChats(data.chats as ChatSummary[]);
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    const res = await fetch(
      `/api/messages?sessionId=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (selectedRef.current === sessionId) {
      setMessages(data.messages as ChatMessage[]);
    }
  }, []);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, CHATS_POLL_MS);
    return () => clearInterval(interval);
  }, [loadChats]);

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    loadMessages(selectedSessionId).finally(() => setLoadingMessages(false));

    const interval = setInterval(
      () => loadMessages(selectedSessionId),
      MESSAGES_POLL_MS
    );
    return () => clearInterval(interval);
  }, [selectedSessionId, loadMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!selectedSessionId) return;

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId, text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo enviar el mensaje");
      }

      await Promise.all([
        loadMessages(selectedSessionId),
        loadChats(),
      ]);
    },
    [selectedSessionId, loadMessages, loadChats]
  );

  const handleSendFile = useCallback(
    async (file: File, caption?: string) => {
      if (!selectedSessionId) return;

      const form = new FormData();
      form.append("sessionId", selectedSessionId);
      form.append("file", file);
      if (caption) form.append("caption", caption);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo enviar el archivo");
      }

      await Promise.all([
        loadMessages(selectedSessionId),
        loadChats(),
      ]);
    },
    [selectedSessionId, loadMessages, loadChats]
  );

  const selectedChat = chats.find((chat) => chat.sessionId === selectedSessionId);

  return (
    <div className="flex h-full w-full" style={{ background: colors.bgChat }}>
      <ChatSidebar
        chats={chats}
        selectedSessionId={selectedSessionId}
        onSelect={setSelectedSessionId}
        search={search}
        onSearchChange={setSearch}
        windowFilter={windowFilter}
        onWindowFilterChange={setWindowFilter}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
      <ChatWindow
        sessionId={selectedSessionId}
        messages={messages}
        loading={loadingMessages}
        windowOpen={selectedChat?.windowOpen ?? false}
        windowExpiresAt={selectedChat?.windowExpiresAt ?? null}
        onSend={handleSend}
        onSendFile={handleSendFile}
      />
    </div>
  );
}
