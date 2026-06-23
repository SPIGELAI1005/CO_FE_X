import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppPage } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Gift,
  Map as MapIcon,
  QrCode,
  Sparkles,
} from "lucide-react";
import { CampaignJoinConsent } from "@/components/app/CampaignJoinConsent";
import { SocialProofSubmit } from "@/components/app/SocialProofSubmit";
import { CampaignRewardQr } from "@/components/app/CampaignRewardQr";
import { GiftRewardDialog } from "@/components/app/GiftRewardDialog";
import { CampaignMissionInfo } from "@/components/app/CampaignMissionInfo";
import {
  getCampaignMissionMicrocopy,
  CampaignMissionSteps,
} from "@/components/app/CampaignMissionSteps";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { EmptyState } from "@/components/patterns/EmptyState";
import { useUser } from "@/hooks/use-user";
import {
  useCampaignDetail,
  useJoinCampaign,
  useRedeemCampaign,
} from "@/lib/queries/campaigns";
import {
  canRedeemViaButton,
  getCampaignExplorerPhase,
  needsSocialProof,
} from "@/lib/campaign-fulfillment";
import { resolveMissionSteps, formatExpiryCountdown } from "@/lib/campaign-mission";
import { RewardTypeChip } from "@/components/app/CofexIconTile";
import { canJoinCampaign } from "@/lib/campaign-availability";
import { trackExplorerEvent } from "@/lib/explorer-analytics";
import { mapJoinCampaignErrorMessage } from "@/lib/rpc/client";
import { canGiftCampaignReward } from "@/lib/reward-gifts";
import { usePendingRewardGift } from "@/lib/queries/reward-gifts";

type CampaignSearch = {
  src?: string;
  token?: string;
};

