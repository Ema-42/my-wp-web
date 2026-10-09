import { NextRequest, NextResponse } from "next/server";

const API_VERSION = process.env.WHATSAPP_API_VERSION;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// Validates that the mediaId is a safe numeric/alphanumeric string from Meta.
function isValidMediaId(id: string): boolean {
  return /^\d+$/.test(id);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;

  if (!API_VERSION || !ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Faltan variables de entorno de WhatsApp" },
      { status: 500 }
    );
  }

  if (!isValidMediaId(mediaId)) {
    return NextResponse.json({ error: "mediaId inválido" }, { status: 400 });
  }

  // Step 1: Ask Meta for the download URL of this media object.
  const metaRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${mediaId}`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );

  if (!metaRes.ok) {
    return NextResponse.json(
      { error: "No se pudo obtener la URL del media en Meta" },
      { status: 502 }
    );
  }

  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };

  if (!meta.url) {
    return NextResponse.json(
      { error: "Meta no devolvió URL para este media" },
      { status: 502 }
    );
  }

  // Step 2: Fetch the actual binary using the Bearer token.
  const binaryRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });

  if (!binaryRes.ok) {
    return NextResponse.json(
      { error: "No se pudo descargar el archivo de Meta" },
      { status: 502 }
    );
  }

  const buffer = await binaryRes.arrayBuffer();
  const contentType = meta.mime_type ?? "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      // Cache for 20 minutes — Meta media URLs last ~5 min but the binary
      // itself is stable for 30 days via the mediaId proxy above.
      "Cache-Control": "private, max-age=1200",
    },
  });
}
