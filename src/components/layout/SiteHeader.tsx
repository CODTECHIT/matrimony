import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, ShieldCheck, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  const isAuthenticated = status === "authenticated";
  const initials = (user?.fullName ?? "YFJ")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    void navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-background/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <Logo linkTo={isAuthenticated ? "/app" : "/"} />

        {/* Desktop Navigation Links (Always visible) */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                activeProps={{ className: "text-primary font-semibold" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:text-primary hover:bg-muted/50"
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <Link
                to="/app/browse"
                activeProps={{ className: "text-primary font-semibold" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:text-primary hover:bg-muted/50"
              >
                Browse Matches
              </Link>
            ) : null}
          </nav>

          {/* Right Actions: Authenticated vs Unauthenticated */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                asChild
                size="sm"
                className="hidden sm:inline-flex rounded-full bg-gradient-to-r from-primary to-amber-600 hover:opacity-95 text-white font-semibold shadow-xs"
              >
                <Link to="/app">Dashboard</Link>
              </Button>

              {user?.role === "admin" ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex rounded-full border-amber-500/40 text-amber-700 dark:text-amber-300"
                >
                  <Link to="/admin/matrimony">
                    <ShieldCheck className="mr-1.5 size-3.5" /> Admin
                  </Link>
                </Button>
              ) : null}

              <Link
                to="/app/my-profile"
                className="flex items-center gap-2 rounded-full border border-amber-400/40 p-0.5 hover:border-amber-400/80 transition-colors"
                title="My Profile"
              >
                <Avatar className="size-8">
                  {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="hidden sm:inline-flex items-center text-xs font-medium text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex rounded-full font-semibold"
              >
                <Link to="/login">Login</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-xs"
              >
                <Link to="/register">Register free</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Dropdown Nav */}
      {open ? (
        <nav
          className="border-t border-border bg-card px-4 py-3 md:hidden space-y-1"
          aria-label="Mobile"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <div className="pt-2 border-t border-border/80 space-y-1">
              <Link
                to="/app"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3.5 py-2.5 text-sm font-semibold text-primary hover:bg-muted"
              >
                Dashboard
              </Link>
              <Link
                to="/app/browse"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Browse Matches
              </Link>
              <Link
                to="/app/my-profile"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                My Profile
              </Link>
              {user?.role === "admin" ? (
                <Link
                  to="/admin/matrimony"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-amber-600 hover:bg-muted"
                >
                  Admin Portal
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full text-left rounded-xl px-3.5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-border/80 space-y-1">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3.5 py-2.5 text-sm font-semibold text-primary hover:bg-muted"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3.5 py-2.5 text-sm font-semibold text-amber-600 hover:bg-muted"
              >
                Register free
              </Link>
            </div>
          )}
        </nav>
      ) : null}
    </header>
  );
}
