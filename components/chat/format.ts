const BOLIVIA_TZ = "America/La_Paz";

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BOLIVIA_TZ,
  });
}

export function formatListTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.toLocaleDateString("en-CA", { timeZone: BOLIVIA_TZ }) ===
    now.toLocaleDateString("en-CA", { timeZone: BOLIVIA_TZ });

  if (sameDay) {
    return formatTime(iso);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.toLocaleDateString("en-CA", { timeZone: BOLIVIA_TZ }) ===
    yesterday.toLocaleDateString("en-CA", { timeZone: BOLIVIA_TZ });

  if (isYesterday) {
    return "ayer";
  }

  return date.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BOLIVIA_TZ,
  });
}

export function initialsFromNumber(sessionId: string): string {
  const digits = sessionId.replace(/\D/g, "");
  return digits.slice(-2) || "??";
}

export function formatRemaining(expiresAtIso: string): string {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  if (diffMs <= 0) return "vencida";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
