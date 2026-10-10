import { NextRequest, NextResponse } from "next/server";
import { pool, CONTACTS_TABLE } from "@/lib/db";

/**
 * Marks a chat as read by the operator (not WhatsApp's own delivery/read
 * ticks, which are between the bot and the contact). Upserts into the
 * contacts table so it's shared across operators/devices, not per-browser.
 * Requires `numero` to have a UNIQUE constraint — see README migration.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json({ error: "Falta sessionId" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO ${CONTACTS_TABLE} (numero, ultimo_leido_at)
     VALUES ($1, NOW())
     ON CONFLICT (numero) DO UPDATE SET ultimo_leido_at = EXCLUDED.ultimo_leido_at`,
    [sessionId]
  );

  return NextResponse.json({ ok: true });
}
