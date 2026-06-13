import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AppPage } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Gift,
  Hash,
  MapPin,
  Users,
  Megaphone,
  Camera,
  QrCode,
} from "lucide-react";
import { SocialProofSubmit } from "@/components/app/SocialProofSubmit";
import { CampaignRewardQr } from "@/components/app/CampaignRewardQr";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { EmptyState } from "@/components/patterns/EmptyState";
import { useUser } from "@/hooks/use-user";
import {
  useCampaignDetail,
  useJoinCampaign,
  useRedeemCampaign,
} from "@/lib/queries/campaigns";
import {
  FULFILLMENT_MODE_LABELS,
  canRedeemViaButton,
  getCampaignExplorerPhase,
  needsSocialProof,
} from "@/lib/campaign-fulfillment";
import { trackExplorerEvent } from "@/lib/explorer-analytics";

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
  const { id } = useParams({ from: "/_authenticated/_explorer/campaign/$id" });
  const search = useSearch({ from: "/_authenticated/_explorer/campaign/$id" });
  const { user } = useUser();
  const detailQuery = useCampaignDetail(id, user?.id);
  const joinMutation = useJoinCampaign(user?.id);
  const qrJoinAttempted = useRef(false);

  useEffect(() => {
    if (search.src !== "qr" || !user?.id || joinMutation.isPending || qrJoinAttempted.current) return;
    if (detailQuery.isLoading || !detailQuery.data?.campaign) return;
    if (detailQuery.data.user.joined) return;
    qrJoinAttempted.current = true;
    trackExplorerEvent("post_checkin_action", { action: "campaign_qr_scanned", campaign_id: id });
    joinMutation.mutate(
      { campaignId: id, source: "qr" },
      {
        onSuccess: () => toast.success("Welcome! You're in this EEFFOC campaign."),
        onError: (err) => {
          qrJoinAttempted.current = false;
          toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : "Could not join");
        },
      },
    );
  }, [search.src, user?.id, detailQuery.isLoading, detailQuery.data, id, joinMutation]);

  return (
    <QueryBoundary query={detailQuery} loadingLabel="Loading campaign…">
      {({ campaign, user: userState }) =>
        !campaign ? (
          <div className="mx-auto max-w-md p-8">
            <EmptyState
              title="Campaign not found"
              description="This campaign may have ended or been removed."
              actionLabel="All campaigns"
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
  const joinMutation = useJoinCampaign(userId);
  const redeemMutation = useRedeemCampaign(userId);

  const required = Math.max(1, c.required_check_ins ?? 1);
  const progress = Math.min(100, Math.round((userState.myCheckIns / required) * 100));
  const cover = c.cover_image_url ?? c.coffee_shops?.cover_image_url;
  const full = c.max_participants ? userState.participantCount >= c.max_participants : false;
  const ended = c.ends_at ? new Date(c.ends_at) < new Date() : false;
  const qualified = userState.myCheckIns >= required;
  const busy = joinMutation.isPending || redeemMutation.isPending;
  const redemption = userState.redemption;

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

  async function join() {
    try {
      await joinMutation.mutateAsync({ campaignId: c.id });
      toast.success("You're in! Follow the steps below to unlock your reward.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : "Could not join");
    }
  }

  async function redeem() {
    try {
      const data = await redeemMutation.mutateAsync(c.id);
      toast.success(`Reward unlocked! +${data.points_awarded ?? c.points_reward} points`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : "Could not redeem");
    }
  }

  const showSocialFlow =
    userState.joined &&
    needsSocialProof(c.fulfillment_mode) &&
    !redemption &&
    (phase === "social_post" || userState.latestSocialStatus === "rejected");

  return (
    <AppPage>
      <div className="relative h-56 bg-gradient-to-br from-[color:var(--cofex-pastel-blue)] to-[color:var(--cofex-cream)] md:h-72">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <Link
          to="/campaigns"
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium shadow"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All campaigns
        </Link>
        {scannedViaQr && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <QrCode className="h-3 w-3" /> Joined via QR
          </span>
        )}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="text-xs uppercase tracking-widest opacity-80">{c.hashtag}</div>
          <h1 className="text-2xl font-bold md:text-3xl">{c.title}</h1>
          {c.coffee_shops && (
            <Link
              to="/coffee/$slug"
              params={{ slug: c.coffee_shops.slug }}
              className="mt-1 inline-flex items-center gap-1 text-sm opacity-90 hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" /> {c.coffee_shops.name}
              {c.coffee_shops.city ? ` · ${c.coffee_shops.city}` : ""}
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 px-5 py-6">
        <p className="text-sm leading-relaxed text-[color:var(--cofex-black)]/75">{c.description}</p>

        <div className="cofex-app-card p-5">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--cofex-pastel-blue)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--cofex-coffee-deep)]">
            <Megaphone className="h-3 w-3" /> {FULFILLMENT_MODE_LABELS[c.fulfillment_mode]}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Stat Icon={Gift} label="Reward" value={c.reward_description ?? "-"} />
            <Stat Icon={Gift} label="Bonus points" value={`+${c.points_reward}`} />
            <Stat
              Icon={Users}
              label="Participants"
              value={`${userState.participantCount}${c.max_participants ? ` / ${c.max_participants}` : ""}`}
            />
            <Stat Icon={Calendar} label="Ends" value={c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "No end"} />
          </div>
          {c.requirements && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="mb-1 inline-flex items-center gap-1 font-semibold">
                <Hash className="h-3.5 w-3.5" /> How to participate
              </div>
              {c.requirements}
            </div>
          )}
        </div>

        {redemption ? (
          <CampaignRewardQr
            redemptionCode={redemption.redemption_code}
            rewardDescription={c.reward_description}
            pointsAwarded={redemption.points_awarded}
            usedAt={redemption.used_at}
          />
        ) : (
          <div className="cofex-app-card p-5">
            <PhaseSteps phase={phase} fulfillmentMode={c.fulfillment_mode} />

            {c.fulfillment_mode !== "social_proof" && (
              <>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[color:var(--cofex-coffee-deep)]">Check-in progress</span>
                  <span className="text-[color:var(--cofex-black)]/55">
                    {Math.min(userState.myCheckIns, required)} / {required}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}

            <div className="mt-4">
              {!userState.joined ? (
                <Button disabled={busy || full || ended} onClick={join} className="w-full rounded-full bg-amber-700 hover:bg-amber-800">
                  {full ? "Campaign full" : ended ? "Campaign ended" : busy ? "Joining…" : "Join EEFFOC campaign"}
                </Button>
              ) : phase === "pending_review" ? (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                  Your post is with the café. You&apos;ll get a reward QR when approved.
                </div>
              ) : canRedeemViaButton(c.fulfillment_mode) && c.fulfillment_mode === "check_in" && qualified ? (
                <Button
                  disabled={busy}
                  onClick={redeem}
                  className="w-full rounded-full bg-gradient-to-r from-amber-600 to-orange-700 text-white"
                >
                  {busy ? "Unlocking…" : `Redeem reward (+${c.points_reward} pts)`}
                </Button>
              ) : userState.joined && phase === "check_in" && c.coffee_shops ? (
                <div className="text-center text-sm text-[color:var(--cofex-black)]/65">
                  <Camera className="mx-auto mb-2 h-5 w-5 text-[color:var(--cofex-cyan)]" />
                  Visit{" "}
                  <Link to="/coffee/$slug" params={{ slug: c.coffee_shops.slug }} className="font-medium underline">
                    {c.coffee_shops.name}
                  </Link>{" "}
                  and check in to continue.
                </div>
              ) : null}
            </div>
          </div>
        )}

        {showSocialFlow && (
          <SocialProofSubmit
            campaignId={c.id}
            hashtag={c.hashtag}
            shopName={c.coffee_shops?.name}
            campaignTitle={c.title}
            socialRequirements={c.social_requirements}
          />
        )}

        {userState.joined && phase === "pending_review" && !redemption && (
          <div className="cofex-app-card px-4 py-3 text-center text-sm text-amber-900">
            Waiting for café approval. Your reward QR will appear here once approved.
          </div>
        )}
      </div>
    </AppPage>
  );
}

function PhaseSteps({
  phase,
  fulfillmentMode,
}: {
  phase: ReturnType<typeof getCampaignExplorerPhase>;
  fulfillmentMode: string;
}) {
  const steps =
    fulfillmentMode === "social_proof"
      ? ["Join", "Post & submit proof", "Get reward QR"]
      : fulfillmentMode === "hybrid"
        ? ["Join", "Check in", "Post & submit proof", "Get reward QR"]
        : ["Join", "Check in", "Redeem at counter"];

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--cofex-coffee-deep)]">Your path</div>
      <ol className="mt-2 flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              phase === "reward" || i < stepIndexForPhase(phase, fulfillmentMode)
                ? "bg-amber-100 text-amber-900"
                : "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-black)]/45"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function stepIndexForPhase(phase: ReturnType<typeof getCampaignExplorerPhase>, mode: string): number {
  if (phase === "join") return 0;
  if (phase === "check_in") return mode === "hybrid" ? 1 : 1;
  if (phase === "social_post" || phase === "pending_review") return mode === "hybrid" ? 2 : 1;
  return 3;
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-[color:var(--cofex-black)]/45">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 truncate font-medium text-[color:var(--cofex-coffee-deep)]">{value}</div>
    </div>
  );
}
