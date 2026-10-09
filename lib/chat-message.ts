export type ChatRole = "contact" | "bot" | "unknown";

export type ChatAttachment = {
  filename: string;
  mimeType?: string;
};

export type ParsedMessage = {
  role: ChatRole;
  text: string;
  attachment?: ChatAttachment;
};

/**
 * n8n's Postgres chat memory stores LangChain messages as:
 * { "type": "human" | "ai" | "system", "data": { "content": "...", ... } }
 * Some rows may instead carry "content" at the top level, or raw webhook
 * payloads. This extracts a display string from whatever shape shows up.
 *
 * Documents sent from this app stash file info under
 * additional_kwargs.attachment (see app/api/documents/route.ts).
 */
export function parseChatMessage(raw: unknown): ParsedMessage {
  const msg = raw as Record<string, unknown> | null | undefined;

  if (!msg || typeof msg !== "object") {
    return { role: "unknown", text: raw == null ? "" : String(raw) };
  }

  const data =
    typeof msg.data === "object" && msg.data !== null
      ? (msg.data as Record<string, unknown>)
      : undefined;

  const type = (msg.type ?? data?.type) as string | undefined;

  const content =
    (typeof msg.content === "string" && msg.content) ||
    (typeof data?.content === "string" && data.content) ||
    (typeof msg.text === "string" && msg.text) ||
    undefined;

  let role: ChatRole = "unknown";
  if (type === "human") role = "contact";
  else if (type === "ai" || type === "system") role = "bot";

  const text = content ?? JSON.stringify(data ?? msg);

  const additionalKwargs =
    typeof msg.additional_kwargs === "object" && msg.additional_kwargs !== null
      ? (msg.additional_kwargs as Record<string, unknown>)
      : undefined;
  const rawAttachment = additionalKwargs?.attachment;
  const attachment =
    typeof rawAttachment === "object" &&
    rawAttachment !== null &&
    typeof (rawAttachment as Record<string, unknown>).filename === "string"
      ? {
          filename: (rawAttachment as Record<string, unknown>)
            .filename as string,
          mimeType:
            typeof (rawAttachment as Record<string, unknown>).mimeType ===
            "string"
              ? ((rawAttachment as Record<string, unknown>).mimeType as string)
              : undefined,
        }
      : undefined;

  return { role, text, attachment };
}
