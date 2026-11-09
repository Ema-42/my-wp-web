import { NextRequest, NextResponse } from "next/server";
import { pool, STICKERS_TABLE, CHAT_HISTORY_TABLE } from "@/lib/db";
import { parseChatMessage } from "@/lib/chat-message";
import { sendWhatsAppSticker, uploadWhatsAppMedia } from "@/lib/whatsapp";
import { getSessionServiceWindow } from "@/lib/service-window";

/**
 * Los media id de Meta vencen — en vez de intentar reusar el
 * original_whatsapp_media_id (que puede tener semanas), siempre resubimos
 * el webp guardado y mandamos con el id fresco que eso devuelve.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const stickerId = Number(body?.stickerId);

  if (!sessionId || !Number.isInteger(stickerId)) {
    return NextResponse.json(
      { error: "sessionId y stickerId son requeridos" },
      { status: 400 }
    );
  }

  const serviceWindow = await getSessionServiceWindow(sessionId);
  if (!serviceWindow.open) {
    return NextResponse.json(
      {
        error:
          "La ventana de atención de 23 horas para este contacto ya venció. No se puede enviar un sticker.",
      },
      { status: 409 }
    );
  }

  const { rows } = await pool.query(
    `SELECT data_base64, mime_type FROM ${STICKERS_TABLE} WHERE id = $1`,
    [stickerId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "Sticker no encontrado" }, { status: 404 });
  }

  const buffer = Buffer.from(rows[0].data_base64 as string, "base64");
  const mimeType = rows[0].mime_type as string;

  let mediaId: string;
  try {
    const blob = new Blob([buffer], { type: mimeType });
    mediaId = await uploadWhatsAppMedia(blob, "sticker.webp");
    await sendWhatsAppSticker(sessionId, mediaId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { rows: inserted } = await pool.query(
    `INSERT INTO ${CHAT_HISTORY_TABLE} (session_id, message)
     VALUES ($1, $2::jsonb)
     RETURNING id, message, created_at`,
    [
      sessionId,
      JSON.stringify({
        type: "ai",
        content: "🎨 Sticker",
        tool_calls: [],
        additional_kwargs: {
          attachment: {
            filename: "sticker.webp",
            mimeType,
            mediaType: "sticker",
            whatsappMediaId: mediaId,
          },
        },
        response_metadata: {},
        invalid_tool_calls: [],
      }),
    ]
  );

  const row = inserted[0];
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
