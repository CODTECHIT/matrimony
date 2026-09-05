import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** "mark" shows only the emblem, "full" adds the wordmark. */
  variant?: "mark" | "full";
  size?: "sm" | "md" | "lg" | "xl";
  linkTo?: string;
  showText?: boolean;
}

const sizes = {
  sm: "h-12 w-12",
  md: "h-16 w-16 sm:h-20 sm:w-20",
  lg: "h-24 w-24 sm:h-28 sm:w-28",
  xl: "h-32 w-32 sm:h-36 sm:w-36",
} as const;

export function Logo({
  className,
  variant = "full",
  size = "md",
  linkTo = "/",
  showText = true,
}: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={logoUrl}
        alt="YFJ Matrimony"
        width={160}
        height={160}
        className={cn("object-contain shrink-0 drop-shadow-sm", sizes[size])}
      />
      {variant === "full" && showText ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="font-display text-2xl sm:text-3xl font-bold tracking-[0.16em] text-primary">
            YFJ
          </span>
          <span className="text-[0.7rem] sm:text-[0.8rem] font-semibold uppercase tracking-[0.26em] text-gold">
            Matrimony
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!linkTo) return content;
  return (
    <Link
      to={linkTo}
      className="shrink-0 transition-opacity hover:opacity-95"
      aria-label="YFJ Matrimony home"
    >
      {content}
    </Link>
  );
}
