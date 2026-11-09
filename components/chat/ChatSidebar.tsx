"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AttentionState, ChatSummary } from "@/lib/types";
import { formatListTimestamp } from "./format";
import { UserAvatar } from "./UserAvatar";
import { useTheme } from "./ThemeContext";
import {
  WINDOW_CLOSED_ACCENT,
  WINDOW_CLOSED_BG,
  WINDOW_CLOSED_RING,
  WINDOW_OPEN_ACCENT,
  WINDOW_OPEN_BG,
  WINDOW_OPEN_RING,
} from "./window-colors";

export type WindowFilter = "all" | "open" | "closed";
export type AttentionFilter = "all" | AttentionState;

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
      <path d="M10 18h4v-2h-4zM3 6v2h18V6zm3 7h12v-2H6z" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A1.5 1.5 0 0 0 6 14.5A1.5 1.5 0 0 0 7.5 16A1.5 1.5 0 0 0 9 14.5A1.5 1.5 0 0 0 7.5 13m9 0a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 0 1.5-1.5a1.5 1.5 0 0 0-1.5-1.5Z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
    </svg>
  );
}

const ATTENTION_FILTER_OPTIONS: {
  value: AttentionFilter;
  label: string;
  icon: ReactNode;
  activeBg: string;
  activeColor: string;
}[] = [
  { value: "all", label: "Todos los estados", icon: <FilterIcon />, activeBg: "", activeColor: "" },
  { value: "bot", label: "Bot", icon: <BotIcon />, activeBg: "", activeColor: "" },
  {
    value: "solicitada",
    label: "Solicitan atención",
    icon: <BellIcon />,
    activeBg: "#4a1f1f",
    activeColor: "#ff8a80",
  },
  {
    value: "atendido",
    label: "En atención",
    icon: <PersonIcon />,
    activeBg: "#0e3b2e",
    activeColor: "#8fe3ab",
  },
];

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a884]";

type Props = {
  /** Número de WhatsApp Business de esta línea (WHATSAPP_BUSINESS_NUMBER). */
  businessNumber?: string | null;
  chats: ChatSummary[];
  loading: boolean;
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  windowFilter: WindowFilter;
  onWindowFilterChange: (value: WindowFilter) => void;
  attentionFilter: AttentionFilter;
  onAttentionFilterChange: (value: AttentionFilter) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** "mobile" = full-bleed pane (phone/tablet nav), "desktop" = fixed-width column. */
  variant?: "desktop" | "mobile";
};

function displayName(chat: ChatSummary) {
  return chat.contactName?.trim() || `+${chat.sessionId}`;
}

