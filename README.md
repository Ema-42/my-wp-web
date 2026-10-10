# my-wp-web — WhatsApp Web propio

Interfaz web estilo WhatsApp Web que da control total sobre los chats de tu número de WhatsApp Business.  
**Motivación:** Meta bloquea el envío de mensajes libres cuando detecta uso automatizado. Esta app te permite leer el historial que genera tu bot n8n y responder manualmente desde el navegador, sin perder el acceso a la API oficial de Meta.

## Cómo funciona

- El bot n8n escribe los mensajes en una base de datos PostgreSQL (memoria de LangChain).
- Esta app lee esa BD y los muestra en una UI tipo WhatsApp Web.
- Puedes responder texto, imágenes y documentos usando los endpoints oficiales de Meta (WhatsApp Cloud API).
- Respeta la ventana de servicio de 24 h de Meta: bloquea el envío si expiró.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL (`pg`)

---

## Base de datos (3 tablas)

Los nombres reales se configuran por `.env` (ver abajo); estos son los que usa esta instancia.

### `n8n_chat_histories` — historial de conversaciones
Tabla que n8n llena automáticamente con la memoria de LangChain. Es la que lee esta app para armar los chats.

| Columna      | Tipo                          | Descripción                                        |
|-------------|-------------------------------|-----------------------------------------------------|
| `id`         | `SERIAL PRIMARY KEY`          | ID interno                                         |
| `session_id` | `TEXT NOT NULL`               | Identificador del contacto (número de teléfono)    |
| `message`    | `JSONB NOT NULL`              | Mensaje en formato LangChain `{type, content, …}`  |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()`   | Fecha/hora del mensaje                             |

### `contactos` — metadata y resumen de contactos
Resumen agregado por contacto (lo usa el bot n8n para contexto, no la UI de chats).

| Columna            | Tipo                          | Descripción                              |
|-------------------|-------------------------------|-------------------------------------------|
| `id`               | `SERIAL PRIMARY KEY`          | ID interno                                |
| `numero`           | `TEXT UNIQUE`                 | Número de teléfono del contacto           |
| `nombre`           | `TEXT`                        | Nombre de perfil de WhatsApp del contacto (`contacts[0].profile.name` del webhook). Si es `NULL`, la UI muestra el número |
| `primer_mensaje`   | `TIMESTAMPTZ`                 | Fecha del primer mensaje del contacto     |
| `ultimo_mensaje`   | `TIMESTAMPTZ`                 | Fecha del último mensaje del contacto     |
| `total_mensajes`   | `INTEGER`                     | Conteo total de mensajes de la sesión     |
| `created_at`       | `TIMESTAMPTZ DEFAULT NOW()`   | Fecha de creación del registro            |
| `ultimo_leido_at`  | `TIMESTAMPTZ`                 | Última vez que un operador abrió este chat en la UI. **No** es el tick de lectura de WhatsApp (eso es entre el bot y el contacto) — es el badge de "no leído" de esta app, y se comparte entre todos los que la usan (no es por navegador) |

`numero UNIQUE`, `nombre` y `ultimo_leido_at` no vienen por defecto — hay que
agregarlas una sola vez con esta migración:

```sql
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS ultimo_leido_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contactos_numero_key'
  ) THEN
    ALTER TABLE contactos ADD CONSTRAINT contactos_numero_key UNIQUE (numero);
  END IF;
END $$;
```

El nombre se mantiene con un upsert desde n8n en cada mensaje entrante:

```sql
INSERT INTO contactos (numero, nombre)
VALUES ($1, $2)
ON CONFLICT (numero)
DO UPDATE SET nombre = COALESCE(EXCLUDED.nombre, contactos.nombre);
```

### `documents_openai` — base vectorial (RAG del bot)
Embeddings que usa el bot n8n para responder con contexto (búsqueda semántica), no para esta UI.

| Columna      | Tipo                          | Descripción                                    |
|-------------|-------------------------------|--------------------------------------------------|
| `id`         | `SERIAL PRIMARY KEY`          | ID interno                                     |
| `content`    | `TEXT`                        | Fragmento de texto indexado                    |
| `metadata`   | `JSONB`                       | Metadata del fragmento (origen, líneas, etc.)  |
| `embedding`  | `VECTOR`                      | Embedding (pgvector) usado para similarity search |

---

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores.

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mi_base_de_datos
DB_USER=mi_usuario
DB_PASSWORD=mi_contraseña

# Nombres de tablas (deben coincidir con los que usa n8n)
DB_CHAT_HISTORY_TABLE=n8n_chat_histories
DB_CONTACTS_TABLE=contactos
DB_DOCUMENTS_TABLE=documents_openai

# WhatsApp Cloud API (Meta)
WHATSAPP_API_VERSION=v19.0
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxx
WHATSAPP_APP_ID=1234567890
WHATSAPP_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890
WHATSAPP_BUSINESS_NUMBER=59170000000
```

