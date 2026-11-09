// Fondo tipo "doodle" del área de chat, como WhatsApp real: un SVG chico
// con íconos sueltos (teléfono, nota, corazón, estrella, etc.) repetido en
// mosaico a muy baja opacidad sobre el color sólido de fondo. El color de
// línea se recibe como parámetro para poder usar uno tenue en modo claro y
// otro en modo oscuro con el mismo dibujo.

const PATTERN_SIZE = 260;

function buildPatternSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PATTERN_SIZE}" height="${PATTERN_SIZE}" viewBox="0 0 ${PATTERN_SIZE} ${PATTERN_SIZE}">
<g fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(18,18)">
    <rect x="0" y="0" width="16" height="26" rx="3"/>
    <line x1="4" y1="22" x2="12" y2="22"/>
  </g>
  <g transform="translate(92,12)">
    <circle cx="3" cy="20" r="3"/>
    <circle cx="16" cy="17" r="3"/>
    <line x1="6" y1="20" x2="6" y2="4"/>
    <line x1="19" y1="17" x2="19" y2="1"/>
    <path d="M6 4 L19 1"/>
  </g>
  <g transform="translate(160,22)">
    <path d="M10 20 C-3 9 2 -3 10 4 C18 -3 23 9 10 20 Z"/>
  </g>
  <g transform="translate(220,14)">
    <path d="M9 0 L11 6 L18 6 L12.5 10 L14.5 17 L9 13 L3.5 17 L5.5 10 L0 6 L7 6 Z"/>
  </g>
  <g transform="translate(24,84)">
    <path d="M4 18 a6 6 0 0 1 0-12 a8 8 0 0 1 15-3 a6 6 0 0 1 2 15 Z"/>
  </g>
  <g transform="translate(106,74)">
    <path d="M0 10 L24 0 L14 24 L10 14 Z"/>
    <line x1="10" y1="14" x2="24" y2="0"/>
  </g>
  <g transform="translate(184,84)">
    <rect x="0" y="6" width="22" height="16" rx="2"/>
    <rect x="7" y="0" width="8" height="6" rx="1"/>
    <circle cx="11" cy="14" r="4.5"/>
  </g>
  <g transform="translate(14,154)">
    <circle cx="11" cy="11" r="11"/>
    <line x1="11" y1="11" x2="11" y2="4"/>
    <line x1="11" y1="11" x2="16" y2="14"/>
  </g>
  <g transform="translate(94,144)">
    <rect x="0" y="0" width="24" height="17" rx="2"/>
    <path d="M0 2 L12 11 L24 2"/>
  </g>
  <g transform="translate(176,154)">
    <circle cx="9" cy="9" r="8"/>
    <line x1="15" y1="15" x2="21" y2="21"/>
  </g>
  <g transform="translate(226,134)">
    <path d="M6 0 C10 8 12 12 6 16 C0 12 2 8 6 0 Z"/>
  </g>
  <g transform="translate(44,214)">
    <path d="M0 18 C0 4 16 0 20 0 C20 14 8 18 0 18 Z"/>
    <line x1="2" y1="16" x2="16" y2="2"/>
  </g>
  <g transform="translate(126,212)">
    <rect x="5" y="0" width="8" height="14" rx="4"/>
    <path d="M0 10 a9 9 0 0 0 18 0"/>
    <line x1="9" y1="19" x2="9" y2="24"/>
    <line x1="4" y1="24" x2="14" y2="24"/>
  </g>
  <g transform="translate(204,222)">
    <path d="M0 4 a4 4 0 0 1 4-4 h16 a4 4 0 0 1 4 4 v10 a4 4 0 0 1-4 4 h-10 l-6 5 v-5 a4 4 0 0 1-4-4 Z"/>
  </g>
</g>
</svg>`;
}

export const CHAT_PATTERN_LINE_LIGHT = "rgba(0,0,0,0.055)";
export const CHAT_PATTERN_LINE_DARK = "rgba(255,255,255,0.05)";
export const CHAT_PATTERN_SIZE_CSS = `${PATTERN_SIZE}px ${PATTERN_SIZE}px`;

export function getChatPatternDataUri(color: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(buildPatternSvg(color))}")`;
}
