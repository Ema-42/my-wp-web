import { pool, CHAT_HISTORY_TABLE } from "@/lib/db";
import { getServiceWindow, type ServiceWindow } from "@/lib/window";

/**
 * Looks up the last message that came FROM the contact (not the bot) for a
 * session, since that's the only thing that opens/resets WhatsApp's 24h
 * customer service window.
 */
export async function getSessionServiceWindow(
  sessionId: string
): Promise<ServiceWindow> {
  const { rows } = await pool.query(
    `SELECT created_at
     FROM ${CHAT_HISTORY_TABLE}
     WHERE session_id = $1
       AND COALESCE(message->>'type', message->'data'->>'type') = 'human'
     ORDER BY created_at DESC
     LIMIT 1`,
    [sessionId]
  );

  const lastContactAt = rows[0]
    ? new Date(rows[0].created_at).toISOString()
    : null;

  return getServiceWindow(lastContactAt);
}
