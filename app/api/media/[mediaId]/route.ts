import { NextRequest, NextResponse } from "next/server";
import { downloadWhatsAppMedia } from "@/lib/whatsapp";

// Validates that the mediaId is a safe numeric/alphanumeric string from Meta.
function isValidMediaId(id: string): boolean {
  return /^\d+$/.test(id);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;

  if (!isValidMediaId(mediaId)) {
    return NextResponse.json({ error: "mediaId inválido" }, { status: 400 });
  }

  let buffer: Buffer;
  let mimeType: string;
  try {
    ({ buffer, mimeType } = await downloadWhatsAppMedia(mediaId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      // Cache for 20 minutes — Meta media URLs last ~5 min but the binary
      // itself is stable for 30 days via the mediaId proxy above.
      "Cache-Control": "private, max-age=1200",
    },
  });
}
