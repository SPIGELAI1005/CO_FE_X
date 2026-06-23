import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Upload,
  Link2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  Sparkles,
  Hash,
  Megaphone,
  MapPin,
  AtSign,
  FileText,
} from "lucide-react";
import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
  openSocialCompose,
  getSocialPlatform,
} from "@/lib/social-share-links";
import { type CampaignSocialRequirements } from "@/lib/campaign-fulfillment";
import type { CafeSocialLinks, CampaignRewardType } from "@/lib/domain/campaign-reward-model";
import { buildSocialPostPackage, copyText } from "@/lib/social-post-assistant";
import { SocialPostTemplate } from "@/components/app/SocialPostTemplate";
import { DisclosureHelper } from "@/components/app/DisclosureHelper";
import { CampaignDataPrivacy } from "@/components/app/CampaignDataPrivacy";
import { trackExplorerEvent } from "@/lib/explorer-analytics";

type Submission = {
  id: string;
  platform: string;
  status: "pending" | "approved" | "rejected";
  url: string | null;
  review_notes: string | null;
  redemption_code: string | null;
  explorer_note: string | null;
  created_at: string;
};

export interface SocialPostAssistantProps {
  campaignId: string;
  hashtag?: string | null;
  hashtags?: string[];
  shopName?: string;
  shopCity?: string | null;
  shopAddress?: string | null;
  campaignTitle?: string;
  campaignSlogan?: string | null;
  rewardType?: CampaignRewardType;
  rewardDescription?: string | null;
  coverImageUrl?: string | null;
  socialLinks?: CafeSocialLinks | null;
  socialRequirements?: CampaignSocialRequirements;
  allowedPlatforms?: string[];
}

function CopyChip({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(value);
        toast.success(ok ? t("socialAssistant.copied", { label }) : t("socialAssistant.copyFailed"));
      }}
      className="flex w-full items-start gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5 text-left transition hover:border-[color:var(--cofex-cyan)]"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">{label}</div>
        <div className="mt-0.5 line-clamp-3 text-xs text-[color:var(--cofex-coffee-deep)]">{value}</div>
      </div>
      <Copy className="h-3.5 w-3.5 shrink-0 text-[color:var(--cofex-black)]/35" />
    </button>
  );
}

