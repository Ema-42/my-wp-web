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
