import { createFileRoute } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility Statement · CO:FE(X)" },
      {
        name: "description",
        content: "CO:FE(X) accessibility commitment, known limitations, and how to request assistance.",
      },
    ],
  }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  return (
    <LegalPageShell
      title="Accessibility Statement"
      subtitle="Our commitment to an inclusive Coffee Explorer Network for every device and every explorer."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        CO:FE(X) aims to meet <strong>WCAG 2.1 Level AA</strong> across our public website and core app flows. We are
        still pre-launch and actively improving accessibility before September 28, 2026.
      </LegalCallout>

      <LegalSection title="1. Our commitment">
        <p>
          Everyone should be able to discover cafés, understand campaigns, and redeem rewards regardless of ability,
          device, or connection quality. Accessibility is part of our design language: clear typography, strong
          contrast, readable structure, and keyboard-friendly interactions.
        </p>
      </LegalSection>

      <LegalSection title="2. Standards and scope">
        <p>This statement covers:</p>
        <LegalList
          items={[
            "The public marketing website (landing, legal pages, public café and city pages).",
            "The authenticated web app used by Explorers and Partners.",
            "The installable progressive web app (PWA) version of CO:FE(X).",
          ]}
        />
        <p>
          Third-party content such as embedded maps, social networks, or payment pages may follow their own
          accessibility standards.
        </p>
      </LegalSection>

      <LegalSection title="3. Measures we take">
        <LegalList
          items={[
            "Readable typefaces (Nunito Sans) with scalable text and sufficient line height.",
            "Color contrast aligned with brand tokens and checked for body text and buttons.",
            "Semantic headings, landmarks, labels on form fields, and descriptive alt text on key images.",
            "Keyboard focus states on links, buttons, and form controls.",
            "Touch targets sized for mobile use in primary navigation and call-to-action areas.",
            "Reduced-motion support for scroll animations on the landing page where supported by the browser.",
            "Responsive layouts for small screens, zoom, and landscape orientation.",
            "Plain-language labels for campaign steps, social submission flows, and reward status.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Known limitations">
        <p>We are aware of areas still being improved:</p>
        <LegalList
          items={[
            "Some map interactions may be difficult to operate with keyboard-only navigation.",
            "Partner analytics charts may not yet expose full screen-reader summaries.",
            "Uploaded social screenshots in moderation queues may lack alternative text supplied by users.",
            "Certain scroll-driven marketing animations on the landing page may still run before client scripts load.",
            "Automated accessibility testing across every partner-generated shop page is not yet complete.",
          ]}
        />
        <p>We prioritize fixes that block account creation, sign-in, campaign participation, and reward redemption.</p>
      </LegalSection>

      <LegalSection title="5. Assistive technology">
        <p>
          CO:FE(X) is tested on current versions of major browsers (Chrome, Firefox, Safari, Edge) on desktop and
          mobile. We aim to support recent versions of VoiceOver, TalkBack, and NVDA for core journeys, though your
          experience may vary by browser and assistive technology combination.
        </p>
      </LegalSection>

      <LegalSection title="6. Feedback and assistance">
        <p>
          If you encounter a barrier on CO:FE(X), please tell us so we can fix it. Include the page URL, what you were
          trying to do, your device and browser, and any assistive technology you use.
        </p>
        <p>
          Email:{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
        </p>
        <p>
          We aim to respond within 5 business days and will propose a reasonable timeline for remediation when a fix
          requires engineering work.
        </p>
      </LegalSection>

      <LegalSection title="7. Enforcement and review">
        <p>
          This statement was prepared on {LAST_UPDATED} and will be reviewed at least annually or when major product
          changes ship. CO:FE(X) is operated from Germany and considers applicable EU Web Accessibility requirements
          for digital services offered to the public.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
