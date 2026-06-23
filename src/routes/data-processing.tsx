import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/data-processing")({
  head: () => ({
    meta: [
      { title: "Data Processing · CO:FE(X)" },
      {
        name: "description",
        content: "GDPR transparency: sub-processors, legal bases summary and data protection contacts.",
      },
    ],
  }),
  component: DataProcessingPage,
});

function DataProcessingPage() {
  return (
    <LegalPageShell
      title="Data Processing & Sub-processors"
      subtitle="GDPR transparency for explorers, partners and visitors: who processes data and why."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        This page summarizes our data processing setup. It supplements the{" "}
        <Link to="/privacy" className="underline hover:opacity-80">
          Privacy Policy
        </Link>
        . Formal Data Processing Agreements and a full Records of Processing Activities register should be finalized
        before launch.
      </LegalCallout>

      <LegalSection title="1. Data controller">
        <p>
          <strong>CO:FE(X)</strong>
          <br />
          Maria-Sybilla-Merian-Str. 12, 80999 München, Germany
          <br />
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. Data protection officer">
        <p>
          Based on current scale and processing activities, a formal Data Protection Officer (DPO) appointment is not yet
          required. We will reassess before launch and appoint a DPO if mandatory under Art. 37 GDPR.
        </p>
      </LegalSection>

      <LegalSection title="3. Processing activities (summary)">
        <LegalList
          items={[
            "Account registration and authentication for Explorers and Partners.",
            "Campaign participation, social proof verification and reward redemption.",
            "Location-based check-ins when permission is granted.",
            "Partner billing and subscription management when Stripe is enabled.",
            "Security logging, fraud prevention and incident response.",
            "Optional marketing communications with consent where required.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Sub-processors">
        <p>We use trusted providers to operate the service. Primary sub-processors include:</p>
        <p>
          <strong>Supabase</strong>: hosting, database, authentication, file storage and row-level security. Primary
          data region: EU where configured. DPA: Supabase standard terms / enterprise DPA to be executed before launch.
        </p>
        <p>
          <strong>Stripe</strong>: payment processing and invoicing for Partner subscriptions when enabled. DPA:
          Stripe Data Processing Agreement.
        </p>
        <p>
          <strong>Email / notification providers</strong>: transactional messages (account, security, campaign
          updates). Provider to be confirmed; EU processing preferred.
        </p>
        <p>
          <strong>Map and OAuth providers</strong>: when you use maps or social sign-in, those providers process data
          under their own policies.
        </p>
      </LegalSection>

      <LegalSection title="5. International transfers">
        <p>
          We aim to keep primary personal data in the EU/EEA. If a sub-processor processes data outside the EU/EEA, we
          use appropriate safeguards such as Standard Contractual Clauses and transfer impact assessments.
        </p>
      </LegalSection>

      <LegalSection title="6. Partner role as independent controller">
        <p>
          When Partners review submissions, fulfill rewards, or export campaign data, they may act as independent
          controllers for their own customer relationships. Partners must handle Explorer data lawfully and only for
          campaign-related purposes.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights and requests">
        <p>
          Submit access, deletion, portability, or objection requests to{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
          . We respond within GDPR timelines. You may also lodge a complaint with your supervisory authority; in
          Bavaria this may be the BayLDA.
        </p>
        <p>
          Cookie choices are described in our{" "}
          <Link to="/cookies" className="underline hover:opacity-80">
            Cookie Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Security measures">
        <LegalList
          items={[
            "HTTPS encryption in transit.",
            "Role-based access and row-level security in the database.",
            "Hashed passwords and secure session handling.",
            "Partner-scoped storage for shop images.",
            "Audit logging for sensitive operations where implemented.",
          ]}
        />
      </LegalSection>
    </LegalPageShell>
  );
}
