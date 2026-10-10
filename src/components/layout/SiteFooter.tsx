import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { api } from "@/lib/api-client";

export function SiteFooter() {
  const { data: settings } = useQuery<{
    contact_email?: string;
    helpline_phone?: string;
  }>({
    queryKey: ["settings", "public"],
    queryFn: () => api.get("/settings/public"),
    staleTime: 5 * 60 * 1000,
  });

  const phone = settings?.helpline_phone || "+91 99999 88888";
  const email = settings?.contact_email || "support@yfjmatrimony.com";

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            A family-first matrimony service built on verified profiles, respectful introductions
            and complete privacy.
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-gold">
            Your family. Your future. Our priority.
          </p>
        </div>

        <nav aria-label="Company">
          <h2 className="font-display text-lg font-semibold">Company & Policies</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-primary">
                About us
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-primary">
                Membership plans
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact & Support
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-primary">
                Terms &amp; conditions
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-primary">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link to="/community" className="hover:text-primary">
                Community guidelines
              </Link>
            </li>
            <li>
              <Link to="/refund" className="hover:text-primary">
                Refund policy
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-lg font-semibold">Reach us</h2>
          <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{phone}</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{email}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Bhimavaram</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} YFJ Matrimony. All rights reserved.
      </div>
    </footer>
  );
}
