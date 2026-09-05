import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/PublicLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — YFJ Matrimony" },
      {
        name: "description",
        content:
          "The terms that govern membership, conduct, payments and profile content on YFJ Matrimony.",
      },
      { property: "og:title", content: "Terms & Conditions — YFJ Matrimony" },
      { property: "og:description", content: "Membership, conduct and payment terms." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="1 September 2026">
      <section>
        <h2>1. Eligibility</h2>
        <p>
          Membership is open to individuals who are legally permitted to marry under Indian law and
          who are at least 21 years old (men) or 18 years old (women). Profiles may be created by
          the member or by an immediate family member with the member's consent.
        </p>
      </section>
      <section>
        <h2>2. Accuracy of information</h2>
        <p>
          You agree that all information you publish — including age, marital status, education,
          occupation and photographs — is truthful and current. We may suspend profiles that contain
          misleading details.
        </p>
      </section>
      <section>
        <h2>3. Conduct</h2>
        <p>
          Harassment, solicitation, commercial promotion and the sharing of another member's contact
          details are prohibited. Reported profiles are reviewed by our moderation team.
        </p>
      </section>
      <section>
        <h2>4. Memberships and payments</h2>
        <p>
          Paid memberships begin on the date of successful payment and run for the stated duration.
          Feature limits are enforced by our servers according to your active plan. Refunds are
          governed by the refund policy communicated at the time of purchase.
        </p>
      </section>
      <section>
        <h2>5. Limitation of liability</h2>
        <p>
          YFJ Matrimony is an introduction service. We do not guarantee a marriage, and we are not a
          party to any relationship formed through the platform. Members are responsible for
          verifying details independently before making commitments.
        </p>
      </section>
      <section>
        <h2>6. Changes to these terms</h2>
        <p>
          We may update these terms to reflect changes to the service or the law. Material changes
          will be notified in the app and by email at least seven days before they take effect.
        </p>
      </section>
    </LegalPage>
  );
}
