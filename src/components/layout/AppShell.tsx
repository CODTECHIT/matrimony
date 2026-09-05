import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Crown,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  User,
  Send,
  Inbox,
  HelpCircle,
  Share2,
  ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const bottomNav = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/browse", label: "Matches", icon: Heart, exact: false },
  { to: "/app/messages", label: "Messages", icon: MessageCircle, exact: false },
  { to: "/app/upgrade", label: "Premium", icon: Crown, exact: false },
  { to: "/app/my-profile", label: "Profile", icon: User, exact: false },
] as const;

const sideNav = [
  { to: "/app", label: "Dashboard", icon: Home, exact: true },
  { to: "/app/browse", label: "Browse profiles", icon: Search, exact: false },
  { to: "/app/shortlist", label: "Shortlisted", icon: Heart, exact: false },
  { to: "/app/interests/sent", label: "Interests sent", icon: Send, exact: false },
  { to: "/app/interests/received", label: "Interests received", icon: Inbox, exact: false },
  { to: "/app/messages", label: "Messages", icon: MessageCircle, exact: false },
  { to: "/app/subscription", label: "Membership", icon: Crown, exact: false },
  { to: "/app/my-profile", label: "My profile", icon: User, exact: false },
  { to: "/app/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isProfileDetails = pathname.startsWith("/app/profiles/");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = (user?.fullName ?? "YFJ")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  const handleLogout = async () => {
    setDrawerOpen(false);
    await signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md",
          isProfileDetails && "hidden lg:block",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Trigger matching Screen 2 */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 text-left focus:outline-none md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Avatar className="size-10 border border-border shadow-xs">
                    {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <span className="flex items-center gap-1 text-sm font-bold text-foreground">
                      <span>{user?.fullName?.split(" ")[0] ?? "Welcome"}</span>
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-[0.68rem] text-muted-foreground">Find your match</span>
                  </div>
                </button>
              </SheetTrigger>

              {/* Side Drawer Content matching Screen 2 */}
              <SheetContent side="left" className="w-80 p-0 sm:max-w-xs">
                <div className="p-6 border-b border-border/80">
                  <div className="flex items-center gap-3.5">
                    <Avatar className="size-14 border-2 border-primary/20 shadow-sm">
                      {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="bg-primary-soft text-base font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-bold truncate text-foreground">
                        {user?.fullName ?? "Member"}
                      </h3>
                      <Link
                        to="/app/my-profile"
                        onClick={() => setDrawerOpen(false)}
                        className="text-xs font-semibold text-[#D92662] hover:underline inline-block mt-0.5"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>

                <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
                  <Link
                    to="/app/my-profile"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <User className="size-5 text-muted-foreground" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/app/browse"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Heart className="size-5 text-muted-foreground" />
                    <span>My Matches</span>
                  </Link>

                  <Link
                    to="/app/messages"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <MessageCircle className="size-5 text-muted-foreground" />
                    <span>Messages</span>
                  </Link>

                  <Link
                    to="/app/upgrade"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Crown className="size-5 text-[#C59B27]" />
                    <span>Premium Membership</span>
                  </Link>

                  <Link
                    to="/app/interests/received"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Heart className="size-5 text-[#D92662]" />
                    <span>My Interests</span>
                  </Link>

                  <Link
                    to="/app/settings"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="size-5 text-muted-foreground" />
                    <span>Settings</span>
                  </Link>

                  <Link
                    to="/contact"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <HelpCircle className="size-5 text-muted-foreground" />
                    <span>Help & Support</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      navigator.clipboard?.writeText?.(window.location.origin);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Share2 className="size-5 text-muted-foreground" />
                    <span>Invite & Earn</span>
                  </button>

                  <div className="pt-2 border-t border-border/80">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut className="size-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* Desktop Brand Logo */}
            <div className="hidden md:flex items-center gap-3">
              <Logo linkTo="/app" />
              <div className="hidden border-l border-border pl-3 md:block">
                <p className="truncate text-xs text-muted-foreground">Welcome back</p>
                <p className="truncate text-sm font-semibold">{user?.fullName ?? "Guest"}</p>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="Search profiles">
              <Link to="/app/search">
                <Search className="size-5" />
              </Link>
            </Button>
            {/* Bell with red dot notification badge matching Screen 9 */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative"
            >
              <Link to="/app/interests/received">
                <Bell className="size-5" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-[#D92662] ring-2 ring-background" />
              </Link>
            </Button>
            <Link to="/app/my-profile" aria-label="My profile" className="hidden md:block">
              <Avatar className="size-9 border border-border">
                {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop Main Content Layout */}
      <div
        className={cn(
          "mx-auto flex max-w-7xl gap-8 px-4 pt-6 sm:px-6 lg:pb-10",
          isProfileDetails ? "pb-6" : "pb-28",
        )}
      >
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1" aria-label="Member">
            {sideNav.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                activeProps={{ className: "bg-primary-soft text-primary font-semibold" }}
                inactiveProps={{ className: "text-muted-foreground hover:bg-muted" }}
                className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors"
              >
                <Icon className="size-5 shrink-0" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <LogOut className="size-5 shrink-0" />
              Logout
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Fixed Bottom Tab Navigation matching Screen 9 */}
      {!isProfileDetails ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/95 backdrop-blur-md lg:hidden shadow-lg shadow-black/5"
          aria-label="Bottom Navigation"
        >
          <ul className="mx-auto grid max-w-lg grid-cols-5 py-1">
            {bottomNav.map(({ to, label, icon: Icon, exact }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact }}
                  activeProps={{ className: "text-[#D92662]" }}
                  inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                  className="flex flex-col items-center gap-1 py-2 text-[0.7rem] font-semibold transition-colors"
                >
                  <Icon className="size-5" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
