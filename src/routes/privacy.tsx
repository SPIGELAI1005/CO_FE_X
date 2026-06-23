import { createFileRoute } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · CO:FE(X)" },
      {
        name: "description",
        content: "How CO:FE(X) collects, uses and protects personal data for explorers and café partners.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="How we handle personal data when you explore cafés, share posts and earn rewards."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        CO:FE(X) is designed for users in the European Union and processes data under the GDPR. This policy explains
        what we collect today and what we plan to collect at launch. Final legal review and a Data Processing Register
        should be completed before September 28, 2026.
      </LegalCallout>

      <LegalSection title="1. Controller">
        <p>
          <strong>CO:FE(X)</strong>
          <br />
          Maria-Sybilla-Merian-Str. 12, 80999 München, Germany
          <br />
          Email:{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
        </p>
        <p>
          For privacy requests (access, deletion, objection, portability), contact us at the email above. We will respond
          within the timelines required by GDPR unless an extension is permitted.
        </p>
      </LegalSection>

      <LegalSection title="2. Who this policy covers">
        <LegalList
          items={[
            "Explorers using the website, app, or PWA.",
            "Partner café owners and staff using partner dashboards.",
            "Visitors browsing public shop and city pages.",
            "People who sign up for early access or contact us by email.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Data we collect">
        <p>
          <strong>Account and profile data:</strong> name, email address, password hash, avatar, handle, city,
          onboarding preferences, referral code, role (explorer, partner, admin) and account settings.
        </p>
        <p>
          <strong>Activity data:</strong> check-ins, campaign participation, passport stamps, wallet points, reward
          redemptions, reviews, leaderboard entries, notifications and in-app actions needed to operate the service.
        </p>
        <p>
          <strong>Social and campaign data:</strong> public post URLs, optional captions, uploaded screenshots,
          platform type (for example Instagram or TikTok), campaign hashtags, submission status and partner review
          notes related to reward verification.
        </p>
        <p>
          <strong>Location data:</strong> approximate GPS coordinates when you check in at a café, if you grant
          permission. We use this to verify visits and show nearby shops. You can disable location in your device
          settings.
        </p>
        <p>
          <strong>Partner business data:</strong> shop name, address, description, images, billing details, subscription
          status, campaign configuration, analytics and API key metadata for integrated partners.
        </p>
        <p>
          <strong>Technical data:</strong> IP address, browser type, device identifiers, log files, crash reports,
          cookie or local storage values and security signals used to prevent abuse.
        </p>
        <p>
          <strong>Communications:</strong> messages you send to support and early-access signup information.
        </p>
      </LegalSection>

      <LegalSection title="4. Why we use your data">
        <LegalList
          items={[
            "Provide accounts, authentication and core app features (contract / pre-contract).",
            "Verify café visits, campaign eligibility and reward redemption (contract / legitimate interest).",
            "Review social submissions for fraud prevention and partner campaign rules (legitimate interest).",
            "Show public café pages, maps and SEO-friendly listings (legitimate interest / consent where required).",
            "Operate partner billing and subscriptions when enabled (contract / legal obligation).",
            "Send service messages, security alerts and optional marketing with consent where required.",
            "Improve reliability, analytics and product development using aggregated or pseudonymized data where possible.",
            "Comply with law, respond to requests and enforce our Terms & Conditions.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Legal bases under GDPR">
        <p>Depending on the activity, we rely on one or more of the following:</p>
        <LegalList
          items={[
            "Performance of a contract (Art. 6(1)(b) GDPR) when you create an account or join a campaign.",
            "Legitimate interests (Art. 6(1)(f) GDPR) for security, fraud prevention, analytics and network growth, balanced against your rights.",
            "Consent (Art. 6(1)(a) GDPR) for optional marketing emails, non-essential cookies and certain public profile choices.",
            "Legal obligation (Art. 6(1)(c) GDPR) for tax, billing records and regulatory requests.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Social media and third-party platforms">
        <p>
          When you paste a link to Instagram, TikTok, Facebook, or another network, we store that link and related
          metadata so Partners can verify your post. We do not receive your private social media password.
        </p>
        <p>
          Public posts remain governed by the third party&apos;s own terms and privacy settings. Do not submit private
          or restricted content unless you intend it to be reviewed for a campaign.
        </p>
        <p>
          If you sign in with Google or another OAuth provider, we receive basic profile information authorized by that
          provider.
        </p>
      </LegalSection>

      <LegalSection title="7. How we share data">
        <p>We do not sell personal data. We share data only when needed to run the service:</p>
        <LegalList
          items={[
            "Partner cafés involved in a campaign you joined, including submission review and redemption.",
            "Infrastructure providers such as Supabase (hosting, database, auth, storage) in the EU where configured.",
            "Payment processor Stripe for partner subscriptions and billing when enabled.",
            "Email or notification providers for account and service messages.",
            "Professional advisers or authorities when required by law or to protect rights and safety.",
          ]}
        />
        <p>
          Public shop pages may show aggregated or user-generated content such as approved reviews. Explorer profiles
          expose only the fields you choose to make visible in the app.
        </p>
        <p>
          For a summary of sub-processors and GDPR transparency, see{" "}
          <a href="/data-processing" className="underline hover:opacity-80">
            Data Processing &amp; Sub-processors
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. International transfers">
        <p>
          We aim to host primary personal data in the European Union. If a subprocessors processes data outside the EU
          or EEA, we use appropriate safeguards such as Standard Contractual Clauses and transfer impact assessments
          where required.
        </p>
      </LegalSection>

      <LegalSection title="9. Retention">
        <LegalList
          items={[
            "Account data is kept while your account is active and for a reasonable period afterward for legal, tax, or dispute needs.",
            "Social submission assets may be deleted or anonymized after campaign completion unless needed for fraud investigation.",
            "Billing records are retained as required by German commercial and tax law.",
            "Server logs and security records are kept for a limited period unless needed for incident investigation.",
          ]}
        />
      </LegalSection>

      <LegalSection title="10. Your rights">
        <p>If you are in the EU/EEA or UK, you may have the right to:</p>
        <LegalList
          items={[
            "Access your personal data and receive a copy.",
            "Correct inaccurate data.",
            "Delete data where applicable ('right to be forgotten').",
            "Restrict or object to certain processing.",
            "Data portability for information you provided.",
            "Withdraw consent at any time for consent-based processing.",
            "Lodge a complaint with your local supervisory authority. In Germany, this may include the Bayerisches Landesamt für Datenschutzaufsicht (BayLDA) for Bavaria.",
          ]}
        />
      </LegalSection>

      <LegalSection title="11. Cookies, local storage and PWA">
        <p>
          We use essential cookies and local storage for login sessions, security and app preferences. See our{" "}
          <a href="/cookies" className="underline hover:opacity-80">
            Cookie Policy
          </a>{" "}
          for details. If we add analytics or marketing cookies, we will request consent through a banner where required.
        </p>
        <p>
          Installing the CO:FE(X) PWA stores app assets locally on your device so the service can load faster offline.
        </p>
      </LegalSection>

      <LegalSection title="12. Children">
        <p>
          CO:FE(X) is not directed at children under 16. We do not knowingly collect data from children below the
          applicable minimum age. Contact us if you believe a child has created an account and we will take appropriate
          steps.
        </p>
      </LegalSection>

      <LegalSection title="13. Security">
        <p>
          We use industry-standard measures including encrypted transport (HTTPS), access controls, row-level security
          in our database and role-based permissions. No online service is completely secure, so please use a strong
          unique password and protect your device.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes to this policy">
        <p>
          We will update this page when our data practices change. Significant updates may be communicated in the app or
          by email where appropriate.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