| Variable | Qué es | Dónde se obtiene |
|---|---|---|
| `WHATSAPP_API_VERSION` | Versión de la Graph API que usan todas las llamadas (`lib/whatsapp.ts`, `app/api/media/[mediaId]`) | [Changelog de versiones](https://developers.facebook.com/docs/graph-api/changelog) de Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | ID interno del número de WhatsApp Business (no es el número en sí). Se usa para enviar mensajes y subir media | Meta for Developers → tu app → WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Token de autorización (`Bearer`) de un usuario de sistema con permiso `whatsapp_business_messaging`. Es lo único que esta app realmente necesita para enviar mensajes | Meta Business Suite → Usuarios del sistema → Generar token (usar uno **permanente**, no el de prueba de 24 h) |
| `WHATSAPP_APP_ID` | ID de la app de Meta que agrupa el producto de WhatsApp. No lo usa el código de esta app todavía; se guarda aquí porque lo pide n8n/Meta para configurar el webhook y la verificación de firma | Meta for Developers → tu app → Configuración básica |
| `WHATSAPP_APP_SECRET` | Secreto de la app, usado para validar la firma (`X-Hub-Signature-256`) de los webhooks entrantes de Meta. No lo consume esta app todavía (lo valida n8n); **nunca lo expongas en el cliente** | Meta for Developers → tu app → Configuración básica |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ID de la cuenta de WhatsApp Business (WABA) que agrupa uno o más números de teléfono. No lo usa el código de esta app todavía, es informativo/para n8n | Meta for Developers → tu app → WhatsApp → API Setup |
| `WHATSAPP_BUSINESS_NUMBER` | El número de teléfono real (con código de país, sin `+`) asociado al `WHATSAPP_PHONE_NUMBER_ID`. Solo informativo, para identificar la cuenta de un vistazo | Meta for Developers → tu app → WhatsApp → API Setup |

### Opcional: Supabase Realtime (reemplaza el polling)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Sin estas variables, la app sigue funcionando exactamente igual (polling cada
3-5 s). Ver la sección **Tiempo real** más abajo.

---

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # completar con tus valores
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Estructura

```
app/
  api/
    chats/          GET  — lista de conversaciones (nombre, no leídos, ventana)
    chats/[sessionId]/read/  POST — marca un chat como leído por el operador
    messages/       GET  — mensajes de una sesión | POST  — enviar texto
    documents/      POST — enviar imagen o documento
    audio/          POST — enviar nota de voz (ver abajo)
    media/[id]/     GET  — proxy de media de Meta (imágenes/docs/audio recibidos)
  layout.tsx
  page.tsx
components/
  chat/             UI: sidebar, ventana de chat, burbujas, avatar, temas
                    useVoiceRecorder.ts — hook de grabación de notas de voz
lib/
  db.ts             Conexión PostgreSQL + nombres de tabla
  types.ts          Tipos compartidos
  chat-message.ts   Parser del formato LangChain
  whatsapp.ts       Llamadas a la API de Meta
  service-window.ts Lógica de ventana de 24 h
  window.ts         Helpers de ventana de servicio
  realtime.ts        Supabase Realtime opcional (ver abajo)
public/
  opus/             encoderWorker.min.js de opus-recorder (grabación a Ogg/Opus)
```

## Notas de voz

Hay botón de micrófono junto al input: un clic empieza a grabar, otro clic la
detiene y muestra un reproductor para escucharla antes de decidir enviarla o
descartarla — igual que WhatsApp Web.

WhatsApp solo muestra la burbuja nativa de nota de voz si el archivo es
**.ogg con codec Opus**; el `MediaRecorder` nativo del navegador solo graba en
WebM/Opus, que Meta rechaza. Por eso se usa
[`opus-recorder`](https://github.com/chris-rudmin/opus-recorder) (WASM), que
graba directo a Ogg/Opus en el navegador sin backend de conversión. Su worker
(`encoderWorker.min.js`) vive en `public/opus/` y debe mantenerse en el repo.

El endpoint `POST /api/audio` sube el archivo a Meta (`/media`), lo envía con
`type: audio` (sin caption — Meta no lo soporta en audios) y lo guarda en
`n8n_chat_histories`. Límite: 16 MB (el de Meta para audio).

## Tiempo real (Supabase Realtime)

Por defecto la app refresca por polling (`setInterval`, cada 3-5 s — ver
`ChatApp.tsx`). Un servidor propio de WebSocket/SSE con `LISTEN/NOTIFY` de
Postgres no es viable para este proyecto porque:
- **Vercel** corta las funciones serverless tras su límite de duración; una
  conexión SSE que debe durar lo que dura la pestaña del navegador no
  sobrevive.
- El *connection pooler* de **Supabase** (obligatorio para conexiones desde
  serverless) no soporta `LISTEN/NOTIFY` — es una limitación de PgBouncer en
  modo transacción, no de Supabase en particular.

Por eso `lib/realtime.ts` usa en cambio **Supabase Realtime**: lee los
cambios directo de la replicación de Postgres y los empuja por WebSocket al
navegador, sin que este backend tenga que mantener ninguna conexión abierta.

**Para activarlo una vez migres la BD a Supabase:**
1. En el dashboard de Supabase → *Database* → *Replication*, activa Realtime
   para las tablas `n8n_chat_histories` y `contactos`.
2. Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ver
   sección de variables de entorno).
3. Listo — `ChatApp.tsx` detecta esas variables y empieza a refrescar al
   instante en vez de esperar al próximo tick del polling. El polling
   **no se quita**, queda como red de seguridad por si el canal de Realtime
   se corta.

Sin esas dos variables (tu situación actual, con Postgres propio), nada
cambia: sigue funcionando por polling exactamente como ahora.
