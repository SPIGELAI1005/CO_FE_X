import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Gift,
  MapPin,
  Megaphone,
  MessageSquareText,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CheckInRpcResult } from "@/lib/rpc/client";
import { useUser } from "@/hooks/use-user";
import { useChallengeClaims, useCoffeeRadar, useExplorerChallengeDefs } from "@/lib/queries/radar";
import { useCityCollectionProgress } from "@/lib/queries/city-collections";
import { buildChallengeView, EXPLORER_CHALLENGES } from "@/lib/explorer-challenges";
import { getPostCheckInActions, type PostCheckInActionId } from "@/lib/post-check-in-actions";
import { trackExplorerEvent } from "@/lib/explorer-analytics";

interface ShopCampaign {
  id: string;
  title: string;
  reward_description?: string | null;
}

interface PostCheckInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: CheckInRpcResult;
  shop: {
    slug: string;
    name: string;
    citySlug?: string;
  };
  campaigns?: ShopCampaign[];
  onWriteReview: () => void;
}

const ACTION_ICONS: Record<PostCheckInActionId, React.ComponentType<{ className?: string }>> = {
  claimable_challenge: Trophy,
  city_almost_done: MapPin,
  write_review: MessageSquareText,
  campaign: Megaphone,
  passport: BookOpen,
  explore: Compass,
};

export function PostCheckInSheet({
  open,
  onOpenChange,
  result,
  shop,
  campaigns = [],
  onWriteReview,
}: PostCheckInSheetProps) {
  const { user } = useUser();
  const claimsQuery = useChallengeClaims(user?.id);
  const radarQuery = useCoffeeRadar(null);
  const defsQuery = useExplorerChallengeDefs();
  const cityQuery = useCityCollectionProgress(shop.citySlug, user?.id);

  const claimableChallenge = useMemo(() => {
    if (!open) return null;
    const challenges = defsQuery.data ?? EXPLORER_CHALLENGES;
    const views = buildChallengeView(
      radarQuery.data?.stats,
      claimsQuery.data?.claims ?? [],
      claimsQuery.data?.weekPeriodKey ?? "",
      challenges,
    );
    return views.find((v) => v.claimable) ?? null;
  }, [open, defsQuery.data, radarQuery.data?.stats, claimsQuery.data]);

  const cityProgress = useMemo(() => {
    const p = cityQuery.data;
    if (!p) return null;
    return {
      cityName: p.city_name,
      visited: p.visited,
      target: p.shops_target,
    };
  }, [cityQuery.data]);

  const actions = useMemo(
    () =>
      getPostCheckInActions({
        campaigns,
        claimableChallenge: claimableChallenge
          ? { title: claimableChallenge.challenge.title, reward: claimableChallenge.challenge.reward }
          : null,
        cityProgress,
      }),
    [campaigns, claimableChallenge, cityProgress],
  );

  useEffect(() => {
    if (open) {
      trackExplorerEvent("post_checkin_sheet_opened", { shop_slug: shop.slug });
      if (shop.citySlug) trackExplorerEvent("city_collection_viewed", { city_slug: shop.citySlug });
    }
  }, [open, shop.slug, shop.citySlug]);

  function handleAction(id: PostCheckInActionId) {
    trackExplorerEvent("post_checkin_action", { action: id });
    onOpenChange(false);
    if (id === "write_review") onWriteReview();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[1200] max-h-[85dvh] overflow-y-auto rounded-t-3xl border-[color:var(--border)] bg-white px-5 pb-8 pt-2"
      >
        <SheetHeader className="text-left">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--cofex-pastel-blue)]">
            <CheckCircle2 className="h-7 w-7 text-[color:var(--cofex-cyan)]" />
          </div>
          <SheetTitle className="text-xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
            Check-in confirmed!
          </SheetTitle>
          <SheetDescription className="text-[color:var(--cofex-black)]/65">
            +{result.points_awarded} pts at {shop.name} · {result.total_points.toLocaleString()} total ·{" "}
            {result.total_check_ins} visits
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <p className="mb-3 text-[10px] font-bold tracking-[0.25em] text-[color:var(--cofex-cyan)] uppercase">
            What&apos;s next?
          </p>
          <div className="space-y-2">
            {actions.map((action) => {
              const Icon = ACTION_ICONS[action.id];

              if (action.id === "write_review") {
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="cofex-app-card flex w-full items-center gap-3 p-3 text-left transition hover:-translate-y-0.5"
                    onClick={() => handleAction(action.id)}
                  >
                    <ActionInner Icon={Icon} title={action.title} subtitle={action.subtitle} />
                  </button>
                );
              }

              const linkProps =
                action.id === "claimable_challenge"
                  ? { to: "/radar" as const }
                  : action.id === "city_almost_done" && shop.citySlug
                    ? { to: "/city/$city" as const, params: { city: shop.citySlug } }
                    : action.id === "campaign" && campaigns[0]
                      ? { to: "/campaign/$id" as const, params: { id: campaigns[0].id } }
                      : action.id === "passport"
                        ? { to: "/passport" as const }
                        : action.id === "explore"
                          ? { to: "/explore" as const }
                          : null;

              if (!linkProps) return null;

              return (
                <Link
                  key={action.id}
                  {...linkProps}
                  className="cofex-app-card flex w-full items-center gap-3 p-3 text-left transition hover:-translate-y-0.5"
                  onClick={() => handleAction(action.id)}
                >
                  <ActionInner Icon={Icon} title={action.title} subtitle={action.subtitle} />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[color:var(--cofex-black)]/45">
          <MapPin className="h-3 w-3" />
          Stamp saved · <Sparkles className="h-3 w-3" /> Points added to wallet
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionInner({
  Icon,
  title,
  subtitle,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cofex-pastel-blue)]">
        <Icon className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[color:var(--cofex-coffee-deep)]">{title}</div>
        <div className="truncate text-xs text-[color:var(--cofex-black)]/55">{subtitle}</div>
      </div>
      {title.includes("review") && (
        <span className="shrink-0 text-[10px] font-bold text-[color:var(--cofex-coffee-deep)]">+5</span>
      )}
      {title.includes("campaign") && <Gift className="h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />}
      {(title.startsWith("Claim") || title.startsWith("Almost")) && (
        <Sparkles className="h-4 w-4 shrink-0 text-[color:var(--cofex-accent-gold)]" />
      )}
    </>
  );
}
