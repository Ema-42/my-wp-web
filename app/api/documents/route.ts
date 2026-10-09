import { NextRequest, NextResponse } from "next/server";
import { pool, CHAT_HISTORY_TABLE } from "@/lib/db";
import { parseChatMessage } from "@/lib/chat-message";
import { sendWhatsAppDocument, sendWhatsAppImage, uploadWhatsAppMedia } from "@/lib/whatsapp";

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}
import { getSessionServiceWindow } from "@/lib/service-window";

// WhatsApp Cloud API's own limit for document attachments.
const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const sessionId = form.get("sessionId");
  const caption = form.get("caption");
  const file = form.get("file");

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json(
      { error: "sessionId es requerido" },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Debes adjuntar un archivo" },
      { status: 400 }
    );
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 100 MB de WhatsApp" },
      { status: 400 }
    );
  }

  const serviceWindow = await getSessionServiceWindow(sessionId);

  if (!serviceWindow.open) {
    return NextResponse.json(
      {
        error:
          "La ventana de atención de 23 horas para este contacto ya venció. No se puede enviar un archivo.",
      },
      { status: 409 }
    );
  }

  const filename = file.name || "archivo";
  const mimeType = file.type || "";
  const captionText = typeof caption === "string" ? caption.trim() : "";
  const image = isImage(mimeType);

  let mediaId: string;
  try {
    mediaId = await uploadWhatsAppMedia(file, filename);
    if (image) {
      await sendWhatsAppImage(sessionId, mediaId, captionText || undefined);
    } else {
      await sendWhatsAppDocument(sessionId, mediaId, filename, captionText || undefined);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { rows } = await pool.query(
    `INSERT INTO ${CHAT_HISTORY_TABLE} (session_id, message)
     VALUES ($1, $2::jsonb)
     RETURNING id, message, created_at`,
    [
      sessionId,
      JSON.stringify({
        type: "ai",
        content: captionText || (image ? `🖼️ ${filename}` : `📎 ${filename}`),
        tool_calls: [],
        additional_kwargs: {
          attachment: {
            filename,
            mimeType: mimeType || undefined,
            mediaType: image ? "image" : "document",
            whatsappMediaId: mediaId,
          },
        },
        response_metadata: {},
        invalid_tool_calls: [],
      }),
    ]
  );

  const row = rows[0];
  const parsed = parseChatMessage(row.message);

  return NextResponse.json({
    message: {
      id: row.id as number,
      role: parsed.role,
      text: parsed.text,
      createdAt: row.created_at as Date,
      attachment: parsed.attachment,
    },
  });
}
