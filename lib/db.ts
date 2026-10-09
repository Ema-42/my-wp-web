import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export const pool =
  global._pgPool ??
  new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

/**
 * Table names come from .env so they can be renamed without touching code.
 * Validated against a strict identifier pattern (no quoting needed) since
 * pg can't bind identifiers as query parameters.
 */
function sqlIdentifier(value: string | undefined, envVar: string): string {
  const name = value?.trim();
  if (!name) {
    throw new Error(`Falta la variable de entorno ${envVar}`);
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`${envVar}="${name}" no es un nombre de tabla válido`);
  }
  return name;
}

export const CHAT_HISTORY_TABLE = sqlIdentifier(
  process.env.DB_CHAT_HISTORY_TABLE,
  "DB_CHAT_HISTORY_TABLE"
);

export const CONTACTS_TABLE = sqlIdentifier(
  process.env.DB_CONTACTS_TABLE,
  "DB_CONTACTS_TABLE"
);

export const DOCUMENTS_TABLE = sqlIdentifier(
  process.env.DB_DOCUMENTS_TABLE,
  "DB_DOCUMENTS_TABLE"
);
