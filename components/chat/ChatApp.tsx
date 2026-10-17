"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatSummary } from "@/lib/types";
import { subscribeToRealtimeUpdates } from "@/lib/realtime";
import { ChatSidebar, type WindowFilter } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { useIsMobile } from "./useIsMobile";

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
  const isMobile = useIsMobile();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("all");
  const [collapsed, setCollapsed] = useState(false);
  // Solo aplica en mobile: qué panel se ve en la navegación de una sola
  // columna (ver layout más abajo). En desktop se ignora.
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");
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

  // No es un "visto" de WhatsApp (eso es entre el bot y el contacto): es
  // "un operador humano abrió este chat", para el badge de no leídos.
  const markChatRead = useCallback((sessionId: string) => {
    fetch(`/api/chats/${encodeURIComponent(sessionId)}/read`, {
      method: "POST",
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadChats().finally(() => setChatsLoading(false));
    const interval = setInterval(loadChats, CHATS_POLL_MS);
    return () => clearInterval(interval);
  }, [loadChats]);

  // Empuje en tiempo real cuando hay Supabase Realtime configurado (ver
  // lib/realtime.ts); si no, no hace nada y el polling de arriba sigue solo.
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeUpdates(() => {
      loadChats();
      if (selectedRef.current) loadMessages(selectedRef.current);
    });
    return unsubscribe;
  }, [loadChats, loadMessages]);

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    loadMessages(selectedSessionId).finally(() => setLoadingMessages(false));
    markChatRead(selectedSessionId);

    const interval = setInterval(() => {
      loadMessages(selectedSessionId);
      markChatRead(selectedSessionId);
    }, MESSAGES_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedSessionId, loadMessages, markChatRead]);

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

  const handleSendAudio = useCallback(
    async (file: File) => {
      if (!selectedSessionId) return;

      const form = new FormData();
      form.append("sessionId", selectedSessionId);
      form.append("file", file);

      const res = await fetch("/api/audio", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo enviar la nota de voz");
      }

      await Promise.all([
        loadMessages(selectedSessionId),
        loadChats(),
      ]);
    },
    [selectedSessionId, loadMessages, loadChats]
  );

  const selectedChat = chats.find((chat) => chat.sessionId === selectedSessionId);

  function handleSelectChat(sessionId: string) {
    setSelectedSessionId(sessionId);
    setMobilePane("chat");
  }

  const sidebar = (
    <ChatSidebar
      variant={isMobile ? "mobile" : "desktop"}
      chats={chats}
      loading={chatsLoading}
      selectedSessionId={selectedSessionId}
      onSelect={handleSelectChat}
      search={search}
      onSearchChange={setSearch}
      windowFilter={windowFilter}
      onWindowFilterChange={setWindowFilter}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((value) => !value)}
    />
  );

  const chatWindow = (
    <ChatWindow
      sessionId={selectedSessionId}
      contactName={selectedChat?.contactName ?? null}
      messages={messages}
      loading={loadingMessages}
      windowOpen={selectedChat?.windowOpen ?? false}
      windowExpiresAt={selectedChat?.windowExpiresAt ?? null}
      onSend={handleSend}
      onSendFile={handleSendFile}
      onSendAudio={handleSendAudio}
      onBack={isMobile ? () => setMobilePane("list") : undefined}
    />
  );

  if (isMobile) {
    // Navegación de una sola columna: lista y conversación viven una al lado
    // de la otra en una pista de 200% de ancho, y se desliza entre ambas
    // (como la navegación nativa de iOS/Android) en vez de mostrar dos
    // columnas apretadas.
    return (
      <div className="h-full w-full overflow-clip" style={{ background: colors.bgChat }}>
        <div
          className="flex h-full w-[200%] transition-transform duration-300 ease-out"
          style={{ transform: mobilePane === "chat" ? "translateX(-50%)" : "translateX(0%)" }}
        >
          <div className="h-full w-1/2 shrink-0" aria-hidden={mobilePane !== "list"} inert={mobilePane !== "list"}>
            {sidebar}
          </div>
          <div className="h-full w-1/2 shrink-0" aria-hidden={mobilePane !== "chat"} inert={mobilePane !== "chat"}>
            {chatWindow}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full" style={{ background: colors.bgChat }}>
      {sidebar}
      {chatWindow}
    </div>
  );
}
