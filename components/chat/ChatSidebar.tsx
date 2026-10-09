"use client";

import Image from "next/image";
import { useState } from "react";
import type { ChatSummary } from "@/lib/types";
import { formatListTimestamp } from "./format";
import { UserAvatar } from "./UserAvatar";
import {
  WINDOW_CLOSED_ACCENT,
  WINDOW_CLOSED_BG,
  WINDOW_CLOSED_RING,
  WINDOW_OPEN_ACCENT,
  WINDOW_OPEN_BG,
  WINDOW_OPEN_RING,
} from "./window-colors";

export type WindowFilter = "all" | "open" | "closed";

type Props = {
  chats: ChatSummary[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  windowFilter: WindowFilter;
  onWindowFilterChange: (value: WindowFilter) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function ChatSidebar({
  chats,
  selectedSessionId,
  onSelect,
  search,
  onSearchChange,
  windowFilter,
  onWindowFilterChange,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const filtered = chats
    .filter((chat) =>
      search.trim() ? chat.sessionId.includes(search.trim()) : true
    )
    .filter((chat) => {
      if (windowFilter === "open") return chat.windowOpen;
      if (windowFilter === "closed") return !chat.windowOpen;
      return true;
    });

  const [hovered, setHovered] = useState<{ chat: ChatSummary; top: number } | null>(
    null
  );

  if (collapsed) {
    return (
      <aside className="flex h-full w-16 shrink-0 flex-col items-center border-r border-black/10 bg-white py-3">
        <button
          onClick={onToggleCollapsed}
          title="Expandir lista de chats"
          className="mb-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-[#00a884]"
        >
          <Image
            src="/icon_wp.png"
            alt="Asistente WhatsApp"
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
          />
        </button>

        <div className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto">
          {filtered.map((chat) => {
            const active = chat.sessionId === selectedSessionId;
            return (
              <button
                key={chat.sessionId}
                onClick={() => onSelect(chat.sessionId)}
                onMouseEnter={(event) =>
                  setHovered({
                    chat,
                    top:
                      event.currentTarget.getBoundingClientRect().top +
                      event.currentTarget.getBoundingClientRect().height / 2,
                  })
                }
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center justify-center rounded-full p-1 transition ${
                  active ? "bg-[#d9fdd3]" : ""
                }`}
              >
                <div
                  className="rounded-full border-2 p-[3px] transition-colors"
                  style={{
                    borderColor: chat.windowOpen
                      ? WINDOW_OPEN_RING
                      : WINDOW_CLOSED_RING,
                  }}
                >
                  <UserAvatar seed={chat.sessionId} size={36} />
                </div>
              </button>
            );
          })}
        </div>

        {hovered && (
          <div
            className="pointer-events-none fixed z-50 w-max max-w-[240px] -translate-y-1/2 rounded-lg bg-[#111b21] px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: 72, top: hovered.top }}
          >
            <p className="font-medium">+{hovered.chat.sessionId}</p>
            <p
              className={
                hovered.chat.windowOpen ? "text-[#8fe3ab]" : "text-[#ffb3b0]"
              }
            >
              {hovered.chat.windowOpen
                ? "Ventana de atención abierta"
                : "Ventana de atención vencida"}
            </p>
            <p className="text-[#aebac1]">
              Último mensaje: {formatListTimestamp(hovered.chat.lastAt)}
            </p>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full max-w-[420px] min-w-[320px] shrink-0 flex-col border-r border-black/10 bg-white">
      <div className="flex items-center justify-between bg-[#f0f2f5] px-4 py-3">
        <button
          onClick={onToggleCollapsed}
          title="Ocultar lista de chats"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
            <Image
              src="/icon_wp.png"
              alt="Asistente WhatsApp"
              width={40}
              height={40}
              className="h-10 w-10 object-cover"
            />
          </div>
          <span className="text-[15px] font-medium text-[#111b21]">
            Asistente WhatsApp
          </span>
        </button>

        <button
          onClick={onToggleCollapsed}
          title="Ocultar lista de chats"
          aria-label="Ocultar lista de chats"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
      </div>

      <div className="px-3 py-2">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar un chat por número"
          className="w-full rounded-lg bg-[#f0f2f5] px-4 py-2 text-sm text-[#111b21] outline-none placeholder:text-[#667781]"
        />

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onWindowFilterChange("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              windowFilter === "all"
                ? "bg-[#e9edef] text-[#111b21]"
                : "text-[#667781] hover:bg-[#f0f2f5]"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => onWindowFilterChange("open")}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={
              windowFilter === "open"
                ? { backgroundColor: WINDOW_OPEN_BG, color: WINDOW_OPEN_ACCENT }
                : { color: "#667781" }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: WINDOW_OPEN_ACCENT }}
            />
            Abiertas
          </button>
          <button
            onClick={() => onWindowFilterChange("closed")}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={
              windowFilter === "closed"
                ? { backgroundColor: WINDOW_CLOSED_BG, color: WINDOW_CLOSED_ACCENT }
                : { color: "#667781" }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: WINDOW_CLOSED_ACCENT }}
            />
            Vencidas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[#667781]">
            No hay chats todavía
          </p>
        ) : (
          filtered.map((chat) => {
            const active = chat.sessionId === selectedSessionId;
            return (
              <button
                key={chat.sessionId}
                onClick={() => onSelect(chat.sessionId)}
                className={`flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left transition-colors ${
                  active ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
                }`}
              >
                <div
                  className="shrink-0 rounded-full border-2 p-[3px] transition-colors"
                  style={{
                    borderColor: chat.windowOpen
                      ? WINDOW_OPEN_RING
                      : WINDOW_CLOSED_RING,
                  }}
                  title={
                    chat.windowOpen
                      ? "Ventana de atención abierta"
                      : "Ventana de atención vencida"
                  }
                >
                  <UserAvatar seed={chat.sessionId} size={48} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-medium text-[#111b21]">
                      +{chat.sessionId}
                    </span>
                    <span className="shrink-0 text-xs text-[#667781]">
                      {formatListTimestamp(chat.lastAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-[#667781]">
                    {chat.lastRole === "bot" ? "Tú: " : ""}
                    {chat.lastMessage}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