export function ChatSidebar({
  businessNumber = null,
  chats,
  loading,
  selectedSessionId,
  onSelect,
  search,
  onSearchChange,
  windowFilter,
  onWindowFilterChange,
  attentionFilter,
  onAttentionFilterChange,
  collapsed,
  onToggleCollapsed,
  variant = "desktop",
}: Props) {
  const isMobile = variant === "mobile";
  const term = search.trim().toLowerCase();
  const filtered = chats
    .filter((chat) =>
      term
        ? chat.sessionId.includes(term) ||
          (chat.contactName?.toLowerCase().includes(term) ?? false)
        : true
    )
    .filter((chat) => attentionFilter === "all" || chat.attentionState === attentionFilter)
    .filter((chat) => {
      if (windowFilter === "open") return chat.windowOpen;
      if (windowFilter === "closed") return !chat.windowOpen;
      return true;
    });

  const { dark, toggle: toggleDark, colors } = useTheme();

  const [hovered, setHovered] = useState<{ chat: ChatSummary; top: number } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [attentionMenuOpen, setAttentionMenuOpen] = useState(false);
  const attentionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!attentionMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        attentionMenuRef.current &&
        !attentionMenuRef.current.contains(event.target as Node)
      ) {
        setAttentionMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [attentionMenuOpen]);

  const selectedAttentionOption =
    ATTENTION_FILTER_OPTIONS.find((opt) => opt.value === attentionFilter) ??
    ATTENTION_FILTER_OPTIONS[0];

  async function copyBusinessNumber() {
    if (!businessNumber) return;
    try {
      await navigator.clipboard.writeText(businessNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API bloqueada (permisos/contexto no seguro): sin feedback.
    }
  }

  if (collapsed && !isMobile) {
    return (
      <aside
        className="flex h-full w-16 shrink-0 flex-col items-center border-r py-3 transition-colors"
        style={{ background: colors.bgPrimary, borderColor: colors.border }}
      >
        <button
          onClick={onToggleCollapsed}
          title="Expandir lista de chats"
          aria-label="Expandir lista de chats"
          className={`mb-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-[#00a884] active:scale-95 ${FOCUS_RING}`}
        >
          <Image
            src="/icon_wp.png"
            alt="Asistente WhatsApp"
            width={36}
            height={36}
            className="h-9 w-9 object-cover"
          />
        </button>

        <button
          onClick={toggleDark}
          title={dark ? "Modo claro" : "Modo oscuro"}
          aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
          className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5 active:scale-95 ${FOCUS_RING}`}
          style={{ color: colors.textSecondary }}
        >
          {dark ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 1 1-1zm0-16a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V4a1 1 0 0 1 1-1zm9 8a1 1 0 0 1-1 1h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 1 1zM4 12a1 1 0 0 1-1 1H2a1 1 0 0 1 0-2h1a1 1 0 0 1 1 1zm14.95 5.364-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 1.414zM6.757 7.05l-.707.707A1 1 0 1 1 4.636 6.343l.707-.707A1 1 0 1 1 6.757 7.05zm11.193-1.414.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 1.414-1.414zM6.05 17.243l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a1 1 0 1 1 1.414-1.414z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
            </svg>
          )}
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
                aria-label={displayName(chat)}
                aria-current={active ? "true" : undefined}
                className={`flex items-center justify-center rounded-full p-1 transition active:scale-95 ${
                  active ? "" : "hover:bg-[var(--row-hover)]"
                } ${FOCUS_RING}`}
                style={
                  active
                    ? { background: colors.activeBg }
                    : ({ "--row-hover": colors.hoverBg } as CSSProperties)
                }
              >
                <div className="relative">
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
                  {chat.attentionState === "solicitada" && (
                    <span className="absolute -bottom-0.5 -left-0.5 flex h-3.5 w-3.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span
                        className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 bg-red-500"
                        style={{ borderColor: colors.bgPrimary }}
                      />
                    </span>
                  )}
                  {chat.attentionState === "atendido" && (
                    <span
                      className="absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 bg-[#00a884]"
                      style={{ borderColor: colors.bgPrimary }}
                    />
                  )}
                  {chat.unread && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2"
                      style={{
                        background: "#00a884",
                        borderColor: colors.bgPrimary,
                      }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {hovered && (
          <div
            className="pointer-events-none fixed z-50 w-max max-w-[240px] -translate-y-1/2 rounded-lg px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: 72, top: hovered.top, background: colors.tooltipBg }}
          >
            <p className="font-medium" style={{ color: colors.textPrimary }}>{displayName(hovered.chat)}</p>
            <p
              style={{ color: hovered.chat.windowOpen ? "#8fe3ab" : "#ffb3b0" }}
            >
              {hovered.chat.windowOpen
                ? "Ventana de atención abierta"
                : "Ventana de atención vencida"}
            </p>
            {hovered.chat.attentionState === "solicitada" && (
              <p style={{ color: "#ff8a80" }}>🔔 Solicita atención humana</p>
            )}
            {hovered.chat.attentionState === "atendido" && (
              <p style={{ color: "#8fe3ab" }}>🧑 En atención (bot pausado)</p>
            )}
            <p style={{ color: colors.textSecondary }}>
              Último mensaje: {formatListTimestamp(hovered.chat.lastAt)}
            </p>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside
      className={`flex h-full w-full shrink-0 flex-col border-r transition-colors ${
        isMobile ? "" : "max-w-[420px] min-w-[320px]"
      }`}
      style={{ background: colors.bgPrimary, borderColor: colors.border }}
    >
      <div
        className="flex flex-col gap-1 px-4 py-3"
        style={{ background: colors.bgSecondary }}
      >
      <div className="flex items-center justify-between">
        {isMobile ? (
          <span className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
              <Image
                src="/icon_wp.png"
                alt="Asistente WhatsApp"
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
              />
            </div>
            <span className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>
              Asistente WhatsApp
            </span>
          </span>
        ) : (
          <button
            onClick={onToggleCollapsed}
            title="Ocultar lista de chats"
            className={`flex items-center gap-3 rounded-lg ${FOCUS_RING}`}
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
            <span className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>
              Asistente WhatsApp
            </span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            title={dark ? "Modo claro" : "Modo oscuro"}
            aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5 active:scale-95 ${FOCUS_RING}`}
            style={{ color: colors.textSecondary }}
          >
            {dark ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 1 1-1zm0-16a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V4a1 1 0 0 1 1-1zm9 8a1 1 0 0 1-1 1h-1a1 1 0 0 1 0-2h1a1 1 0 0 1 1 1zM4 12a1 1 0 0 1-1 1H2a1 1 0 0 1 0-2h1a1 1 0 0 1 1 1zm14.95 5.364-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 1.414zM6.757 7.05l-.707.707A1 1 0 1 1 4.636 6.343l.707-.707A1 1 0 1 1 6.757 7.05zm11.193-1.414.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 1.414-1.414zM6.05 17.243l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a1 1 0 1 1 1.414-1.414z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            )}
          </button>

          {!isMobile && (
            <button
              onClick={onToggleCollapsed}
              title="Ocultar lista de chats"
              aria-label="Ocultar lista de chats"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/5 active:scale-95 ${FOCUS_RING}`}
              style={{ color: colors.textSecondary }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
          )}
        </div>
      </div>

        {businessNumber && (
          <div className="flex items-center gap-1.5 pl-[52px]">
            <span className="truncate text-xs" style={{ color: colors.textSecondary }}>
              Línea: +{businessNumber}
            </span>
            <button
              type="button"
              onClick={copyBusinessNumber}
              title="Copiar número"
              aria-label="Copiar número de WhatsApp Business"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 active:scale-95 ${FOCUS_RING}`}
              style={{ color: copied ? "#00a884" : colors.textSecondary }}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="px-3 py-2" style={{ background: colors.bgPrimary }}>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar un chat por nombre o número"
          className={`w-full rounded-lg px-4 py-2.5 text-[16px] outline-none sm:text-sm ${FOCUS_RING}`}
          style={{
            background: colors.searchBg,
            color: colors.textPrimary,
          }}
        />

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onWindowFilterChange("all")}
            className={`min-h-[32px] rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${FOCUS_RING}`}
            style={
              windowFilter === "all"
                ? { background: colors.bgTertiary, color: colors.textPrimary }
                : { color: colors.textSecondary }
            }
          >
            Todas
          </button>
          <button
            onClick={() => onWindowFilterChange("open")}
            className={`flex min-h-[32px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${FOCUS_RING}`}
            style={
              windowFilter === "open"
                ? { backgroundColor: WINDOW_OPEN_BG, color: WINDOW_OPEN_ACCENT }
                : { color: colors.textSecondary }
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
            className={`flex min-h-[32px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${FOCUS_RING}`}
            style={
              windowFilter === "closed"
                ? { backgroundColor: WINDOW_CLOSED_BG, color: WINDOW_CLOSED_ACCENT }
                : { color: colors.textSecondary }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: WINDOW_CLOSED_ACCENT }}
            />
            Vencidas
          </button>
        </div>

        <div className="relative mt-1.5" ref={attentionMenuRef}>
          <button
            type="button"
            onClick={() => setAttentionMenuOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={attentionMenuOpen}
            className={`flex min-h-[30px] w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition active:scale-[0.98] ${FOCUS_RING}`}
            style={{
              background: selectedAttentionOption.activeBg || colors.searchBg,
              color: selectedAttentionOption.activeColor || colors.textPrimary,
            }}
          >
            {selectedAttentionOption.icon}
            <span className="flex-1 truncate text-left">{selectedAttentionOption.label}</span>
            <ChevronDownIcon />
          </button>

          {attentionMenuOpen && (
            <div
              role="listbox"
              className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg shadow-lg"
              style={{ background: colors.bgPrimary, border: `1px solid ${colors.border}` }}
            >
              {ATTENTION_FILTER_OPTIONS.map((opt) => {
                const active = opt.value === attentionFilter;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onAttentionFilterChange(opt.value);
                      setAttentionMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition ${
                      active ? "" : "hover:bg-[var(--row-hover)]"
                    } ${FOCUS_RING}`}
                    style={
                      {
                        color: active && opt.activeColor ? opt.activeColor : colors.textPrimary,
                        // Sin fondo inline cuando no está activo: un inline
                        // "background" (aunque sea "transparent") siempre le
                        // gana al hover:bg-[...] de Tailwind, porque un
                        // estilo inline tiene más especificidad que cualquier
                        // regla de clase — por eso el hover no se pintaba.
                        ...(active
                          ? { background: opt.activeBg || colors.bgTertiary }
                          : ({ "--row-hover": colors.hoverBg } as CSSProperties)),
                      } as CSSProperties
                    }
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <ChatListSkeleton />
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm" style={{ color: colors.textSecondary }}>
            No hay chats todavía
          </p>
        ) : (
          filtered.map((chat) => {
            const active = chat.sessionId === selectedSessionId;
            const name = displayName(chat);
            const showNumberSubtitle = Boolean(chat.contactName?.trim());
            return (
              <button
                key={chat.sessionId}
                onClick={() => onSelect(chat.sessionId)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition ${
                  active ? "" : "hover:bg-[var(--row-hover)] active:bg-[var(--row-active)]"
                } ${FOCUS_RING}`}
                style={
                  active
                    ? { borderColor: colors.border, background: colors.activeBg }
                    : ({
                        borderColor: colors.border,
                        "--row-hover": colors.hoverBg,
                        "--row-active": colors.activeBg,
                      } as CSSProperties)
                }
              >
                <div className="relative shrink-0">
                  <div
                    className="rounded-full border-2 p-[3px] transition-colors"
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
                  {chat.attentionState === "solicitada" && (
                    <span
                      className="absolute -bottom-0.5 -left-0.5 flex h-4 w-4"
                      title="Solicita atención humana"
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span
                        className="relative inline-flex h-4 w-4 rounded-full border-2 bg-red-500"
                        style={{ borderColor: colors.bgPrimary }}
                      />
                    </span>
                  )}
                  {chat.attentionState === "atendido" && (
                    <span
                      className="absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full border-2 bg-[#00a884]"
                      style={{ borderColor: colors.bgPrimary }}
                      title="En atención (bot pausado)"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="truncate text-[15px]"
                      style={{
                        color: colors.textPrimary,
                        fontWeight: chat.unread ? 700 : 500,
                      }}
                    >
                      {name}
                      {showNumberSubtitle && (
                        <span
                          className="ml-1.5 truncate text-xs font-normal"
                          style={{ color: colors.textSecondary }}
                        >
                          +{chat.sessionId}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs" style={{ color: colors.textSecondary }}>
                      {formatListTimestamp(chat.lastAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="truncate text-sm"
                      style={{
                        color: chat.unread ? colors.textPrimary : colors.textSecondary,
                        fontWeight: chat.unread ? 600 : 400,
                      }}
                    >
                      {chat.lastRole === "bot" ? "Tú: " : ""}
                      {chat.lastMessage}
                    </p>
                    {chat.unread && (
                      <span
                        className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white"
                        style={{ background: "#00a884" }}
                      >
                        •
                      </span>
                    )}
                  </div>
                  {chat.attentionState === "solicitada" && (
                    <span
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: "#4a1f1f", color: "#ff8a80" }}
                    >
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                      </span>
                      Solicita atención
                    </span>
                  )}
                  {chat.attentionState === "atendido" && (
                    <span
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: "#0e3b2e", color: "#8fe3ab" }}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00a884]" />
                      En atención
                    </span>
                  )}
                  {chat.attentionState === "bot" && (
                    <span
                      className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: colors.bgTertiary, color: colors.textSecondary }}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00a884]" />
                      Bot
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function ChatListSkeleton() {
  const { colors } = useTheme();
  return (
    <div className="flex flex-col">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: colors.border }}
        >
          <div
            className="h-12 w-12 shrink-0 animate-pulse rounded-full"
            style={{ background: colors.bgTertiary }}
          />
          <div className="min-w-0 flex-1">
            <div
              className="mb-2 h-3.5 w-2/5 animate-pulse rounded"
              style={{ background: colors.bgTertiary }}
            />
            <div
              className="h-3 w-4/5 animate-pulse rounded"
              style={{ background: colors.bgTertiary }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
