import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import logoUrl from "@/assets/logo.png";

export function AuthLayout({
  children,
  title,
  subtitle,
  showLogo = true,
  backTo,
}: {
  children: ReactNode;
  title?: string | undefined;
  subtitle?: string | undefined;
  showLogo?: boolean | undefined;
  backTo?: string | undefined;
}) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#FFF9F8] overflow-hidden">
      {/* Decorative floral leaf corners as in Screen 1 */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-300 via-rose-100 to-transparent blur-sm" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 w-48 h-48 opacity-25 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-300 via-rose-100 to-transparent blur-sm" />

      {/* Top Header Row */}
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-6 pt-6 z-10">
        {backTo ? (
          <Link
            to={backTo}
            aria-label="Go back"
            className="grid size-10 place-items-center rounded-full border border-border bg-white shadow-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
        ) : (
          <div className="size-10" />
        )}
        <Link
          to="/"
          className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          Back to website
        </Link>
      </div>

      {/* Main Form Box */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-6 z-10">
        {showLogo ? (
          <div className="flex flex-col items-center text-center mb-6">
            <Link to="/" aria-label="YFJ Matrimony home">
              <img
                src={logoUrl}
                alt="YFJ Matrimony — Your Family. Your Future. Our Priority."
                className="w-52 sm:w-60 max-w-full h-auto object-contain drop-shadow-xs"
              />
            </Link>
          </div>
        ) : null}

        {title ? (
          <div className="text-center mb-6">
            <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        ) : null}

        <div>{children}</div>
      </div>

      {/* Bottom spacer / Safe area */}
      <div className="h-6" />
    </div>
  );
}
