import { User, getUserAvatar } from "@/lib/storage";

interface UserAvatarProps {
  user?: User | null;
  name?: string;
  emoji?: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = { xs: "w-6 h-6 text-xs", sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base", lg: "w-14 h-14 text-2xl", xl: "w-20 h-20 text-4xl" };

export function UserAvatar({ user, name, emoji, color, size = "sm", className = "" }: UserAvatarProps) {
  const av = user ? getUserAvatar(user) : { emoji: emoji || "🌸", color: color || "#7c3aed" };
  const displayEmoji = av.emoji;
  const displayColor = av.color;
  const displayName = user?.name || name || "?";

  return (
    <div
      className={`${SIZES[size]} rounded-full flex items-center justify-center font-bold shrink-0 border-2 ${className}`}
      style={{ background: displayColor + "33", borderColor: displayColor + "66", boxShadow: `0 0 12px ${displayColor}44` }}
      title={displayName}
    >
      {displayEmoji || displayName.charAt(0).toUpperCase()}
    </div>
  );
}
