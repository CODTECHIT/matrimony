import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LegalPage } from "@/components/layout/PublicLayout";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Guidelines & Safety Tips — YFJ Matrimony" },
      {
        name: "description",
        content:
          "Official community standards, etiquette, and safety guidelines for interacting on YFJ Matrimony.",
      },
      { property: "og:title", content: "Community Guidelines & Safety Tips" },
      {
        property: "og:description",
        content: "Our shared standards for a respectful and safe matrimonial community.",
      },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const { data } = useQuery<{
    key: string;
    title: string;
    content: { body?: string; lastUpdated?: string };
    updated_at: string;
  }>({
    queryKey: ["cms-content", "community"],
    queryFn: () => api.get("/content/community"),
    staleTime: 60 * 1000,
  });

  const customBody = data?.content?.body;
  const pageTitle = data?.title || "Community Guidelines & Safety Tips";
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
            <h2>1. Respectful Communication</h2>
            <p>
              Treat every member and their family with respect, courtesy, and integrity. Abusive
              language, unsolicited harassment, or inappropriate requests will result in an immediate
              account ban.
            </p>
          </section>
          <section>
            <h2>2. Financial Safety Warning</h2>
            <p>
              Never transfer funds, share bank account OTPs, or send cryptocurrency to anyone you meet
              online. YFJ Matrimony never asks members to wire money to third parties.
            </p>
          </section>
          <section>
            <h2>3. Safe In-Person Meetings</h2>
            <p>
              When meeting a prospective partner in person for the first time, always inform family
              members, choose well-lit public places, and keep personal transport arrangements handy.
            </p>
          </section>
        </>
      )}
    </LegalPage>
  );
}
