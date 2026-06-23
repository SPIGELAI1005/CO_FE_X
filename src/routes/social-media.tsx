import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalCallout, LegalList, LegalPageShell, LegalSection } from "@/components/marketing/LegalPageShell";

const LAST_UPDATED = "June 23, 2026";

export const Route = createFileRoute("/social-media")({
  head: () => ({
    meta: [
      { title: "Publishing on Social Media · CO:FE(X)" },
      {
        name: "description",
        content:
          "How CO:FE(X) connects explorers with Instagram, TikTok and other platforms for campaign social proof, without posting on your behalf.",
      },
    ],
  }),
  component: SocialMediaPage,
});

function SocialMediaPage() {
  return (
    <LegalPageShell
      title="Publishing on Social Media"
      subtitle="How CO:FE(X) helps you share campaign moments, what we connect to and what stays on your device."
      lastUpdated={LAST_UPDATED}
    >
      <LegalCallout>
        CO:FE(X) is a <strong>discovery and rewards layer</strong>, not a social network. We help you find cafés,
        join campaigns and prove you shared a post so Partners can unlock your reward. You always publish on
        Instagram, TikTok, Facebook, or elsewhere <strong>in their own apps</strong>. We do not post for you or access
        your social passwords. This policy complements our{" "}
        <Link to="/privacy" className="underline hover:opacity-80">
          Privacy Policy
        </Link>
        ,{" "}
        <Link to="/data-processing" className="underline hover:opacity-80">
          Data Processing
        </Link>
        and{" "}
        <Link to="/community" className="underline hover:opacity-80">
          Community Guidelines
        </Link>
        .
      </LegalCallout>

      <LegalSection title="1. The concept: social proof, not auto-posting">
        <p>
          Many EEFFOC campaigns ask Explorers to share a genuine visit, for example an Instagram Story, TikTok, or feed
          post with the campaign hashtag. CO:FE(X) supports that flow in three steps:
        </p>
        <LegalList
          items={[
            "Discover & join: you find a campaign in the app, check in at the café and see what the Partner asks you to share.",
            "Create & publish: you compose and publish on the social platform yourself (we open their app or website where possible).",
            "Prove & earn: you paste the public post URL or upload a screenshot; the Partner (or CO:FE(X)) reviews it and unlocks your reward if it meets the rules.",
          ]}
        />
        <p>
          This is <strong>social proof</strong>: evidence that you participated in the campaign, not automatic
          cross-posting from CO:FE(X) to your followers.
        </p>
      </LegalSection>

      <LegalSection title="2. What the app provides">
        <p>Inside a campaign, the Social Post Assistant may offer:</p>
        <LegalList
          items={[
            "Suggested captions, hashtags and café tags based on the campaign brief.",
            "Disclosure reminders (for example #ad, #Anzeige, or #Werbung) where a reward counts as advertising.",
            "A visual story template you can screenshot or recreate in your preferred editor.",
            "Deep links to open Instagram, TikTok, or Facebook compose surfaces. You finish publishing there.",
            "Copy-to-clipboard tools for captions and hashtag lines.",
          ]}
        />
        <p>
          We cannot confirm that a post went live on a third-party network. Only you control publish, audience and
          privacy settings on that platform.
        </p>
      </LegalSection>

      <LegalSection title="3. Supported platforms">
        <p>Depending on the campaign, we may accept proof from:</p>
        <LegalList
          items={[
            "Instagram (Story, feed post, or public link).",
            "TikTok (public video URL).",
            "Facebook (public post link).",
            "Manual screenshot upload when a link is not available.",
          ]}
        />
        <p>
          Platform names and logos are trademarks of their owners. CO:FE(X) is not endorsed by Meta, TikTok, or other
          networks unless we state otherwise in writing.
        </p>
      </LegalSection>

      <LegalSection title="4. What we store and share">
        <p>When you use social features, we may process:</p>
        <LegalList
          items={[
            "The public URL you submit, or an image/screenshot you upload for review.",
            "Caption text you enter or edit in the app before posting.",
            "Campaign ID, café, platform choice and submission status (pending, approved, rejected).",
            "Review notes from Partners and fraud signals used to protect the reward system.",
          ]}
        />
        <p>
          Partners involved in your campaign can see your submission to verify eligibility. We do not receive your social
          media login credentials. Sign-in to CO:FE(X) via Google (or email) is separate from any social network
          account.
        </p>
        <p>
          For sub-processors and retention, see{" "}
          <Link to="/data-processing" className="underline hover:opacity-80">
            Data Processing &amp; Sub-processors
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Your responsibilities">
        <LegalList
          items={[
            "Publish only content you created or have rights to use; follow each platform's terms and community rules.",
            "Disclose sponsored or rewarded posts clearly under EU and local advertising law.",
            "Keep posts public for the review window stated in the campaign if verification requires it.",
            "Do not submit private, deleted, or misleading content to obtain rewards.",
            "Respect café staff, guests and filming policies when creating on site.",
          ]}
        />
        <p>
          Full behavior rules are in our{" "}
          <Link to="/community" className="underline hover:opacity-80">
            Community Guidelines
          </Link>{" "}
          and{" "}
          <Link to="/rewards" className="underline hover:opacity-80">
            Rewards &amp; Campaign Rules
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Moments feed and optional sharing">
        <p>
          Separately from campaign proof, you may choose to share café moments in the CO:FE(X) Moments feed if your
          privacy settings allow. That feed is part of our app experience, not a repost to Instagram or TikTok. You
          control whether moments are public in your profile privacy preferences.
        </p>
      </LegalSection>

      <LegalSection title="7. Future integrations">
        <p>
          We may add deeper integrations (for example official APIs) where platforms permit them and where we can offer
          clear consent and transparency. Any material change to how we connect to social networks will be reflected in
          this page, the Privacy Policy and in-app notices before rollout.
        </p>
      </LegalSection>

      <LegalSection title="8. Questions">
        <p>
          For privacy requests:{" "}
          <a href="mailto:Contact@COFE-X.com" className="underline hover:opacity-80">
            Contact@COFE-X.com
          </a>
          . For campaign or submission disputes, contact the café Partner listed in the campaign first, then CO:FE(X)
          support with your submission ID and links.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