export function SocialPostAssistant({
  campaignId,
  hashtag,
  hashtags,
  shopName = "the café",
  shopCity,
  shopAddress,
  campaignTitle = "this campaign",
  campaignSlogan,
  rewardType,
  rewardDescription,
  coverImageUrl,
  socialLinks,
  socialRequirements,
  allowedPlatforms,
}: SocialPostAssistantProps) {
  const { t, i18n } = useTranslation();

  const platformOptions = useMemo(() => {
    const allowed = allowedPlatforms ?? socialRequirements?.platforms;
    if (!allowed?.length) return SOCIAL_PLATFORMS;
    return SOCIAL_PLATFORMS.filter((p) => allowed.includes(p.id));
  }, [allowedPlatforms, socialRequirements?.platforms]);

  const [platform, setPlatform] = useState<SocialPlatform>(platformOptions[0]?.id ?? "instagram_story");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [explorerNote, setExplorerNote] = useState("");
  const [voluntaryProofConfirmed, setVoluntaryProofConfirmed] = useState(false);
  const [publicFeedOptIn, setPublicFeedOptIn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);

  const postPackage = useMemo(
    () =>
      buildSocialPostPackage(
        {
          shopName,
          shopCity,
          shopAddress,
          campaignTitle,
          campaignSlogan,
          hashtags,
          legacyHashtag: hashtag,
          rewardType,
          rewardDescription,
          socialLinks,
          captionTemplate: socialRequirements?.caption_template,
          locale: i18n.language,
        },
        platform,
      ),
    [
      shopName,
      shopCity,
      shopAddress,
      campaignTitle,
      campaignSlogan,
      hashtags,
      hashtag,
      rewardType,
      rewardDescription,
      socialLinks,
      socialRequirements?.caption_template,
      i18n.language,
      platform,
    ],
  );

  useEffect(() => {
    setCaption(postPackage.caption);
  }, [postPackage.caption]);

  const meta = getSocialPlatform(platform) ?? SOCIAL_PLATFORMS[0];
  const isStory = meta.aspectHint === "story";

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("social_submissions")
      .select("id, platform, status, url, review_notes, redemption_code, explorer_note, created_at")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSubs((data as Submission[]) ?? []);
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  async function handleCompose() {
    trackExplorerEvent("post_checkin_action", { action: "social_compose", platform });
    const text = [
      postPackage.disclosureShort,
      postPackage.disclosureHashtagsLine,
      caption,
      postPackage.hashtagsLine,
      postPackage.disclosure,
    ]
      .filter(Boolean)
      .join("\n\n");
    const copied = await copyText(text);
    if (copied) toast.success(t("socialAssistant.captionCopiedCompose"));
    openSocialCompose(platform, text);
  }

  async function submit() {
    if (!voluntaryProofConfirmed) {
      toast.error(t("compliance.voluntaryProof"));
      return;
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      let screenshot_path: string | null = null;
      if (meta.type === "screenshot") {
        if (!file) throw new Error(t("socialAssistant.screenshotRequired"));
        if (file.size > 8 * 1024 * 1024) throw new Error(t("socialAssistant.screenshotTooLarge"));
        const ext = file.name.split(".").pop() ?? "png";
        const path = `${user.id}/${campaignId}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("social-proof").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        screenshot_path = path;
      } else {
        if (!url.trim()) throw new Error(t("socialAssistant.urlRequired"));
        try {
          new URL(url);
        } catch {
          throw new Error(t("socialAssistant.urlInvalid"));
        }
      }
      const { error } = await supabase.rpc("submit_social_proof", {
        _campaign_id: campaignId,
        _platform: platform,
        _submission_type: meta.type,
        _url: meta.type === "link" ? url.trim() : null,
        _screenshot_path: screenshot_path,
        _caption: caption.trim() || null,
        _explorer_note: explorerNote.trim() || null,
        _voluntary_proof_confirmed: true,
        _public_feed_opt_in: publicFeedOptIn,
      });
      if (error) throw error;
      trackExplorerEvent("post_checkin_action", { action: "social_proof_submitted", platform });
      toast.success(t("socialAssistant.submitSuccess"));
      setUrl("");
      setFile(null);
      setExplorerNote("");
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.replace(/^.*?: /, "") : t("socialAssistant.submitFailed");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const hasPending = subs.some((s) => s.status === "pending");

  return (
    <div className="cofex-app-card space-y-5 p-5">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
          <Sparkles className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
          {t("socialAssistant.title")}
        </h3>
        <p className="mt-1 text-sm text-[color:var(--cofex-black)]/60">{t("socialAssistant.subtitle")}</p>
        {socialRequirements?.media_hints ? (
          <p className="mt-2 rounded-xl bg-[color:var(--cofex-pastel-blue)] px-3 py-2 text-xs text-[color:var(--cofex-coffee-deep)]">
            {socialRequirements.media_hints}
          </p>
        ) : null}
      </div>

      <DisclosureHelper prominent />

      <section>
        <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--cofex-cyan)]">
          {t("socialAssistant.pickPlatform")}
        </h4>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {platformOptions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={`rounded-xl border p-3 text-left transition ${
                platform === p.id
                  ? "border-amber-600 bg-amber-50 ring-1 ring-amber-400"
                  : "border-[color:var(--border)] hover:border-amber-300"
              }`}
            >
              <span className="text-xl">{p.emoji}</span>
              <span className="mt-1 block text-xs font-semibold leading-tight text-[color:var(--cofex-coffee-deep)]">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--cofex-cyan)]">
            {t("socialAssistant.contentKit")}
          </h4>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="rounded-xl text-sm"
            placeholder={t("socialAssistant.captionPlaceholder")}
          />
          <div className="grid gap-2">
            <CopyChip
              label={t("socialAssistant.copyDisclosureShort")}
              value={postPackage.disclosureShort}
              icon={Megaphone}
            />
            <CopyChip
              label={t("socialAssistant.copyDisclosureTags")}
              value={postPackage.disclosureHashtagsLine}
              icon={Hash}
            />
            <CopyChip label={t("socialAssistant.copyCaption")} value={caption} icon={FileText} />
            <CopyChip label={t("socialAssistant.copyHashtags")} value={postPackage.hashtagsLine} icon={Hash} />
            <CopyChip label={t("socialAssistant.copyDisclosure")} value={postPackage.disclosure} icon={Megaphone} />
            {postPackage.cafeHandle && (
              <CopyChip label={t("socialAssistant.copyCafeHandle")} value={postPackage.cafeHandle} icon={AtSign} />
            )}
            {postPackage.locationSuggestion && (
              <CopyChip
                label={t("socialAssistant.copyLocation")}
                value={postPackage.locationSuggestion}
                icon={MapPin}
              />
            )}
            <CopyChip label={t("socialAssistant.copyAll")} value={postPackage.fullPostText} icon={Copy} />
          </div>
          <Button
            type="button"
            className="w-full rounded-full bg-amber-700 hover:bg-amber-800"
            onClick={handleCompose}
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            {meta.composeLabel}
          </Button>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--cofex-cyan)]">
            {t("socialAssistant.visualTemplate")}
          </h4>
          <div className="mt-2">
            <SocialPostTemplate
              shopName={shopName}
              coverImageUrl={coverImageUrl}
              postPackage={postPackage}
              isStory={isStory}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-[color:var(--border)] pt-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--cofex-cyan)]">
          {t("socialAssistant.submitProof")}
        </h4>

        {meta.type === "link" ? (
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--cofex-coffee-deep)]">
              <Link2 className="h-3 w-3" /> {t("socialAssistant.pasteUrl")}
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={meta.placeholder}
              className="rounded-xl"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--cofex-coffee-deep)]">
              <Upload className="h-3 w-3" /> {t("socialAssistant.uploadScreenshot")}
            </label>
            <Input type="file" accept="image/*" className="rounded-xl" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        )}

        <Textarea
          value={explorerNote}
          onChange={(e) => setExplorerNote(e.target.value)}
          placeholder={t("socialAssistant.notePlaceholder")}
          rows={2}
          className="rounded-xl text-sm"
        />

        <CampaignDataPrivacy />

        <div className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] bg-white p-3">
          <Checkbox
            id="public-feed-opt-in"
            checked={publicFeedOptIn}
            onCheckedChange={(v) => setPublicFeedOptIn(!!v)}
            className="mt-0.5"
          />
          <Label htmlFor="public-feed-opt-in" className="cursor-pointer text-xs leading-relaxed text-[color:var(--cofex-coffee-deep)]">
            {t("moments.publicFeedOptIn")}
          </Label>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] bg-white p-3">
          <Checkbox
            id="voluntary-proof"
            checked={voluntaryProofConfirmed}
            onCheckedChange={(v) => setVoluntaryProofConfirmed(!!v)}
            className="mt-0.5"
          />
          <Label htmlFor="voluntary-proof" className="cursor-pointer text-xs leading-relaxed text-[color:var(--cofex-coffee-deep)]">
            {t("compliance.voluntaryProof")}
          </Label>
        </div>

        <Button onClick={submit} disabled={busy || hasPending || !voluntaryProofConfirmed} className="w-full rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)]">
          {busy ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t("socialAssistant.submitting")}
            </>
          ) : hasPending ? (
            t("socialAssistant.pendingReview")
          ) : (
            t("socialAssistant.submitButton")
          )}
        </Button>
      </section>

      {subs.length > 0 && (
        <div className="space-y-2 border-t border-[color:var(--border)] pt-3">
          <div className="text-xs font-semibold text-[color:var(--cofex-coffee-deep)]">{t("socialAssistant.yourSubmissions")}</div>
          {subs.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-[color:var(--border)] p-2.5 text-xs"
            >
              <div className="min-w-0">
                <div className="font-medium capitalize text-[color:var(--cofex-coffee-deep)]">
                  {s.platform.replace(/_/g, " ")}
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-[color:var(--cofex-black)]/55 underline">
                    {s.url}
                  </a>
                )}
                {s.explorer_note && <div className="mt-0.5 text-[color:var(--cofex-black)]/55">{s.explorer_note}</div>}
                {s.review_notes && <div className="mt-0.5 text-rose-700">{s.review_notes}</div>}
              </div>
              <StatusPill status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> {t("socialAssistant.statusApproved")}
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
        <XCircle className="h-3 w-3" /> {t("socialAssistant.statusRejected")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
      <Clock className="h-3 w-3" /> {t("socialAssistant.statusPending")}
    </span>
  );
}

/** @deprecated Use SocialPostAssistant */
export const SocialProofSubmit = SocialPostAssistant;
