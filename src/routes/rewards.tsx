import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 11, 2026";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards & Campaign Rules · CO:FE(X)" },
      {
        name: "description",
        content: "How EEFFOC campaigns, points, perks and redemptions work on CO:FE(X).",
      },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  return (
    <LegalPageShell
      title="Rewards & Campaign Rules"
      subtitle="How EEFFOC campaigns, points, perks and in-store redemption work for Explorers."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        Rewards are offered by Partner cafés. CO:FE(X) facilitates discovery and verification but does not replace the
        café&apos;s own service policies. See also{" "}
        <Link to="/community" className="underline hover:opacity-80">
          Community Guidelines
        </Link>
        .
      </LegalCallout>

      <LegalSection title="1. How campaigns work">
        <p>
          Partners create EEFFOC campaigns with specific goals: for example a social post with a hashtag, a check-in, or
          a review. Each campaign shows its rules, capacity, duration, reward type and redemption method in the app.
        </p>
      </LegalSection>

      <LegalSection title="2. Earning rewards">
        <LegalList
          items={[
            "Complete all steps shown in the campaign card before the deadline.",
            "Allow time for Partner or CO:FE(X) review when manual verification applies.",
            "Keep required posts public for the review period unless stated otherwise.",
            "Points, stamps and wallet balances update after approval, not always instantly.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Redemption">
        <LegalList
          items={[
            "Rewards are personal and non-transferable unless a campaign explicitly allows gifting.",
            "Show the in-app redemption code or status to café staff when required.",
            "Partners may set daily caps, blackout dates, or menu exclusions.",
            "Expired or fully claimed rewards cannot be honored unless the Partner chooses otherwise.",
            "Partners may refuse service for safety, intoxication, or breach of house rules even if a digital reward was approved.",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Fraud prevention">
        <p>We monitor for abuse including:</p>
        <LegalList
          items={[
            "GPS spoofing or check-ins without a genuine visit.",
            "Duplicate accounts, recycled screenshots, or stolen post links.",
            "Automated submissions or bot activity.",
            "Collusion to inflate leaderboard or referral rewards.",
          ]}
        />
        <p>
          Confirmed abuse may lead to reversed points, cancelled redemptions and account suspension. We may share
          evidence with affected Partners.
        </p>
      </LegalSection>

      <LegalSection title="5. Partner changes and liability">
        <p>
          If a Partner pauses or leaves CO:FE(X), outstanding approved rewards should be honored during any notice
          period shown in the app. CO:FE(X) is not the seller of coffee or food; fulfillment is the Partner&apos;s
          responsibility except where mandatory consumer law provides otherwise.
        </p>
      </LegalSection>

      <LegalSection title="6. Disputes">
        <p>
          For reward status questions, contact the Partner first using details on their shop page. For platform issues,
          email{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>{" "}
          with your account email, campaign name and submission date.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
