const API_VERSION = process.env.WHATSAPP_API_VERSION;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

type SendTextResult = {
  messages?: { id: string }[];
};

/**
 * POST /{Phone-Number-ID}/messages — Send Text Message
 * https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */
export async function sendWhatsAppText(
  to: string,
  body: string
): Promise<SendTextResult> {
  if (!API_VERSION || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error("Faltan variables de entorno de WhatsApp (.env)");
  }

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data?.error?.message as string | undefined) ??
      "Error enviando el mensaje de WhatsApp";
    throw new Error(message);
  }

  return data as SendTextResult;
}

/**
 * POST /{Phone-Number-ID}/media — Upload Media
 * Uploads a binary file and returns Meta's internal media id, which is
 * then referenced (not re-uploaded) by the "Send Document" call below.
 */
export async function uploadWhatsAppMedia(
  file: Blob,
  filename: string
): Promise<string> {
  if (!API_VERSION || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error("Faltan variables de entorno de WhatsApp (.env)");
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", file, filename);

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: form,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data?.error?.message as string | undefined) ??
      "Error subiendo el archivo a WhatsApp";
    throw new Error(message);
  }

  return data.id as string;
}

type SendMediaResult = {
  messages?: { id: string }[];
};

/**
 * GET /{media-id} + descarga del binario — dos pasos que exige la Cloud API
 * para leer cualquier media (imagen/audio/documento/sticker) que mandaron o
 * que mandamos. Compartido por el proxy /api/media/[mediaId] y por el
 * guardado de stickers en /api/stickers.
 */
export async function downloadWhatsAppMedia(
  mediaId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!API_VERSION || !ACCESS_TOKEN) {
    throw new Error("Faltan variables de entorno de WhatsApp (.env)");
  }

  const metaRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!metaRes.ok) {
    throw new Error("No se pudo obtener la URL del media en Meta");
  }

  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) {
    throw new Error("Meta no devolvió URL para este media");
  }

  const binaryRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!binaryRes.ok) {
    throw new Error("No se pudo descargar el archivo de Meta");
  }

  const buffer = Buffer.from(await binaryRes.arrayBuffer());
  const mimeType = meta.mime_type ?? "application/octet-stream";
  return { buffer, mimeType };
}

/**
 * POST /{Phone-Number-ID}/messages — Send Document Message by ID
 */
export async function sendWhatsAppDocument(
  to: string,
  mediaId: string,
  filename: string,
  caption?: string
): Promise<SendMediaResult> {
  if (!API_VERSION || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error("Faltan variables de entorno de WhatsApp (.env)");
  }

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "document",
        document: {
          id: mediaId,
          filename,
          ...(caption ? { caption } : {}),
        },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data?.error?.message as string | undefined) ??
      "Error enviando el documento de WhatsApp";
    throw new Error(message);
  }

  return data as SendMediaResult;
}

/**
 * POST /{Phone-Number-ID}/messages — Send Audio Message by ID
 * Meta renders this as a native voice-note bubble only when the uploaded
 * media is an .ogg file using the Opus codec; captions are not supported.
 */
export async function sendWhatsAppAudio(
  to: string,
  mediaId: string
): Promise<SendMediaResult> {
  if (!API_VERSION || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error("Faltan variables de entorno de WhatsApp (.env)");
  }

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "audio",
        audio: { id: mediaId },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data?.error?.message as string | undefined) ??
      "Error enviando la nota de voz de WhatsApp";
    throw new Error(message);
  }

  return data as SendMediaResult;
}

/**
 * POST /{Phone-Number-ID}/messages — Send Image Message by ID
 * The image renders inline in the recipient's chat (not as a download).
 */
export async function sendWhatsAppImage(
  to: string,
  mediaId: string,
  caption?: string
): Promise<SendMediaResult> {
  if (!API_VERSION || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error("Faltan variables de entorno de WhatsApp (.env)");
  }

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "image",
        image: {
          id: mediaId,
          ...(caption ? { caption } : {}),
        },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data?.error?.message as string | undefined) ??
      "Error enviando la imagen de WhatsApp";
    throw new Error(message);
  }

  return data as SendMediaResult;
}

/**
 * POST /{Phone-Number-ID}/messages — Send Sticker Message by ID
 * WhatsApp no soporta caption en stickers. El mediaId debe venir de un
 * upload reciente (ver uploadWhatsAppMedia) — los media id de Meta vencen,
 * así que para stickers guardados siempre se resube el archivo primero.
 */
export async function sendWhatsAppSticker(
  to: string,
  mediaId: string
): Promise<SendMediaResult> {
  if (!API_VERSION || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error("Faltan variables de entorno de WhatsApp (.env)");
  }

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "sticker",
        sticker: { id: mediaId },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data?.error?.message as string | undefined) ??
      "Error enviando el sticker de WhatsApp";
    throw new Error(message);
  }

  return data as SendMediaResult;
}
