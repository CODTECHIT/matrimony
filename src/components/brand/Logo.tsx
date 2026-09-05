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
  xs: "h-9 w-9",
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
}: LogoProps & { size?: "xs" | "sm" | "md" | "lg" | "xl" }) {
  const content = (
    <span className={cn("inline-flex items-center gap-1.5 sm:gap-3 min-w-0", className)}>
      <img
        src={logoUrl}
        alt="YFJ Matrimony"
        width={160}
        height={160}
        className={cn("object-contain shrink-0 drop-shadow-xs", sizes[size])}
      />
      {variant === "full" && showText ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              "font-display font-bold tracking-[0.16em] text-primary truncate",
              size === "xs" ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl",
            )}
          >
            YFJ
          </span>
          <span
            className={cn(
              "font-semibold uppercase tracking-[0.24em] text-gold truncate",
              size === "xs" ? "text-[0.6rem] sm:text-[0.68rem]" : "text-[0.7rem] sm:text-[0.8rem]",
            )}
          >
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
