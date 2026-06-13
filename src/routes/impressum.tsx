import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: "Impressum · CO:FE(X)" },
      {
        name: "description",
        content: "Legal notice and provider information for CO:FE(X), the Coffee Explorer Network.",
      },
    ],
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <LegalPageShell
      title="Impressum"
      subtitle="Legal notice pursuant to § 5 TMG and provider identification for Germany and the EU."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        Registration numbers and VAT ID below are marked for completion before public launch on{" "}
        <strong>September 28, 2026</strong>. Qualified legal counsel should verify this page against your final
        corporate structure.
      </LegalCallout>

      <LegalSection title="1. Service provider">
        <p>
          <strong>CO:FE(X)</strong>
          <br />
          Coffee Explorer Network
          <br />
          Maria-Sybilla-Merian-Str. 12
          <br />
          80999 München
          <br />
          Germany
        </p>
        <p>
          Email:{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. Commercial register">
        <p>
          <strong>Legal form:</strong> to be confirmed before launch
          <br />
          <strong>Register court:</strong> Amtsgericht München (expected)
          <br />
          <strong>Registration number (HRB):</strong> to be added before launch
        </p>
      </LegalSection>

      <LegalSection title="3. VAT identification">
        <p>
          <strong>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:</strong> to be added before launch
        </p>
        <p>
          <strong>Wirtschafts-Identifikationsnummer:</strong> to be added if applicable
        </p>
      </LegalSection>

      <LegalSection title="4. Represented by">
        <p>
          <strong>Managing director(s) / Geschäftsführer:</strong> to be named before launch
        </p>
      </LegalSection>

      <LegalSection title="5. Responsible for content (§ 55 Abs. 2 RStV)">
        <p>
          CO:FE(X)
          <br />
          Maria-Sybilla-Merian-Str. 12
          <br />
          80999 München, Germany
        </p>
      </LegalSection>

      <LegalSection title="6. EU dispute resolution">
        <p>
          The European Commission provides a platform for online dispute resolution (ODR):{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            https://ec.europa.eu/consumers/odr
          </a>
        </p>
        <p>
          Our email address for consumer contact is{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
          . We are not obliged to participate in dispute resolution proceedings before a consumer arbitration board
          unless required by law, but we aim to resolve issues amicably first.
        </p>
      </LegalSection>

      <LegalSection title="7. Liability for content and links">
        <p>
          We create the content on our pages with care. We are nevertheless not liable for the accuracy,
          completeness, or timeliness of content unless we have positive knowledge of unlawful material.
        </p>
        <p>
          Our site contains links to external websites (for example social networks and map providers). We have no
          influence over their content and assume no liability for external content. The respective provider is always
          responsible for linked pages.
        </p>
      </LegalSection>

      <LegalSection title="8. Related legal documents">
        <LegalList
          items={[
            "Terms & Conditions",
            "Privacy Policy",
            "Cookie Policy",
            "Accessibility Statement",
          ]}
        />
        <p className="mt-4">
          <Link to="/terms" className="underline hover:opacity-80">
            Terms &amp; Conditions
          </Link>
          {" · "}
          <Link to="/privacy" className="underline hover:opacity-80">
            Privacy Policy
          </Link>
          {" · "}
          <Link to="/cookies" className="underline hover:opacity-80">
            Cookie Policy
          </Link>
          {" · "}
          <Link to="/accessibility" className="underline hover:opacity-80">
            Accessibility Statement
          </Link>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
