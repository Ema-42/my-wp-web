import { NextResponse } from "next/server";
import { pool, CHAT_HISTORY_TABLE } from "@/lib/db";
import { parseChatMessage } from "@/lib/chat-message";
import { getServiceWindow } from "@/lib/window";

export async function GET() {
  const { rows } = await pool.query(`
    WITH counts AS (
      SELECT session_id, COUNT(*)::int AS total, MAX(created_at) AS last_at
      FROM ${CHAT_HISTORY_TABLE}
      GROUP BY session_id
    ),
    last_msg AS (
      SELECT DISTINCT ON (session_id) session_id, message
      FROM ${CHAT_HISTORY_TABLE}
      ORDER BY session_id, created_at DESC
    ),
    last_contact_msg AS (
      SELECT DISTINCT ON (session_id) session_id, created_at AS last_contact_at
      FROM ${CHAT_HISTORY_TABLE}
      WHERE COALESCE(message->>'type', message->'data'->>'type') = 'human'
      ORDER BY session_id, created_at DESC
    )
    SELECT
      c.session_id,
      c.total,
      c.last_at,
      l.message AS last_message,
      lc.last_contact_at
    FROM counts c
    JOIN last_msg l ON l.session_id = c.session_id
    LEFT JOIN last_contact_msg lc ON lc.session_id = c.session_id
    ORDER BY c.last_at DESC
  `);

  const chats = rows.map((row) => {
    const parsed = parseChatMessage(row.last_message);
    const lastContactAt = row.last_contact_at
      ? new Date(row.last_contact_at).toISOString()
      : null;
    const serviceWindow = getServiceWindow(lastContactAt);

    return {
      sessionId: row.session_id as string,
      total: row.total as number,
      lastAt: row.last_at as Date,
      lastMessage: parsed.text,
      lastRole: parsed.role,
      lastContactAt,
      windowOpen: serviceWindow.open,
      windowExpiresAt: serviceWindow.expiresAt,
    };
  });

  return NextResponse.json({ chats });
}
