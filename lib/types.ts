export type ChatRole = "contact" | "bot" | "unknown";

/**
 * "bot" = el bot responde normal. "solicitada" = el contacto pidió hablar
 * con una persona, pero el bot sigue respondiendo hasta que alguien toma
 * el control. "atendido" = un operador tomó el control; el bot no debe
 * responder (lo valida el flujo de n8n, esto solo refleja el estado).
 */
export type AttentionState = "bot" | "solicitada" | "atendido";

export type ChatSummary = {
  sessionId: string;
  contactName: string | null;
  total: number;
  lastAt: string;
  lastMessage: string;
  lastRole: ChatRole;
  lastContactAt: string | null;
  windowOpen: boolean;
  windowExpiresAt: string | null;
  unread: boolean;
  attentionState: AttentionState;
};

export type ChatAttachment = {
  filename: string;
  mimeType?: string;
  mediaType?: "image" | "document" | "audio";
  whatsappMediaId?: string;
};

export type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
  createdAt: string;
  attachment?: ChatAttachment;
};
