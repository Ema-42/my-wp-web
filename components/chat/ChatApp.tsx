"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AttentionState, ChatMessage, ChatSummary, SavedSticker } from "@/lib/types";
import { subscribeToRealtimeUpdates } from "@/lib/realtime";
import { ChatSidebar, type AttentionFilter, type WindowFilter } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { useIsMobile } from "./useIsMobile";

const CHATS_POLL_MS = 5000;
const MESSAGES_POLL_MS = 3000;
const INITIAL_MESSAGES_LIMIT = 10;
const LOAD_MORE_LIMIT = 10;

type ChatAppProps = {
  businessNumber?: string | null;
};

export function ChatApp({ businessNumber = null }: ChatAppProps) {
  return (
    <ThemeProvider>
      <ChatAppInner businessNumber={businessNumber} />
    </ThemeProvider>
  );
}

function ChatAppInner({ businessNumber }: { businessNumber: string | null }) {
  const { colors } = useTheme();
  const isMobile = useIsMobile();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("all");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("all");
  const [savedStickers, setSavedStickers] = useState<SavedSticker[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  // Solo aplica en mobile: qué panel se ve en la navegación de una sola
  // columna (ver layout más abajo). En desktop se ignora.
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");
  const selectedRef = useRef<string | null>(null);
  // Espejo de `messages` legible sin stale closures desde callbacks que no
  // quiero que dependan de (y por ende recreen el interval de polling).
  const messagesRef = useRef<ChatMessage[]>([]);

  selectedRef.current = selectedSessionId;
  messagesRef.current = messages;

  const loadChats = useCallback(async () => {
    const res = await fetch("/api/chats", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setChats(data.chats as ChatSummary[]);
  }, []);

  const loadSavedStickers = useCallback(async () => {
    const res = await fetch("/api/stickers", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setSavedStickers(data.stickers as SavedSticker[]);
  }, []);

  // Carga inicial al abrir un chat: solo los últimos N mensajes, no la
  // conversación entera — con chats largos, traer todo en cada apertura (y
  // de nuevo en cada poll) se sentía cada vez más lento.
  const loadInitialMessages = useCallback(async (sessionId: string) => {
    const res = await fetch(
      `/api/messages?sessionId=${encodeURIComponent(sessionId)}&limit=${INITIAL_MESSAGES_LIMIT}`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (selectedRef.current === sessionId) {
      setMessages(data.messages as ChatMessage[]);
      setHasMoreMessages(Boolean(data.hasMore));
    }
  }, []);

  // Botón "cargar mensajes anteriores": trae otra tanda más vieja que la
  // que ya tenemos y la antepone, sin tocar lo que ya está cargado.
  const loadOlderMessages = useCallback(async (sessionId: string) => {
    const oldest = messagesRef.current[0];
    if (!oldest) return;
    setLoadingOlderMessages(true);
    try {
      const res = await fetch(
        `/api/messages?sessionId=${encodeURIComponent(sessionId)}&limit=${LOAD_MORE_LIMIT}&before=${oldest.id}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (selectedRef.current === sessionId) {
        setMessages((prev) => [...(data.messages as ChatMessage[]), ...prev]);
        setHasMoreMessages(Boolean(data.hasMore));
      }
    } finally {
      setLoadingOlderMessages(false);
    }
  }, []);

  // Polling y "recién enviado": solo pide lo que llegó después del último
  // mensaje que ya tenemos, y lo agrega al final — nunca vuelve a traer ni
  // reemplaza lo que el usuario ya cargó (incluyendo "cargar anteriores").
  const loadNewerMessages = useCallback(async (sessionId: string) => {
    const latest = messagesRef.current[messagesRef.current.length - 1];
    const url = latest
      ? `/api/messages?sessionId=${encodeURIComponent(sessionId)}&after=${latest.id}`
      : `/api/messages?sessionId=${encodeURIComponent(sessionId)}&limit=${INITIAL_MESSAGES_LIMIT}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const incoming = data.messages as ChatMessage[];
    if (incoming.length > 0 && selectedRef.current === sessionId) {
      setMessages((prev) => [...prev, ...incoming]);
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

  useEffect(() => {
    loadSavedStickers();
  }, [loadSavedStickers]);

  // Empuje en tiempo real cuando hay Supabase Realtime configurado (ver
  // lib/realtime.ts); si no, no hace nada y el polling de arriba sigue solo.
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeUpdates(() => {
      loadChats();
      if (selectedRef.current) loadNewerMessages(selectedRef.current);
    });
    return unsubscribe;
  }, [loadChats, loadNewerMessages]);

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      setHasMoreMessages(false);
      return;
    }

    // Limpiar ya mismo: si no, mientras llega la respuesta se ve la
    // conversación del chat anterior (con su propio scroll) debajo del
    // header del chat nuevo — se sentía como si abriera "en una parte
    // aleatoria" de los mensajes.
    setMessages([]);
    setLoadingMessages(true);
    setHasMoreMessages(false);
    loadInitialMessages(selectedSessionId).finally(() => setLoadingMessages(false));
    markChatRead(selectedSessionId);

    const interval = setInterval(() => {
      loadNewerMessages(selectedSessionId);
      markChatRead(selectedSessionId);
    }, MESSAGES_POLL_MS);
    return () => clearInterval(interval);
  }, [selectedSessionId, loadInitialMessages, loadNewerMessages, markChatRead]);

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
        loadNewerMessages(selectedSessionId),
        loadChats(),
      ]);
    },
    [selectedSessionId, loadNewerMessages, loadChats]
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
        loadNewerMessages(selectedSessionId),
        loadChats(),
      ]);
    },
    [selectedSessionId, loadNewerMessages, loadChats]
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
        loadNewerMessages(selectedSessionId),
        loadChats(),
      ]);
    },
    [selectedSessionId, loadNewerMessages, loadChats]
  );

  const handleSaveSticker = useCallback(
    async (whatsappMediaId: string) => {
      const res = await fetch("/api/stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappMediaId, sessionId: selectedSessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo guardar el sticker");
      }

      await loadSavedStickers();
    },
    [selectedSessionId, loadSavedStickers]
  );

  const handleSendSticker = useCallback(
    async (stickerId: number) => {
      if (!selectedSessionId) return;

      const res = await fetch("/api/stickers/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId, stickerId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo enviar el sticker");
      }

      await Promise.all([
        loadNewerMessages(selectedSessionId),
        loadChats(),
      ]);
    },
    [selectedSessionId, loadNewerMessages, loadChats]
  );

  const handleSetAttentionState = useCallback(
    async (sessionId: string, estado: AttentionState) => {
      // Optimista: refleja el cambio ya mismo, no esperamos al próximo poll.
      setChats((prev) =>
        prev.map((chat) =>
          chat.sessionId === sessionId ? { ...chat, attentionState: estado } : chat
        )
      );

      const res = await fetch(`/api/chats/${encodeURIComponent(sessionId)}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        await loadChats(); // revierte el optimista si falló
        throw new Error(data?.error ?? "No se pudo cambiar el estado del chat");
      }
    },
    [loadChats]
  );

  const selectedChat = chats.find((chat) => chat.sessionId === selectedSessionId);

  function handleSelectChat(sessionId: string) {
    setSelectedSessionId(sessionId);
    setMobilePane("chat");
  }

  const sidebar = (
    <ChatSidebar
      variant={isMobile ? "mobile" : "desktop"}
      businessNumber={businessNumber}
      chats={chats}
      loading={chatsLoading}
      selectedSessionId={selectedSessionId}
      onSelect={handleSelectChat}
      search={search}
      onSearchChange={setSearch}
      windowFilter={windowFilter}
      onWindowFilterChange={setWindowFilter}
      attentionFilter={attentionFilter}
      onAttentionFilterChange={setAttentionFilter}
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
      hasMoreMessages={hasMoreMessages}
      loadingOlderMessages={loadingOlderMessages}
      onLoadMoreMessages={() =>
        selectedSessionId ? loadOlderMessages(selectedSessionId) : Promise.resolve()
      }
      windowOpen={selectedChat?.windowOpen ?? false}
      windowExpiresAt={selectedChat?.windowExpiresAt ?? null}
      attentionState={selectedChat?.attentionState ?? "bot"}
      onSetAttentionState={handleSetAttentionState}
      onSend={handleSend}
      onSendFile={handleSendFile}
      onSendAudio={handleSendAudio}
      savedStickers={savedStickers}
      onSaveSticker={handleSaveSticker}
      onSendSticker={handleSendSticker}
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
