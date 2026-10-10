import { NextRequest, NextResponse } from "next/server";
import { pool, CHAT_HISTORY_TABLE } from "@/lib/db";
import { parseChatMessage } from "@/lib/chat-message";
import { sendWhatsAppAudio, uploadWhatsAppMedia } from "@/lib/whatsapp";
import { getSessionServiceWindow } from "@/lib/service-window";

// WhatsApp Cloud API's own limit for audio attachments.
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const sessionId = form.get("sessionId");
  const file = form.get("file");

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json(
      { error: "sessionId es requerido" },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Debes grabar una nota de voz" },
      { status: 400 }
    );
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "El audio supera el límite de 16 MB de WhatsApp" },
      { status: 400 }
    );
  }

  const serviceWindow = await getSessionServiceWindow(sessionId);

  if (!serviceWindow.open) {
    return NextResponse.json(
      {
        error:
          "La ventana de atención de 23 horas para este contacto ya venció. No se puede enviar una nota de voz.",
      },
      { status: 409 }
    );
  }

  const filename = file.name || "nota-de-voz.ogg";
  const mimeType = file.type || "audio/ogg";

  let mediaId: string;
  try {
    mediaId = await uploadWhatsAppMedia(file, filename);
    await sendWhatsAppAudio(sessionId, mediaId);
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
        content: "🎤 Nota de voz",
        tool_calls: [],
        additional_kwargs: {
          attachment: {
            filename,
            mimeType,
            mediaType: "audio",
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
