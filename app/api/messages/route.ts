import { NextRequest, NextResponse } from "next/server";
import { pool, CHAT_HISTORY_TABLE } from "@/lib/db";
import { parseChatMessage } from "@/lib/chat-message";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { getSessionServiceWindow } from "@/lib/service-window";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Falta el parámetro sessionId" },
      { status: 400 }
    );
  }

  const { rows } = await pool.query(
    `SELECT id, message, created_at
     FROM ${CHAT_HISTORY_TABLE}
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );

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

  return NextResponse.json({ messages });
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
