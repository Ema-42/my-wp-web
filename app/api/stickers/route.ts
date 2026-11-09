import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool, STICKERS_TABLE } from "@/lib/db";
import { downloadWhatsAppMedia } from "@/lib/whatsapp";

// Validates that the mediaId is a safe numeric string from Meta, same check
// used by the media proxy.
function isValidMediaId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * Un WebP animado trae un chunk "ANIM" (FourCC) cerca del inicio del header
 * RIFF/VP8X — uno estático nunca lo tiene. Más simple y confiable que
 * depender de un campo que nos pase el webhook de n8n.
 */
function isAnimatedWebp(buffer: Buffer): boolean {
  return buffer.subarray(0, 128).includes(Buffer.from("ANIM", "ascii"));
}

export async function GET() {
  const { rows } = await pool.query(
    `SELECT id, mime_type, animated, created_at
     FROM ${STICKERS_TABLE}
     ORDER BY created_at DESC`
  );

  return NextResponse.json({
    stickers: rows.map((row) => ({
      id: row.id as number,
      mimeType: row.mime_type as string,
      animated: row.animated as boolean,
      createdAt: row.created_at as Date,
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const whatsappMediaId =
    typeof body?.whatsappMediaId === "string" ? body.whatsappMediaId : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;

  if (!whatsappMediaId || !isValidMediaId(whatsappMediaId)) {
    return NextResponse.json({ error: "whatsappMediaId inválido" }, { status: 400 });
  }

  let buffer: Buffer;
  let mimeType: string;
  try {
    ({ buffer, mimeType } = await downloadWhatsAppMedia(whatsappMediaId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const sha256 = createHash("sha256").update(buffer).digest("base64");
  const animated = isAnimatedWebp(buffer);

  const { rows } = await pool.query(
    `INSERT INTO ${STICKERS_TABLE}
       (sha256, data_base64, mime_type, animated, source_session_id, original_whatsapp_media_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (sha256) DO NOTHING
     RETURNING id, mime_type, animated, created_at`,
    [sha256, buffer.toString("base64"), mimeType, animated, sessionId, whatsappMediaId]
  );

  if (rows.length === 0) {
    // Ya estaba guardado (mismo sha256): no es un error, solo no hay nada
    // nuevo que insertar.
    return NextResponse.json({ alreadySaved: true });
  }

  const row = rows[0];
  return NextResponse.json({
    sticker: {
      id: row.id as number,
      mimeType: row.mime_type as string,
      animated: row.animated as boolean,
      createdAt: row.created_at as Date,
    },
  });
}
