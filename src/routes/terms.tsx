import { createFileRoute } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions · CO:FE(X)" },
      {
        name: "description",
        content: "Terms and conditions for using CO:FE(X), the Coffee Explorer Network for explorers and café partners.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      subtitle="Rules for explorers, café partners and everyone who uses the Coffee Explorer Network."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        CO:FE(X) is planned to launch on <strong>September 28, 2026</strong>. These terms describe how the
        platform is intended to work. They should be reviewed by qualified legal counsel before public launch,
        especially for EU consumer, marketing and platform rules.
      </LegalCallout>

      <LegalSection title="1. Who we are">
        <p>
          CO:FE(X) (&quot;CO:FE(X)&quot;, &quot;we&quot;, &quot;us&quot;) operates the Coffee Explorer Network: a
          platform where coffee lovers (&quot;Explorers&quot;) discover cafés, check in, share social posts and earn
          rewards and where independent cafés (&quot;Partners&quot;) run campaigns and reach new guests.
        </p>
        <p>
          <strong>Operator:</strong> CO:FE(X)
          <br />
          Maria-Sybilla-Merian-Str. 12, 80999 München, Germany
          <br />
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. Acceptance of these terms">
        <p>
          By creating an account, browsing our website, installing our app, joining a campaign, or using any CO:FE(X)
          service, you agree to these Terms &amp; Conditions, our{" "}
          <a href="/privacy" className="underline hover:opacity-80">
            Privacy Policy
          </a>
          and related policies including our{" "}
          <a href="/community" className="underline hover:opacity-80">
            Community Guidelines
          </a>
          ,{" "}
          <a href="/rewards" className="underline hover:opacity-80">
            Rewards &amp; Campaign Rules
          </a>
          and (for Partners){" "}
          <a href="/partners" className="underline hover:opacity-80">
            Partner Terms
          </a>
          . If you do not agree, do not use the service.
        </p>
        <p>
          If you use CO:FE(X) on behalf of a café or business, you confirm that you have authority to bind that
          organization.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility">
        <LegalList
          items={[
            "You must be at least 16 years old to create an Explorer account in the EU, or the minimum age required in your country if higher.",
            "Partner accounts may only be created by authorized representatives of a registered café or hospitality business.",
            "You must provide accurate registration information and keep your account secure.",
            "One person may not maintain multiple Explorer accounts to abuse rewards, referrals, or campaigns.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. What CO:FE(X) provides">
        <p>CO:FE(X) is a discovery and rewards platform, not a coffee retailer. We do not sell beverages directly.</p>
        <LegalList
          items={[
            "Café discovery maps, public shop pages and city listings.",
            "EEFFOC campaigns where Partners offer rewards in exchange for authentic social sharing.",
            "Explorer tools such as check-ins, passport stamps, wallet points, leaderboards and Coffee Radar.",
            "Partner tools such as campaign management, submission review, analytics and optional subscription plans.",
            "Social proof submission flows for links or screenshots from supported platforms (for example Instagram, TikTok, Facebook).",
          ]}
        />
        <p>
          Features may change, launch in phases, or be limited by region. We may add, modify, or remove functionality
          with reasonable notice where practicable.
        </p>
      </LegalSection>

      <LegalSection title="5. Explorer rewards and campaigns">
        <p>
          Rewards (free coffees, points, perks, or similar benefits) are offered by Partner cafés through campaigns.
          CO:FE(X) facilitates discovery and verification but does not guarantee that any reward will always be
          available.
        </p>
        <LegalList
          items={[
            "Each campaign has its own rules, capacity, duration, hashtag and redemption method shown in the app.",
            "Social submissions may require manual review by the Partner or CO:FE(X) before a reward is approved.",
            "Rewards are personal, non-transferable and may expire unless stated otherwise.",
            "Fraudulent check-ins, fake posts, duplicate submissions, or misuse of redemption codes can lead to cancellation of rewards and account suspension.",
            "Partners may refuse service if you do not meet their in-store policies, even when a digital reward was approved.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Social sharing and user content">
        <p>
          When you submit a social post link, caption, screenshot, review, avatar, or other content (&quot;User
          Content&quot;), you remain responsible for it. You must only submit content you created or have rights to
          share and you must comply with the rules of the relevant social network.
        </p>
        <p>
          You grant CO:FE(X) and the relevant Partner a non-exclusive, royalty-free license to store, display, review,
          and use your User Content solely to operate the service, verify campaign participation, prevent abuse and
          promote the campaign or café where you have clearly opted in or where the post was already public.
        </p>
        <p>
          We may remove content that is unlawful, misleading, offensive, infringes third-party rights, or violates
          campaign rules.
        </p>
      </LegalSection>

      <LegalSection title="7. Location, check-ins and device permissions">
        <p>
          Some features use device location to confirm check-ins near a participating café. You can control location
          permissions in your device settings, but check-in features may not work without them.
        </p>
        <p>
          You agree not to spoof GPS location, simulate visits, or attempt to redeem rewards without a genuine café
          visit where required.
        </p>
      </LegalSection>

      <LegalSection title="8. Partner accounts and subscriptions">
        <p>
          Partners are responsible for the accuracy of shop profiles, opening hours, campaign terms, reward fulfillment,
          and compliance with local food, advertising and consumer laws.
        </p>
        <p>
          Paid subscription plans, billing, invoices and cancellations are governed by our{" "}
          <a href="/partners" className="underline hover:opacity-80">
            Partner Terms
          </a>{" "}
          and the plan terms shown at checkout when Stripe billing is enabled. Until billing is live, Partner features
          may be offered in beta or preview form.
        </p>
      </LegalSection>

      <LegalSection title="9. Acceptable use">
        <p>You agree not to:</p>
        <LegalList
          items={[
            "Use bots, scripts, or fake accounts to farm points, referrals, or rewards.",
            "Harass users, Partners, or CO:FE(X) staff.",
            "Upload malware, scrape the service, or attempt unauthorized access.",
            "Misrepresent your identity, affiliation, or campaign participation.",
            "Use CO:FE(X) for unlawful discrimination, spam, or deceptive marketing.",
            "Reverse engineer or resell access except where permitted by law or a written API agreement.",
          ]}
        />
      </LegalSection>

      <LegalSection title="10. Intellectual property">
        <p>
          CO:FE(X), Coffee Explorer Network, EEFFOC, Coffee Radar, logos, product design and software are owned by
          CO:FE(X) or its licensors. You may not copy or reuse them without permission except as allowed by law or
          these terms.
        </p>
        <p>
          Partner trademarks, shop names and photos remain the property of the respective Partners.
        </p>
      </LegalSection>

      <LegalSection title="11. Suspension and termination">
        <p>
          We may suspend or terminate accounts that violate these terms, create risk for users or Partners, or where
          required by law. You may delete your account at any time through profile settings or by contacting us.
        </p>
        <p>
          Provisions that by nature should survive termination (including payment obligations, liability limits and
          dispute rules) will continue to apply.
        </p>
      </LegalSection>

      <LegalSection title="12. Disclaimers">
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not warrant
          uninterrupted operation, error-free software, or that every café listing, campaign, or reward will meet your
          expectations.
        </p>
        <p>
          CO:FE(X) is not responsible for the quality of coffee, service, hygiene, pricing, or conduct of Partner
          cafés, except where mandatory consumer law says otherwise.
        </p>
      </LegalSection>

      <LegalSection title="13. Limitation of liability">
        <p>
          To the fullest extent permitted by applicable law, CO:FE(X) is not liable for indirect, incidental, special,
          or consequential damages, or for lost profits, data, or goodwill arising from your use of the service.
        </p>
        <p>
          Our total liability for claims relating to the service is limited to the greater of (a) the amount you paid
          CO:FE(X) in the twelve months before the claim, or (b) EUR 100, except where mandatory law provides
          otherwise.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes">
        <p>
          We may update these terms to reflect new features, legal requirements, or business changes. We will post the
          revised version on this page and update the &quot;Last updated&quot; date. Material changes may also be
          notified in the app or by email where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="15. Governing law and disputes">
        <p>
          These terms are governed by the laws of Germany, excluding conflict-of-law rules. If you are a consumer
          residing in the EU, you also retain mandatory protections of your country of residence.
        </p>
        <p>
          The courts of Munich, Germany shall have jurisdiction for business users. Consumers may bring claims in their
          home courts where permitted by law. We support amicable resolution first via{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
