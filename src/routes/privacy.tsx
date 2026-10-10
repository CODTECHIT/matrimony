import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LegalPage } from "@/components/layout/PublicLayout";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — YFJ Matrimony" },
      {
        name: "description",
        content:
          "How YFJ Matrimony collects, stores, shares and protects your personal and family information.",
      },
      { property: "og:title", content: "Privacy Policy — YFJ Matrimony" },
      { property: "og:description", content: "How we collect, store and protect your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { data } = useQuery<{ key: string; title: string; content: { body?: string; lastUpdated?: string }; updated_at: string }>({
    queryKey: ["cms-content", "privacy"],
    queryFn: () => api.get("/content/privacy"),
    staleTime: 60 * 1000,
  });

  const customBody = data?.content?.body;
  const pageTitle = data?.title || "Privacy Policy";
  const updatedDate = data?.updated_at
    ? new Date(data.updated_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "1 September 2026";

  return (
    <LegalPage title={pageTitle} updated={updatedDate}>
      {customBody ? (
        <div className="space-y-4 whitespace-pre-wrap leading-relaxed text-sm text-foreground/90 bg-card p-6 rounded-2xl border border-border shadow-xs">
          {customBody}
        </div>
      ) : (
        <>
          <section>
            <h2>Information we collect</h2>
            <p>
              We collect the profile details you provide (personal, educational, professional, community
              and family information), the photographs you upload, and technical data such as device
              type and approximate location used to secure your account.
            </p>
          </section>
          <section>
            <h2>How your profile is shown</h2>
            <p>
              Your profile is visible to logged-in members who match your preferences. Your mobile
              number and WhatsApp details are never displayed by default; they are released only when
              your plan permits it and you have accepted the connection.
            </p>
          </section>
          <section>
            <h2>Payments</h2>
            <p>
              Payments are processed by a PCI-DSS compliant payment gateway. We never store your card
              number, CVV or UPI credentials on our servers.
            </p>
          </section>
          <section>
            <h2>Data retention and deletion</h2>
            <p>
              You may hide or delete your profile at any time from Account Settings. On deletion we
              remove your profile and photographs within 30 days, retaining only records required by
              law.
            </p>
          </section>
          <section>
            <h2>Your rights</h2>
            <p>
              You can request a copy of your data, correct inaccurate information, or withdraw consent
              for optional processing by writing to care@yfjmatrimony.com.
            </p>
          </section>
        </>
      )}
    </LegalPage>
  );
}
