const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Mismos nombres de tabla que DB_CHAT_HISTORY_TABLE / DB_CONTACTS_TABLE en
// lib/db.ts. No se leen de env aquí porque esas vars son server-only (Next.js
// solo expone al navegador las que empiezan con NEXT_PUBLIC_), y este archivo
// corre en el cliente.
const CHAT_HISTORY_TABLE = "n8n_chat_histories";
const CONTACTS_TABLE = "contactos";

/**
 * Pushes chat/contact changes to the browser via Supabase Realtime (reads
 * Postgres' own replication stream — no backend connection to hold open),
 * instead of a classic WebSocket/SSE server. A Postgres LISTEN/NOTIFY + SSE
 * server doesn't survive Vercel's serverless function limits, and Supabase's
 * connection pooler (required for serverless) doesn't support LISTEN at all
 * — so this is the realtime path that actually works for that deployment
 * target once the DB lives on Supabase.
 *
 * No-ops (returns a do-nothing unsubscribe) when the Supabase env vars
 * aren't set, so the app keeps relying on ChatApp's polling until the DB is
 * actually migrated — nothing here changes behavior today.
 */
export function subscribeToRealtimeUpdates(onChange: () => void): () => void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return () => {};
  }

  let cancelled = false;
  let cleanup: (() => void) | null = null;

  import("@supabase/supabase-js")
    .then(({ createClient }) => {
      if (cancelled) return;
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const channel = client
        .channel("chat-updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: CHAT_HISTORY_TABLE },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: CONTACTS_TABLE },
          onChange
        )
        .subscribe();

      cleanup = () => {
        client.removeChannel(channel);
      };
    })
    .catch(() => {
      // Sin @supabase/supabase-js instalado o sin acceso a la red: sigue
      // funcionando por polling, que ya corre en paralelo.
    });

  return () => {
    cancelled = true;
    cleanup?.();
  };
}
