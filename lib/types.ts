export type ChatRole = "contact" | "bot" | "unknown";

export type ChatSummary = {
  sessionId: string;
  total: number;
  lastAt: string;
  lastMessage: string;
  lastRole: ChatRole;
  lastContactAt: string | null;
  windowOpen: boolean;
  windowExpiresAt: string | null;
};

export type ChatAttachment = {
  filename: string;
  mimeType?: string;
  mediaType?: "image" | "document";
  whatsappMediaId?: string;
};

export type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
  createdAt: string;
  attachment?: ChatAttachment;
};
