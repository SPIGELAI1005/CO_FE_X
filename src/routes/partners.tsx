import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Partner Terms · CO:FE(X)" },
      {
        name: "description",
        content: "Terms for café partners, subscriptions, campaigns and analytics on CO:FE(X).",
      },
    ],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  return (
    <LegalPageShell
      title="Partner Terms"
      subtitle="Responsibilities, billing, campaigns and data use for independent café partners."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        These terms apply to hospitality businesses using CO:FE(X) partner tools. They supplement the general{" "}
        <Link to="/terms" className="underline hover:opacity-80">
          Terms &amp; Conditions
        </Link>
        . Stripe billing terms apply when subscriptions are enabled.
      </LegalCallout>

      <LegalSection title="1. Eligibility">
        <LegalList
          items={[
            "You represent a registered café, roastery, or hospitality business with authority to bind the organization.",
            "Shop profile information must be accurate, including address, hours, allergens policy links where required and contact details.",
            "You comply with local food safety, advertising, consumer and employment laws.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Campaign responsibilities">
        <LegalList
          items={[
            "Set clear campaign rules, capacity, reward type and redemption method before publishing.",
            "Honor approved rewards during the campaign period and any stated grace period.",
            "Review social submissions promptly and fairly.",
            "Do not encourage Explorers to omit required advertising disclosures.",
            "Pause or end campaigns when you cannot fulfill rewards.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Subscriptions and billing (Stripe)">
        <p>When Stripe billing is live, paid plans include:</p>
        <LegalList
          items={[
            "Prices and billing intervals shown at checkout in EUR unless otherwise stated.",
            "Automatic renewal until cancelled through the customer portal or by contacting us.",
            "VAT shown according to your business status and German/EU tax rules.",
            "Invoices and payment records retained as required by law.",
          ]}
        />
        <p>
          Refunds follow the plan terms at purchase and mandatory consumer rights. Beta or preview features may be
          offered without charge until billing is enabled.
        </p>
      </LegalSection>

      <LegalSection title="4. Data and analytics">
        <p>
          Partners receive analytics about their own campaigns, submissions and shop performance. You may not use
          Explorer personal data for unrelated marketing without a lawful basis and, where required, consent.
        </p>
        <p>
          Aggregated network statistics remain CO:FE(X) property. Export your own campaign data through partner tools
          where available.
        </p>
      </LegalSection>

      <LegalSection title="5. API and integrations">
        <p>
          API keys or integrations, when offered, are confidential and must not be shared publicly. Automated access is
          limited to the scopes granted in writing. Scraping the platform or reselling data without agreement is
          prohibited.
        </p>
        <p>
          See{" "}
          <Link to="/data-processing" className="underline hover:opacity-80">
            Data Processing &amp; Sub-processors
          </Link>{" "}
          for how infrastructure providers handle data.
        </p>
      </LegalSection>

      <LegalSection title="6. Content and trademarks">
        <p>
          You grant CO:FE(X) a license to display your shop name, logo, photos and campaign copy on the platform and in
          marketing materials promoting CO:FE(X) or your listing. You confirm you have rights to all uploaded assets.
        </p>
      </LegalSection>

      <LegalSection title="7. Suspension">
        <p>
          We may suspend partner accounts for repeated reward non-fulfillment, misleading campaigns, legal complaints, or
          payment failure. You remain responsible for outstanding obligations to Explorers during any notice period
          communicated in the app.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          Partner support:{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
