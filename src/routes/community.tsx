import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community Guidelines · CO:FE(X)" },
      {
        name: "description",
        content: "Rules for authentic sharing, social proof and respectful behavior on CO:FE(X).",
      },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <LegalPageShell
      title="Community Guidelines"
      subtitle="How to share authentically, earn rewards fairly and keep the Coffee Explorer Network welcoming."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        These guidelines explain how social proof works on CO:FE(X). They complement our{" "}
        <Link to="/terms" className="underline hover:opacity-80">
          Terms &amp; Conditions
        </Link>{" "}
        and{" "}
        <Link to="/rewards" className="underline hover:opacity-80">
          Rewards &amp; Campaign Rules
        </Link>
        .
      </LegalCallout>

      <LegalSection title="1. Share authentically">
        <LegalList
          items={[
            "Only submit posts, screenshots, or links you created or have the right to share.",
            "Visit the café in person when a campaign requires a genuine check-in or visit.",
            "Use the campaign hashtag and instructions exactly as shown in the app.",
            "Do not buy followers, use engagement pods, or post misleading reviews.",
            "One submission per campaign requirement unless the Partner explicitly allows more.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Supported platforms and verification">
        <p>
          CO:FE(X) may accept links or screenshots from platforms such as Instagram, TikTok, Facebook and X. Verification
          may be manual (Partner or CO:FE(X) review) or automated where APIs are available in the future.
        </p>
        <p>
          Private, deleted, or restricted posts may be rejected. Keep your post public for the review window stated in the
          campaign.
        </p>
      </LegalSection>

      <LegalSection title="3. Marketing and influencer disclosure (EU)">
        <p>
          If you receive a reward, discount, or payment for posting, you must clearly disclose the commercial
          relationship under applicable EU and national advertising rules (for example labels such as
          &quot;Werbung&quot;, &quot;Anzeige&quot;, or &quot;#ad&quot; where required).
        </p>
        <p>
          Partners must not ask Explorers to hide sponsorship. CO:FE(X) may reject submissions that omit required
          disclosures.
        </p>
      </LegalSection>

      <LegalSection title="4. Respect people and places">
        <LegalList
          items={[
            "Be courteous to café staff and other guests when creating content on site.",
            "Do not photograph other customers without their consent where privacy laws apply.",
            "Follow each café's house rules, filming policies and opening hours.",
            "No harassment, hate speech, discrimination, or threats toward users, Partners, or staff.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Prohibited content">
        <LegalList
          items={[
            "Illegal content, intellectual property infringement, or impersonation.",
            "Sexually explicit, violent, or excessively profane material unrelated to the café experience.",
            "False health claims undisclosed alcohol promotion where restricted, or dangerous challenges.",
            "Spam, malware links, or scraped content presented as your own.",
            "Content that encourages reward fraud or circumvents campaign limits.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Your content license">
        <p>
          By submitting User Content, you grant CO:FE(X) and the relevant Partner a limited license to store, review,
          display and use it to operate campaigns, prevent fraud and promote the café where you have opted in or the
          post is already public. You retain ownership of your content.
        </p>
      </LegalSection>

      <LegalSection title="7. Reporting and enforcement">
        <p>
          Report abuse via{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>{" "}
          with links, screenshots and campaign details. We may remove content, reject rewards, suspend accounts, or
          notify Partners and authorities where required by law.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
