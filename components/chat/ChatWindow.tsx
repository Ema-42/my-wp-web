"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { formatRemaining } from "./format";
import { UserAvatar } from "./UserAvatar";
import { useTheme } from "./ThemeContext";
import {
  WINDOW_CLOSED_ACCENT,
  WINDOW_CLOSED_BG,
  WINDOW_OPEN_ACCENT,
  WINDOW_OPEN_BG,
} from "./window-colors";

type Props = {
  sessionId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  windowOpen: boolean;
  windowExpiresAt: string | null;
  onSend: (text: string) => Promise<void>;
  onSendFile: (file: File, caption?: string) => Promise<void>;
};

export function ChatWindow({
  sessionId,
  messages,
  loading,
  windowOpen,
  windowExpiresAt,
  onSend,
  onSendFile,
}: Props) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingFiles, setSendingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingCaption, setPendingCaption] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  function getObjectUrl(file: File): string {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!objectUrlsRef.current.has(key)) {
      objectUrlsRef.current.set(key, URL.createObjectURL(file));
    }
    return objectUrlsRef.current.get(key)!;
  }

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const addPendingFiles = useCallback((files: FileList | File[]) => {
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  }, []);

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearPending() {
    setPendingFiles([]);
    setPendingCaption("");
  }

  async function sendPendingFiles() {
    if (!pendingFiles.length || sendingFiles) return;
    setSendingFiles(true);
    setError(null);
    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const isLast = i === pendingFiles.length - 1;
        await onSendFile(pendingFiles[i], isLast && pendingCaption ? pendingCaption : undefined);
      }
      clearPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setSendingFiles(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sessionId]);

  // Re-render every 30s so the "vence en Xh Ym" countdown stays accurate.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!sessionId) {
    return (
      <div
        className="flex h-full min-w-0 flex-1 flex-col items-center justify-center text-center"
        style={{ background: colors.bgSecondary }}
      >
        <p className="text-lg font-medium" style={{ color: colors.textSecondary }}>
          Selecciona un chat para ver la conversación
        </p>
        <p className="mt-1 max-w-sm text-sm" style={{ color: colors.textSecondary }}>
          Aquí verás el historial del bot y podrás enviar mensajes manuales al
          contacto.
        </p>
      </div>
    );
  }

  const inputDisabled = sending || sendingFiles || !windowOpen;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || inputDisabled) return;

    setSending(true);
    setError(null);
    try {
      await onSend(text);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    event.target.value = "";
    if (!files || !files.length) return;
    addPendingFiles(files);
  }

  function handleDragEnter(event: React.DragEvent) {
    event.preventDefault();
    if (inputDisabled) return;
    if (event.dataTransfer.types.includes("Files")) setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      setDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragActive(false);
    if (inputDisabled) return;
    const files = event.dataTransfer.files;
    if (files.length) addPendingFiles(files);
  }

  return (
    <div
      className="relative flex h-full min-w-0 flex-1 flex-col transition-colors"
      style={{ background: colors.bgChat }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg border-4 border-dashed border-[#00a884] bg-[#00a884]/10 backdrop-blur-[2px]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-14 w-14 text-[#00a884]">
            <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
          </svg>
          <p className="text-lg font-semibold text-[#00a884]">Suelta para adjuntar</p>
        </div>
      )}
      <header
        className="flex items-center gap-3 border-b px-4 py-2.5 transition-colors"
        style={{ background: colors.bgSecondary, borderColor: colors.border }}
      >
        <UserAvatar seed={sessionId} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-medium" style={{ color: colors.textPrimary }}>
              +{sessionId}
            </p>
            {windowOpen ? (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: WINDOW_OPEN_BG, color: WINDOW_OPEN_ACCENT }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: WINDOW_OPEN_ACCENT }}
                />
                Ventana abierta
                {windowExpiresAt && ` · vence en ${formatRemaining(windowExpiresAt)}`}
              </span>
            ) : (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: WINDOW_CLOSED_BG, color: WINDOW_CLOSED_ACCENT }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: WINDOW_CLOSED_ACCENT }}
                />
                Ventana vencida
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: colors.textSecondary }}>
            {sendingFiles
              ? "Enviando archivos..."
              : loading
                ? "Cargando..."
                : `${messages.length} mensajes`}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <p className="bg-[#fde2e1] px-4 py-2 text-center text-sm text-[#8b1a1a]">
          {error}
        </p>
      )}

      {!windowOpen && (
        <p className="bg-[#fff3cd] px-4 py-2 text-center text-sm text-[#7a5b00]">
          La ventana de atención de 23 horas venció. Ya no se pueden enviar
          mensajes libres a este contacto hasta que él vuelva a escribir.
        </p>
      )}

      {/* Staging area: shows when files are queued via clip or drop */}
      {pendingFiles.length > 0 && (
        <div
          className="border-t px-4 pb-3 pt-3 transition-colors"
          style={{ background: colors.bgSecondary, borderColor: colors.border }}
        >
          {/* File thumbnails */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {pendingFiles.map((file, i) => (
              <div key={i} className="relative shrink-0">
                {file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getObjectUrl(file)}
                    alt={file.name}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg px-2"
                    style={{ background: colors.bgTertiary }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" style={{ color: colors.textSecondary }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 6V3.5L19.5 9H15a1 1 0 0 1-1-1z" />
                    </svg>
                    <span className="w-full truncate text-center text-[10px]" style={{ color: colors.textSecondary }}>
                      {file.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removePendingFile(i)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
                  aria-label="Quitar archivo"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Add more files button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors hover:bg-black/5"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
              title="Agregar más archivos"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span className="text-[10px]">Agregar</span>
            </button>
          </div>

          {/* Caption input + actions */}
          <div className="flex items-center gap-2">
            <input
              value={pendingCaption}
              onChange={(e) => setPendingCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPendingFiles(); }
              }}
              placeholder="Agregar un mensaje..."
              disabled={sendingFiles}
              autoFocus
              className="flex-1 rounded-lg px-4 py-2 text-sm outline-none disabled:opacity-60"
              style={{ background: colors.inputBg, color: colors.textPrimary }}
            />
            <button
              onClick={clearPending}
              disabled={sendingFiles}
              className="shrink-0 rounded-full px-3 py-2 text-sm transition-colors hover:bg-black/5 disabled:opacity-40"
              style={{ color: colors.textSecondary }}
            >
              Cancelar
            </button>
            <button
              onClick={sendPendingFiles}
              disabled={sendingFiles}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition-opacity disabled:opacity-50"
              aria-label="Enviar archivos"
              title={`Enviar ${pendingFiles.length} ${pendingFiles.length === 1 ? "archivo" : "archivos"}`}
            >
              {sendingFiles ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 translate-x-[-1px]">
                  <path d="M3 20l18-8L3 4v6l12 2-12 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t px-4 py-3 transition-colors"
        style={{ background: colors.bgSecondary, borderColor: colors.border }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={inputDisabled}
          title={windowOpen ? "Adjuntar archivo" : "Ventana vencida: no puedes adjuntar"}
          aria-label="Adjuntar archivo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 disabled:opacity-40"
          style={{ color: colors.textSecondary }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z" />
          </svg>
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            windowOpen ? "Escribe un mensaje" : "Ventana vencida: no puedes escribir"
          }
          disabled={inputDisabled}
          className="flex-1 rounded-lg px-4 py-2 text-sm outline-none disabled:opacity-60"
          style={{
            background: colors.inputBg,
            color: colors.textPrimary,
          }}
        />
        <button
          type="submit"
          disabled={inputDisabled || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition-opacity disabled:opacity-40"
          aria-label="Enviar mensaje"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 translate-x-[-1px]"
          >
            <path d="M3 20l18-8L3 4v6l12 2-12 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
