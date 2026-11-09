import { ChatApp } from "@/components/chat/ChatApp";

export default function Home() {
  // WHATSAPP_BUSINESS_NUMBER es server-only (sin prefijo NEXT_PUBLIC_); se
  // lee acá en el Server Component y se pasa como prop simple, en vez de
  // duplicarla con un NEXT_PUBLIC_ nuevo en .env.
  const businessNumber = process.env.WHATSAPP_BUSINESS_NUMBER ?? null;

  return (
    <div className="h-dvh w-full overflow-clip bg-[#f0f2f5]">
      <ChatApp businessNumber={businessNumber} />
    </div>
  );
}
