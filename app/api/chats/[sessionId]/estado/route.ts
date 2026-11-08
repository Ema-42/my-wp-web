import { NextRequest, NextResponse } from "next/server";
import { pool, CONTACTS_TABLE } from "@/lib/db";
import type { AttentionState } from "@/lib/types";

const VALID_STATES: AttentionState[] = ["bot", "solicitada", "atendido"];

/**
 * Cambia a quién le toca responder un chat: "bot" (normal), "solicitada"
 * (el contacto pidió una persona, el bot sigue respondiendo) o "atendido"
 * (un operador tomó el control, el bot debe dejar de responder — eso lo
 * valida el flujo de n8n leyendo esta misma columna, no esta app).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const body = await request.json().catch(() => null);
  const estado = body?.estado;

  if (!sessionId) {
    return NextResponse.json({ error: "Falta sessionId" }, { status: 400 });
  }

  if (!VALID_STATES.includes(estado)) {
    return NextResponse.json(
      { error: `estado debe ser uno de: ${VALID_STATES.join(", ")}` },
      { status: 400 }
    );
  }

  await pool.query(
    `INSERT INTO ${CONTACTS_TABLE} (numero, estado_atencion)
     VALUES ($1, $2)
     ON CONFLICT (numero) DO UPDATE SET estado_atencion = EXCLUDED.estado_atencion`,
    [sessionId, estado]
  );

  return NextResponse.json({ ok: true, estado });
}
