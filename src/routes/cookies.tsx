import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy · CO:FE(X)" },
      {
        name: "description",
        content: "How CO:FE(X) uses cookies, local storage, and similar technologies.",
      },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      subtitle="How we use cookies, local storage, and similar technologies on our website and app."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        This policy supplements our{" "}
        <Link to="/privacy" className="underline hover:opacity-80">
          Privacy Policy
        </Link>
        . We use only essential technologies today. Analytics and marketing cookies will require consent before they are
        activated.
      </LegalCallout>

      <LegalSection title="1. What are cookies and local storage?">
        <p>
          Cookies are small text files stored in your browser. Local storage and similar technologies keep data on your
          device so CO:FE(X) can remember your session, preferences, and installed PWA assets.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use them today">
        <p>
          <strong>Strictly necessary (no consent required):</strong>
        </p>
        <LegalList
          items={[
            "Authentication session tokens to keep you signed in securely.",
            "Security and CSRF-related values that protect your account.",
            "PWA shell cache keys so the app loads faster after installation.",
            "Basic preference storage such as dismissed banners or onboarding progress.",
          ]}
        />
        <p>
          <strong>Not in use without consent (planned):</strong>
        </p>
        <LegalList
          items={[
            "Analytics cookies to understand feature usage and improve reliability.",
            "Marketing or attribution cookies for campaign measurement.",
            "Third-party embed cookies from optional widgets.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Cookie categories and legal basis">
        <p>
          Essential cookies are used based on our legitimate interest in operating a secure service and on contractual
          necessity when you sign in. Non-essential cookies will rely on your consent under the GDPR and ePrivacy rules
          where applicable.
        </p>
      </LegalSection>

      <LegalSection title="4. Third-party technologies">
        <p>
          When you use map embeds, social login, or payment pages, those providers may set their own cookies. Their use
          is governed by the provider&apos;s policy. See our{" "}
          <Link to="/data-processing" className="underline hover:opacity-80">
            Data Processing &amp; Sub-processors
          </Link>{" "}
          page for an overview of infrastructure partners.
        </p>
      </LegalSection>

      <LegalSection title="5. Managing your choices">
        <p>You can control cookies and storage in several ways:</p>
        <LegalList
          items={[
            "Use your browser settings to block or delete cookies.",
            "Decline non-essential cookies in our consent banner when it is shown.",
            "Sign out to end your authenticated session.",
            "Uninstall the PWA to remove locally cached app assets.",
          ]}
        />
        <p>Blocking essential cookies may prevent sign-in, check-ins, or reward redemption from working correctly.</p>
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          Session cookies expire when you close the browser or sign out. Persistent preference cookies are kept for up
          to 12 months unless you delete them sooner. Analytics retention periods will be disclosed in the consent banner
          before those tools go live.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes and contact">
        <p>
          We will update this page when we add analytics, marketing tools, or new embeds. Questions:{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
