const AVATAR_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#ec4899",
  "#3b82f6",
  "#f97316",
  "#14b8a6",
  "#a855f7",
  "#d946ef",
  "#84cc16",
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type Props = {
  seed: string;
  size?: number;
  className?: string;
};

export function UserAvatar({ seed, size = 40, className = "" }: Props) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, backgroundColor: avatarColor(seed) }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="white"
        style={{ width: size * 0.55, height: size * 0.55 }}
      >
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2.5c-3.34 0-10 1.68-10 5V22h20v-2.5c0-3.32-6.66-5-10-5z" />
      </svg>
    </div>
  );
}
