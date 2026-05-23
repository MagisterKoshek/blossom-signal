import { useState } from "react";

interface StarRatingProps {
  rating?: number;
  max?: number;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
  onChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({ rating = 0, max = 5, interactive = false, size = "sm", onChange, className = "" }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const sizes = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };

  return (
    <span className={`inline-flex gap-0.5 ${sizes[size]} ${className}`}>
      {Array.from({ length: max }).map((_, i) => {
        const val = i + 1;
        const filled = val <= (hover || rating);
        return (
          <span key={i}
            className={`transition-transform ${interactive ? "cursor-pointer hover:scale-125" : ""} ${filled ? "text-yellow-400" : "text-muted-foreground/30"}`}
            onMouseEnter={() => interactive && setHover(val)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange?.(val)}
          >★</span>
        );
      })}
    </span>
  );
}
