"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { formatRemaining } from "./format";
import { UserAvatar } from "./UserAvatar";
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
  onSendFile: (file: File) => Promise<void>;
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
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-[#f0f2f5] text-center">
        <p className="text-lg font-medium text-[#41525d]">
          Selecciona un chat para ver la conversación
        </p>
        <p className="mt-1 max-w-sm text-sm text-[#667781]">
          Aquí verás el historial del bot y podrás enviar mensajes manuales al
          contacto.
        </p>
      </div>
    );
  }

  const inputDisabled = sending || uploadingFile || !windowOpen;

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

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingFile(true);
    setError(null);
    try {
      await onSendFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el archivo");
    } finally {
      setUploadingFile(false);
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-[#efeae2]">
      <header className="flex items-center gap-3 border-b border-black/10 bg-[#f0f2f5] px-4 py-2.5">
        <UserAvatar seed={sessionId} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-medium text-[#111b21]">
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
          <p className="text-xs text-[#667781]">
            {uploadingFile
              ? "Enviando archivo..."
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

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-black/10 bg-[#f0f2f5] px-4 py-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={inputDisabled}
          title={windowOpen ? "Adjuntar archivo" : "Ventana vencida: no puedes adjuntar"}
          aria-label="Adjuntar archivo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition-colors hover:bg-black/5 disabled:opacity-40"
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
          className="flex-1 rounded-lg bg-white px-4 py-2 text-sm text-[#111b21] outline-none placeholder:text-[#667781] disabled:opacity-60"
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