export const Route = createFileRoute("/_authenticated/_explorer/campaign/$id")({
  validateSearch: (search: Record<string, unknown>): CampaignSearch => ({
    src: typeof search.src === "string" ? search.src : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({ meta: [{ title: "Campaign · CO:FE(X)" }] }),
  component: CampaignDetailPage,
});

function CampaignDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/_authenticated/_explorer/campaign/$id" });
  const search = useSearch({ from: "/_authenticated/_explorer/campaign/$id" });
  const { user } = useUser();
  const detailQuery = useCampaignDetail(id, user?.id);

  useEffect(() => {
    if (search.src !== "qr" || !user?.id) return;
    if (detailQuery.isLoading || !detailQuery.data?.campaign) return;
    trackExplorerEvent("post_checkin_action", { action: "campaign_qr_scanned", campaign_id: id });
  }, [search.src, user?.id, detailQuery.isLoading, detailQuery.data, id]);

  return (
    <QueryBoundary query={detailQuery} loadingLabel={t("campaignMission.loading")}>
      {({ campaign, user: userState }) =>
        !campaign ? (
          <div className="mx-auto max-w-md p-8">
            <EmptyState
              title={t("campaignMission.notFoundTitle")}
              description={t("campaignMission.notFoundDescription")}
              actionLabel={t("campaignMission.allCampaigns")}
              actionTo="/campaigns"
            />
          </div>
        ) : (
          <CampaignDetailView
            campaign={campaign}
            userState={userState}
            userId={user?.id}
            scannedViaQr={search.src === "qr"}
          />
        )
      }
    </QueryBoundary>
  );
}

function CampaignDetailView({
  campaign: c,
  userState,
  userId,
  scannedViaQr,
}: {
  campaign: NonNullable<Awaited<ReturnType<typeof useCampaignDetail>>["data"]>["campaign"];
  userState: NonNullable<Awaited<ReturnType<typeof useCampaignDetail>>["data"]>["user"];
  userId: string | undefined;
  scannedViaQr: boolean;
}) {
  const { t } = useTranslation();
  const joinMutation = useJoinCampaign(userId);
  const redeemMutation = useRedeemCampaign(userId);
  const [giftOpen, setGiftOpen] = useState(false);

  const required = Math.max(1, c.required_check_ins ?? 1);
  const cover = c.cover_image_url ?? c.coffee_shops?.cover_image_url;
  const joinEligibility = canJoinCampaign({
    status: c.status,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    availableQuantity: c.available_quantity,
    maxParticipants: c.max_participants,
    participantCount: userState.participantCount,
  });
  const ended = !joinEligibility.ok && joinEligibility.reason === "expired";
  const full = !joinEligibility.ok && joinEligibility.reason === "full";
  const notStarted = !joinEligibility.ok && joinEligibility.reason === "not_started";
  const qualified = userState.myCheckIns >= required;
  const busy = joinMutation.isPending || redeemMutation.isPending;
  const redemption = userState.redemption;
  const pendingGiftQuery = usePendingRewardGift(redemption?.id);
  const pendingGift = pendingGiftQuery.data;
  const canGift =
    !!redemption?.id &&
    canGiftCampaignReward({
      rewardStatus: redemption.reward_status,
      usedAt: redemption.used_at,
      expiresAt: redemption.expires_at,
      giftingEnabled: c.gifting_enabled,
      hasPendingGift: !!pendingGift,
    });
  const expiryLabel =
    notStarted && c.starts_at
      ? t("campaignMission.startsOn", {
          date: new Date(c.starts_at).toLocaleDateString(),
        })
      : formatExpiryCountdown(c.ends_at);

  const cap = c.available_quantity ?? c.max_participants;
  const remaining =
    cap != null ? Math.max(0, cap - userState.participantCount) : null;

  const phase = getCampaignExplorerPhase({
    joined: userState.joined,
    ended,
    full,
    fulfillmentMode: c.fulfillment_mode,
    myCheckIns: userState.myCheckIns,
    requiredCheckIns: required,
    redemptionCode: redemption?.redemption_code ?? null,
    socialStatus: userState.latestSocialStatus,
  });

  const missionSteps = useMemo(
    () =>
      resolveMissionSteps({
        fulfillmentMode: c.fulfillment_mode,
        joined: userState.joined,
        phase,
        myCheckIns: userState.myCheckIns,
        requiredCheckIns: required,
        hasSocialSubmission: userState.socialSubmissions.length > 0,
        latestSocialStatus: userState.latestSocialStatus,
        hasRedemption: !!redemption,
        rewardUsed: !!redemption?.used_at,
      }),
    [c.fulfillment_mode, userState, phase, required, redemption],
  );

  const microcopyKey = getCampaignMissionMicrocopy(phase, userState.joined);

  async function join(consent: { termsAccepted: boolean; disclosureAcknowledged: boolean }) {
    try {
      await joinMutation.mutateAsync({
        campaignId: c.id,
        source: scannedViaQr ? "qr" : undefined,
        termsAccepted: consent.termsAccepted,
        disclosureAcknowledged: consent.disclosureAcknowledged,
      });
      toast.success(scannedViaQr ? t("campaignMission.toastJoinedQr") : t("campaignMission.toastJoined"));
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      toast.error(mapJoinCampaignErrorMessage(raw, t));
    }
  }

  async function redeem() {
    try {
      const data = await redeemMutation.mutateAsync(c.id);
      toast.success(
        t("campaignMission.toastRedeemed", { points: data.points_awarded ?? c.points_reward }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : t("campaignMission.toastRedeemError"));
    }
  }

  const showSocialFlow =
    userState.joined &&
    needsSocialProof(c.fulfillment_mode) &&
    !redemption &&
    (phase === "social_post" || userState.latestSocialStatus === "rejected");

  return (
    <AppPage>
      <div className="relative min-h-[16rem] bg-gradient-to-br from-[color:var(--cofex-coffee-deep)] to-[color:var(--cofex-black)] md:min-h-[20rem]">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        <div className="relative flex items-start justify-between gap-2 p-4 sm:p-5">
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[color:var(--cofex-coffee-deep)] shadow"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("campaignMission.allCampaigns")}
          </Link>
          <div className="flex gap-2">
            <Link
              to="/campaign-map"
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/25"
            >
              <MapIcon className="h-3.5 w-3.5" /> {t("campaignsPage.viewMap")}
            </Link>
            {scannedViaQr && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <QrCode className="h-3 w-3" /> QR
              </span>
            )}
          </div>
        </div>

        <div className="relative px-5 pb-6 pt-2 text-white sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--cofex-accent-gold)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[color:var(--cofex-coffee-deep)] shadow">
            <Sparkles className="h-3 w-3" />
            {c.slogan}
          </span>

          <h1 className="mt-3 text-2xl font-extrabold leading-tight md:text-4xl">{c.title}</h1>

          {c.coffee_shops && (
            <Link
              to="/coffee/$slug"
              params={{ slug: c.coffee_shops.slug }}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:underline"
            >
              {c.coffee_shops.name}
              {c.coffee_shops.city ? ` · ${c.coffee_shops.city}` : ""}
            </Link>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
              <RewardTypeChip type={c.reward_type} label={t(`campaignMap.rewardTypes.${c.reward_type}`)} />
            </span>
            {expiryLabel && (
              <span className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-white">
                {expiryLabel}
              </span>
            )}
            {remaining != null && remaining <= 10 && (
              <span className="rounded-full bg-violet-500/90 px-3 py-1 text-xs font-bold text-white">
                {t("campaignsPage.spotsLeft", { count: remaining })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-5">
        {!userState.joined && (
          <CampaignJoinConsent
            fulfillmentMode={c.fulfillment_mode}
            cafeTerms={c.terms_and_conditions}
            requirements={c.requirements}
            scannedViaQr={scannedViaQr}
            disabled={!joinEligibility.ok}
            disabledReason={
              full ? "full" : ended ? "ended" : notStarted ? "not_started" : undefined
            }
            startsAt={c.starts_at}
            busy={busy}
            onJoin={join}
          />
        )}

        <CampaignMissionSteps steps={missionSteps} microcopyKey={microcopyKey} />

        {redemption ? (
          <>
            <CampaignRewardQr
              redemptionCode={redemption.redemption_code}
              campaignTitle={c.title}
              shopName={c.coffee_shops?.name ?? t("campaignMission.hostCafe")}
              rewardDescription={c.reward_description}
              pointsAwarded={redemption.points_awarded}
              usedAt={redemption.used_at}
              expiresAt={redemption.expires_at}
              rewardStatus={redemption.reward_status}
              giftPending={!!pendingGift}
            />
            {(canGift || pendingGift) && redemption.id ? (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => setGiftOpen(true)}
              >
                <Gift className="mr-2 h-4 w-4" />
                {pendingGift ? t("rewardGift.manageGift") : t("rewardGift.giftBtn")}
              </Button>
            ) : null}
            {redemption.id ? (
              <GiftRewardDialog
                open={giftOpen}
                onOpenChange={setGiftOpen}
                redemptionId={redemption.id}
                campaignTitle={c.title}
                shopName={c.coffee_shops?.name ?? t("campaignMission.hostCafe")}
                pendingGift={pendingGift}
              />
            ) : null}
          </>
        ) : (
          userState.joined && (
            <div className="cofex-app-card p-5">
              {phase === "pending_review" ? (
                <div className="rounded-xl bg-amber-50 px-4 py-4 text-center">
                  <p className="font-semibold text-amber-900">{t("campaignMission.pendingReviewTitle")}</p>
                  <p className="mt-1 text-sm text-amber-800">{t("campaignMission.pendingReviewBody")}</p>
                </div>
              ) : canRedeemViaButton(c.fulfillment_mode) &&
                c.fulfillment_mode === "check_in" &&
                qualified ? (
                <Button
                  disabled={busy}
                  onClick={redeem}
                  className="w-full rounded-full bg-gradient-to-r from-[color:var(--cofex-accent-gold)] to-amber-600 py-6 text-base font-bold text-[color:var(--cofex-coffee-deep)]"
                  size="lg"
                >
                  {busy ? t("campaignMission.unlocking") : t("campaignMission.unlockReward")}
                </Button>
              ) : phase === "check_in" && c.coffee_shops ? (
                <div className="text-center">
                  <Camera className="mx-auto mb-2 h-6 w-6 text-[color:var(--cofex-cyan)]" />
                  <p className="text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">
                    {t("campaignMission.checkInCta")}
                  </p>
                  <Link
                    to="/coffee/$slug"
                    params={{ slug: c.coffee_shops.slug }}
                    className="mt-3 inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--cofex-coffee-deep)] hover:border-[color:var(--cofex-cyan)]"
                  >
                    {t("campaignMission.goToCafe", { name: c.coffee_shops.name })}
                  </Link>
                </div>
              ) : null}
            </div>
          )
        )}

        {showSocialFlow && (
          <SocialProofSubmit
            campaignId={c.id}
            hashtag={c.hashtag}
            hashtags={c.hashtags}
            shopName={c.coffee_shops?.name}
            shopCity={c.coffee_shops?.city}
            shopAddress={c.coffee_shops?.address}
            campaignTitle={c.title}
            campaignSlogan={c.slogan}
            rewardType={c.reward_type}
            rewardDescription={c.reward_description}
            coverImageUrl={cover ?? c.coffee_shops?.cover_image_url}
            socialLinks={c.coffee_shops?.social_links ?? null}
            socialRequirements={c.social_requirements}
          />
        )}

        <CampaignMissionInfo
          campaign={c}
          participantCount={userState.participantCount}
          remainingQuantity={remaining}
        />
      </div>
    </AppPage>
  );
}
