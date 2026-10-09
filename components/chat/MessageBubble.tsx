import type { ChatMessage } from "@/lib/types";
import { formatTime } from "./format";

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 6V3.5L19.5 9H15a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isOutgoing = message.role === "bot";
  const attachment = message.attachment;
  const autoCaption = attachment ? `📎 ${attachment.filename}` : null;
  const hasOwnCaption = attachment && message.text && message.text !== autoCaption;

  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
          isOutgoing
            ? "bg-[#d9fdd3] text-[#111b21]"
            : "bg-white text-[#111b21]"
        }`}
      >
        {attachment && (
          <div className="mb-1 flex items-center gap-2 rounded-md bg-black/5 px-2 py-2">
            <DocumentIcon />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {attachment.filename}
            </span>
          </div>
        )}

        {(!attachment || hasOwnCaption) && (
          <p className="whitespace-pre-wrap break-words text-sm">
            {message.text}
          </p>
        )}

        <span className="mt-1 block text-right text-[11px] text-[#667781]">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
