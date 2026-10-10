export type ChatRole = "contact" | "bot" | "unknown";

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
