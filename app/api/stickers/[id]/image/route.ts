import { NextRequest, NextResponse } from "next/server";
import { pool, STICKERS_TABLE } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stickerId = Number(id);

  if (!Number.isInteger(stickerId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT data_base64, mime_type FROM ${STICKERS_TABLE} WHERE id = $1`,
    [stickerId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Sticker no encontrado" }, { status: 404 });
  }

  const buffer = Buffer.from(rows[0].data_base64 as string, "base64");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": rows[0].mime_type as string,
      // El contenido de un sticker guardado nunca cambia una vez insertado.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
