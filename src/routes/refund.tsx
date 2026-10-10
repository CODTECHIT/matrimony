import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LegalPage } from "@/components/layout/PublicLayout";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — YFJ Matrimony" },
      {
        name: "description",
        content:
          "Official terms for membership cancellations, payment refunds, and billing inquiries on YFJ Matrimony.",
      },
      { property: "og:title", content: "Refund & Cancellation Policy" },
      {
        property: "og:description",
        content: "Our policy regarding subscription cancellations and refund eligibility.",
      },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  const { data } = useQuery<{
    key: string;
    title: string;
    content: { body?: string; lastUpdated?: string };
    updated_at: string;
  }>({
    queryKey: ["cms-content", "refund"],
    queryFn: () => api.get("/content/refund"),
    staleTime: 60 * 1000,
  });

  const customBody = data?.content?.body;
  const pageTitle = data?.title || "Refund & Cancellation Policy";
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
            <h2>1. Plan Activation</h2>
            <p>
              Paid membership benefits (Silver, Gold, and Platinum) are activated immediately upon
              successful payment confirmation from our payment gateway.
            </p>
          </section>
          <section>
            <h2>2. Refund Eligibility Window</h2>
            <p>
              Refund requests raised within 48 hours of purchase will be assessed on a pro-rata basis,
              provided no member contact numbers have been unlocked and no direct match introductions
              have taken place.
            </p>
          </section>
          <section>
            <h2>3. Cancellation Process</h2>
            <p>
              To request a cancellation or refund, please submit a support ticket via our Contact page
              or email billing@yfjmatrimony.com with your payment transaction ID and registered email.
            </p>
          </section>
        </>
      )}
    </LegalPage>
  );
}
