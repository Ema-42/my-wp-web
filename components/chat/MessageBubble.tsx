import type { ChatMessage } from "@/lib/types";
import { formatTime } from "./format";
import { useTheme } from "./ThemeContext";

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

export function MessageBubble({ message }: { message: ChatMessage }) {
  const { colors } = useTheme();
  const isOutgoing = message.role === "bot";
  const attachment = message.attachment;
  const autoCaption = attachment
    ? attachment.mediaType === "image"
      ? `🖼️ ${attachment.filename}`
      : `📎 ${attachment.filename}`
    : null;
  const hasOwnCaption = attachment && message.text && message.text !== autoCaption;

  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`overflow-hidden rounded-lg shadow-sm ${
          attachment?.mediaType === "image" && attachment.whatsappMediaId
            ? "max-w-[75%]"
            : "max-w-[65%] px-3 py-2"
        }`}
        style={{
          background: isOutgoing ? colors.bubbleOut : colors.bubbleIn,
          color: colors.textPrimary,
        }}
      >
        {attachment?.mediaType === "image" && attachment.whatsappMediaId ? (
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
                className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                onClick={(e) => e.stopPropagation()}
              >
                <DownloadIcon />
              </a>
            </div>
            {hasOwnCaption && (
              <p className="whitespace-pre-wrap break-words px-3 pb-1 pt-1.5 text-sm">
                {message.text}
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
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-black/10"
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
                {message.text}
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
