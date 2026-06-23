import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  Gift,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PartnerStatusPill } from "@/components/app/partner/PartnerShell";
import type { PartnerSocialSubmission } from "@/lib/queries/partner-submissions";
import { CofexIconTile, RewardTypeChip } from "@/components/app/CofexIconTile";
import { getSocialPlatform, getSocialPlatformIconMeta } from "@/lib/social-share-links";

function explorerInitials(name: string | null | undefined) {
  const n = name?.trim() || "?";
  return n
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function platformLabel(platform: string) {
  return getSocialPlatform(platform)?.label ?? platform.replace(/_/g, " ");
}

export function SocialProofReviewCard({
  submission,
  signedUrl,
  onReview,
}: {
  submission: PartnerSocialSubmission;
  signedUrl?: string;
  onReview: (id: string, decision: "approved" | "rejected", notes?: string) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const campaign = submission.campaigns;
  const rewardType = campaign?.reward_type ?? "coffee";
  const explorerName = submission.profiles?.display_name ?? t("partnerSubmissionsReview.explorerFallback");
  const hashtagLine = useMemo(() => {
    const tags = campaign?.hashtags?.length
      ? campaign.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`))
      : campaign?.hashtag
        ? [campaign.hashtag.startsWith("#") ? campaign.hashtag : `#${campaign.hashtag}`]
        : [];
    return tags.join(" ");
  }, [campaign]);

  async function act(decision: "approved" | "rejected") {
    if (decision === "rejected" && !notes.trim()) {
      toast.error(t("partnerSubmissionsReview.rejectReasonRequired"));
      return;
    }
    setBusy(true);
    try {
      await onReview(submission.id, decision, notes);
      setNotes("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="cofex-app-card overflow-hidden p-0">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-11 w-11 border-2 border-[color:var(--cofex-pastel-blue)]">
            {submission.profiles?.avatar_url ? (
              <AvatarImage src={submission.profiles.avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="bg-[color:var(--cofex-cream)] text-sm font-bold text-[color:var(--cofex-coffee-deep)]">
              {explorerInitials(submission.profiles?.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-extrabold text-[color:var(--cofex-coffee-deep)]">{explorerName}</p>
            <p className="text-xs text-[color:var(--cofex-black)]/55">
              {t("partnerSubmissionsReview.submittedAt", {
                date: new Date(submission.created_at).toLocaleString(i18n.language),
              })}
            </p>
          </div>
        </div>
        <StatusPill
          status={submission.status}
          autoApproved={
            submission.status === "approved" &&
            !!submission.reviewed_by &&
            submission.reviewed_by === submission.user_id
          }
        />
      </div>

      <div className="border-t border-[color:var(--border)] bg-[color:var(--cofex-cream)]/30 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[color:var(--cofex-coffee-deep)]">{campaign?.title ?? "Campaign"}</span>
          <RewardTypeChip type={rewardType} label={t(`campaignMap.rewardTypes.${rewardType}`)} />
          {campaign?.reward_description ? (
            <span className="text-xs text-[color:var(--cofex-black)]/60">· {campaign.reward_description}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,10rem)_1fr] sm:p-5">
        <div className="shrink-0">
          {signedUrl ? (
            <a href={signedUrl} target="_blank" rel="noreferrer" className="block">
              <img
                src={signedUrl}
                alt=""
                className="aspect-[9/16] w-full max-w-[10rem] rounded-xl border object-cover shadow-sm"
              />
              <span className="mt-1 flex items-center justify-center gap-1 text-[10px] text-[color:var(--cofex-cyan)]">
                <ExternalLink className="h-3 w-3" /> {t("partnerSubmissionsReview.openScreenshot")}
              </span>
            </a>
          ) : submission.url ? (
            <a
              href={submission.url}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-[9/16] w-full max-w-[10rem] flex-col items-center justify-center gap-2 rounded-xl border bg-[color:var(--cofex-pastel-blue)]/20 p-3 text-center hover:bg-[color:var(--cofex-pastel-blue)]/40"
            >
              <ExternalLink className="h-6 w-6 text-[color:var(--cofex-cyan)]" />
              <span className="text-xs font-semibold text-[color:var(--cofex-coffee-deep)]">
                {t("partnerSubmissionsReview.openPost")}
              </span>
            </a>
          ) : (
            <div className="flex aspect-[9/16] w-full max-w-[10rem] items-center justify-center rounded-xl border bg-[color:var(--cofex-cream)]">
              <ImageIcon className="h-6 w-6 text-[color:var(--cofex-black)]/25" />
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <MetaRow
            icon={<CofexIconTile meta={getSocialPlatformIconMeta(submission.platform)} size="xs" />}
            label={t("partnerSubmissionsReview.platform")}
            value={platformLabel(submission.platform)}
          />
          <MetaRow
            icon={<MapPin className="h-3.5 w-3.5" />}
            label={t("partnerSubmissionsReview.checkIn")}
            value={
              submission.last_check_in_at
                ? new Date(submission.last_check_in_at).toLocaleString(i18n.language)
                : t("partnerSubmissionsReview.noCheckIn")
            }
          />
          {submission.url ? (
            <MetaRow
              icon={<ExternalLink className="h-3.5 w-3.5" />}
              label={t("partnerSubmissionsReview.postUrl")}
              value={
                <a href={submission.url} target="_blank" rel="noreferrer" className="break-all text-[color:var(--cofex-cyan)] underline">
                  {submission.url}
                </a>
              }
            />
          ) : null}
          {submission.caption ? (
            <div className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">
                {t("partnerSubmissionsReview.caption")}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[color:var(--cofex-coffee-deep)]">{submission.caption}</p>
            </div>
          ) : null}
          {hashtagLine ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 px-3 py-2 text-xs font-medium text-amber-950">
              {hashtagLine}
            </div>
          ) : null}
          {submission.explorer_note ? (
            <div className="rounded-xl bg-[color:var(--cofex-pastel-blue)]/25 px-3 py-2 text-xs text-[color:var(--cofex-coffee-deep)]">
              <span className="font-semibold">{t("partnerSubmissionsReview.explorerNote")}: </span>
              {submission.explorer_note}
            </div>
          ) : null}
          {submission.review_notes && submission.status !== "pending" ? (
            <div className="text-xs italic text-[color:var(--cofex-black)]/55">
              {t("partnerSubmissionsReview.yourNote")}: {submission.review_notes}
            </div>
          ) : null}
          {submission.redemption_code && submission.status === "approved" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-800">
                <Gift className="h-3.5 w-3.5" /> {t("partnerSubmissionsReview.rewardUnlocked")}
              </div>
              <p className="mt-1 font-mono text-lg font-bold tracking-[0.25em] text-emerald-900">
                {submission.redemption_code}
              </p>
              <p className="mt-0.5 text-xs text-emerald-800/80">
                +{submission.points_awarded ?? campaign?.points_reward ?? 0} XP ·{" "}
                <Link to="/partner/verify" className="underline">
                  {t("partnerSubmissionsReview.verifyAtCounter")}
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {submission.status === "pending" && (
        <div className="space-y-3 border-t border-[color:var(--border)] bg-[color:var(--cofex-cream)]/20 p-4 sm:p-5">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("partnerSubmissionsReview.rejectPlaceholder")}
            className="rounded-xl bg-white text-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={busy}
              onClick={() => act("approved")}
              className="flex-1 rounded-full bg-emerald-600 py-5 font-bold hover:bg-emerald-700"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {busy ? t("partnerSubmissionsReview.approving") : t("partnerSubmissionsReview.approve")}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => act("rejected")}
              className="flex-1 rounded-full border-rose-200 py-5 font-semibold text-rose-700 hover:bg-rose-50"
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              {t("partnerSubmissionsReview.reject")}
            </Button>
          </div>
          <p className="text-center text-[10px] text-[color:var(--cofex-black)]/45">
            {t("partnerSubmissionsReview.approveHint")}
          </p>
        </div>
      )}
    </article>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 text-[color:var(--cofex-cyan)]">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">{label}</div>
        <div className="mt-0.5 text-[color:var(--cofex-coffee-deep)]">{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ status, autoApproved }: { status: string; autoApproved?: boolean }) {
  const { t } = useTranslation();
  if (status === "approved")
    return (
      <PartnerStatusPill tone="success">
        <CheckCircle2 className="h-3 w-3" />{" "}
        {autoApproved ? t("submissionsPage.autoApproved") : t("submissionsPage.approved")}
      </PartnerStatusPill>
    );
  if (status === "rejected")
    return (
      <PartnerStatusPill tone="danger">
        <XCircle className="h-3 w-3" /> {t("submissionsPage.rejected")}
      </PartnerStatusPill>
    );
  return (
    <PartnerStatusPill tone="warn">
      <Clock className="h-3 w-3" /> {t("submissionsPage.pending")}
    </PartnerStatusPill>
  );
}
