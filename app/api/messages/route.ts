import { NextRequest, NextResponse } from "next/server";
import { pool, CHAT_HISTORY_TABLE } from "@/lib/db";
import { parseChatMessage } from "@/lib/chat-message";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { getSessionServiceWindow } from "@/lib/service-window";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
// Tope para "after" (polling): no debería acumularse tanto entre dos polls
// de 3s, pero evita una respuesta gigante si el chat estuvo mucho sin abrir.
const MAX_NEWER_MESSAGES = 200;

/**
 * Paginado por `id` (SERIAL, monótono con el orden de inserción) en vez de
 * `created_at`: evita ambigüedad cuando dos filas comparten timestamp y es
 * más barato de indexar/comparar.
 *
 * - Sin `before`/`after`: trae los últimos `limit` mensajes (carga inicial).
 * - Con `before=<id>`: trae hasta `limit` mensajes más viejos que ese id
 *   ("cargar mensajes anteriores").
 * - Con `after=<id>`: trae los mensajes nuevos desde ese id (polling).
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const beforeParam = request.nextUrl.searchParams.get("before");
  const afterParam = request.nextUrl.searchParams.get("after");
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Falta el parámetro sessionId" },
      { status: 400 }
    );
  }

  let rows: Array<{ id: number; message: unknown; created_at: Date }>;
  let hasMore = false;

  if (afterParam) {
    const after = Number(afterParam);
    ({ rows } = await pool.query(
      `SELECT id, message, created_at
       FROM ${CHAT_HISTORY_TABLE}
       WHERE session_id = $1 AND id > $2
       ORDER BY id ASC
       LIMIT $3`,
      [sessionId, after, MAX_NEWER_MESSAGES]
    ));
  } else {
    // Pedimos uno de más para saber si queda historial más viejo, sin una
    // segunda consulta — se descarta antes de devolver la respuesta.
    const before = beforeParam ? Number(beforeParam) : null;
    const { rows: desc } = await pool.query(
      before
        ? `SELECT id, message, created_at
           FROM ${CHAT_HISTORY_TABLE}
           WHERE session_id = $1 AND id < $2
           ORDER BY id DESC
           LIMIT $3`
        : `SELECT id, message, created_at
           FROM ${CHAT_HISTORY_TABLE}
           WHERE session_id = $1
           ORDER BY id DESC
           LIMIT $2`,
      before ? [sessionId, before, limit + 1] : [sessionId, limit + 1]
    );
    hasMore = desc.length > limit;
    rows = desc.slice(0, limit).reverse();
  }

  const messages = rows.map((row) => {
    const parsed = parseChatMessage(row.message);
    return {
      id: row.id as number,
      role: parsed.role,
      text: parsed.text,
      createdAt: row.created_at as Date,
      attachment: parsed.attachment,
    };
  });

  return NextResponse.json({ messages, hasMore });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!sessionId || !text) {
    return NextResponse.json(
      { error: "sessionId y text son requeridos" },
      { status: 400 }
    );
  }

  const serviceWindow = await getSessionServiceWindow(sessionId);

  if (!serviceWindow.open) {
    return NextResponse.json(
      {
        error:
          "La ventana de atención de 23 horas para este contacto ya venció. No se puede enviar un mensaje libre.",
      },
      { status: 409 }
    );
  }

  try {
    await sendWhatsAppText(sessionId, text);
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
        content: text,
        tool_calls: [],
        additional_kwargs: {},
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
    },
  });
}
