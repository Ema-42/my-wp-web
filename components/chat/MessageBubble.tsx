import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ChatMessage } from "@/lib/types";
import { formatTime } from "./format";
import { useTheme } from "./ThemeContext";
import { LoopingSticker } from "./LoopingSticker";

/** Envuelve las coincidencias de `query` dentro de `text` en `<mark>`. */
function highlightMatches(text: string, query: string): ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const firstIdx = lower.indexOf(q);
  if (firstIdx === -1) return text;

  const parts: ReactNode[] = [];
  let start = 0;
  let idx = firstIdx;
  let key = 0;
  while (idx !== -1) {
    if (idx > start) parts.push(text.slice(start, idx));
    parts.push(
      <mark key={key++} className="rounded-sm bg-yellow-300 px-0.5 text-black">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    start = idx + q.length;
    idx = lower.indexOf(q, start);
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts;
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 6V3.5L19.5 9H15a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 shrink-0">
      <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

type Props = {
  message: ChatMessage;
  /** Texto buscado en la barra de búsqueda del chat; resalta coincidencias. */
  highlightQuery?: string;
  /** Es el resultado actualmente seleccionado al navegar la búsqueda. */
  isActiveMatch?: boolean;
  /** Click en un sticker recibido + botón "Guardar" lo suma a la bandeja propia. */
  onSaveSticker?: (whatsappMediaId: string) => Promise<void>;
};

export function MessageBubble({ message, highlightQuery, isActiveMatch, onSaveSticker }: Props) {
  const { colors } = useTheme();
  const isOutgoing = message.role === "bot";
  const attachment = message.attachment;
  const isSticker = attachment?.mediaType === "sticker" && attachment.whatsappMediaId;
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement | null>(null);
  // Solo los stickers que te manda el contacto se pueden guardar en tu
  // propia bandeja (los que vos mandás ya están ahí, por definición).
  const canSaveSticker = isSticker && !isOutgoing && Boolean(onSaveSticker);

  // Click afuera del sticker/botón cierra el menú de "Guardar" sin guardar.
  useEffect(() => {
    if (!saveMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
        setSaveMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [saveMenuOpen]);

  function handleStickerClick() {
    if (!canSaveSticker) return;
    setSaveMenuOpen((v) => !v);
  }

  async function confirmSaveSticker() {
    if (!canSaveSticker || saveState === "saving" || !attachment?.whatsappMediaId) return;
    setSaveState("saving");
    try {
      await onSaveSticker!(attachment.whatsappMediaId);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      setSaveMenuOpen(false);
      setTimeout(() => setSaveState("idle"), 1500);
    }
  }
  const autoCaption = attachment
    ? attachment.mediaType === "image"
      ? `🖼️ ${attachment.filename}`
      : attachment.mediaType === "audio"
        ? "🎤 Nota de voz"
        : attachment.mediaType === "sticker"
          ? "🎨 Sticker"
          : `📎 ${attachment.filename}`
    : null;
  const hasOwnCaption = attachment && message.text && message.text !== autoCaption;
  const text = highlightQuery ? highlightMatches(message.text, highlightQuery) : message.text;

  return (
    <div className={`message-enter flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`overflow-hidden transition-shadow ${
          isSticker
            ? "bg-transparent shadow-none"
            : `rounded-lg shadow-sm ${
                attachment?.mediaType === "image" && attachment.whatsappMediaId
                  ? "max-w-[75%]"
                  : "max-w-[65%] px-3 py-2"
              }`
        } ${isActiveMatch ? "ring-2 ring-[#00a884] ring-offset-1" : ""}`}
        style={{
          background: isSticker ? "transparent" : isOutgoing ? colors.bubbleOut : colors.bubbleIn,
          color: colors.textPrimary,
        }}
      >
        {isSticker ? (
          <div className={`flex flex-col gap-0.5 ${isOutgoing ? "items-end" : "items-start"}`}>
            <div className="relative" ref={saveMenuRef}>
              <LoopingSticker
                src={`/api/media/${attachment.whatsappMediaId}`}
                alt="Sticker"
                title={canSaveSticker ? "Click para guardar" : undefined}
                className={`h-32 w-32 object-contain ${canSaveSticker ? "cursor-pointer" : ""}`}
                onClick={handleStickerClick}
              />

              {saveMenuOpen && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/45">
                  <button
                    type="button"
                    onClick={confirmSaveSticker}
                    disabled={saveState === "saving"}
                    className="rounded-full bg-[#00a884] px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:brightness-95 active:scale-95 disabled:opacity-60"
                  >
                    {saveState === "saving" ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              )}

              {!saveMenuOpen && saveState !== "idle" && (
                <span
                  className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-white shadow"
                  style={{ background: saveState === "error" ? "#c0392b" : "#00a884" }}
                >
                  {saveState === "saved" ? <CheckIcon /> : "!"}
                </span>
              )}
            </div>
            <span className="text-[11px]" style={{ color: colors.textSecondary }}>
              {formatTime(message.createdAt)}
            </span>
          </div>
        ) : attachment?.mediaType === "audio" && attachment.whatsappMediaId ? (
          <>
            <audio
              controls
              preload="metadata"
              className="h-10 w-56 max-w-full"
              src={`/api/media/${attachment.whatsappMediaId}`}
            />
            <span
              className="mt-1 block text-right text-[11px]"
              style={{ color: colors.textSecondary }}
            >
              {formatTime(message.createdAt)}
            </span>
          </>
        ) : attachment?.mediaType === "image" && attachment.whatsappMediaId ? (
          <>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${attachment.whatsappMediaId}`}
                alt={attachment.filename}
                className="block max-h-80 w-full object-cover"
                loading="lazy"
              />
              <a
                href={`/api/media/${attachment.whatsappMediaId}`}
                download={attachment.filename}
                title="Descargar imagen"
                aria-label="Descargar imagen"
                className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={(e) => e.stopPropagation()}
              >
                <DownloadIcon />
              </a>
            </div>
            {hasOwnCaption && (
              <p className="whitespace-pre-wrap break-words px-3 pb-1 pt-1.5 text-sm">
                {text}
              </p>
            )}
            <span
              className="block px-3 pb-1.5 text-right text-[11px]"
              style={{ color: colors.textSecondary }}
            >
              {formatTime(message.createdAt)}
            </span>
          </>
        ) : (
          <>
            {attachment && (
              <div className="mb-1 flex items-center gap-2 rounded-md bg-black/5 px-2 py-2">
                <DocumentIcon />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {attachment.filename}
                </span>
                {attachment.whatsappMediaId && (
                  <a
                    href={`/api/media/${attachment.whatsappMediaId}`}
                    download={attachment.filename}
                    title="Descargar archivo"
                    aria-label="Descargar archivo"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-black/10 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a884]"
                    style={{ color: colors.textSecondary }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DownloadIcon />
                  </a>
                )}
              </div>
            )}

            {(!attachment || hasOwnCaption) && (
              <p className="whitespace-pre-wrap break-words text-sm">
                {text}
              </p>
            )}

            <span
              className="mt-1 block text-right text-[11px]"
              style={{ color: colors.textSecondary }}
            >
              {formatTime(message.createdAt)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
