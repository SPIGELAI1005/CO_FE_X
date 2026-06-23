import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Gift,
  MapPin,
  Megaphone,
  Navigation,
  Sparkles,
  X,
  CheckCircle2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { REWARD_MARKER_STYLES } from "@/lib/map/campaign-markers";
import { RewardTypeChip } from "@/components/app/CofexIconTile";
import { openingStatusLabel } from "@/lib/map/opening-hours";
import type { MapCampaignPin } from "@/lib/queries/campaign-map";

interface MapCampaignSheetProps {
  pin: MapCampaignPin | null;
  onClose: () => void;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function MapCampaignSheet({ pin, onClose }: MapCampaignSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={!!pin} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="z-[1200] max-h-[85dvh] overflow-y-auto rounded-t-3xl border-[color:var(--border)] bg-gradient-to-b from-[color:var(--cofex-cream-warm)] to-white px-5 pb-8 pt-2"
      >
        {pin && (
          <>
            <div className="cofex-campaign-card-media relative -mx-5 mb-4 h-36 overflow-hidden rounded-t-3xl bg-gradient-to-br from-[color:var(--cofex-pastel-blue)] to-[color:var(--cofex-cream)]">
              {(pin.coverImageUrl || pin.logoUrl) && (
                <img
                  src={pin.coverImageUrl ?? pin.logoUrl ?? ""}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
                {pin.logoUrl && pin.coverImageUrl && (
                  <img
                    src={pin.logoUrl}
                    alt=""
                    className="h-12 w-12 rounded-xl border-2 border-white object-cover shadow-lg"
                  />
                )}
                <div className="min-w-0 flex-1 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                    {pin.slogan}
                  </p>
                  <h2 className="truncate text-lg font-extrabold">{pin.shopName}</h2>
                </div>
              </div>
            </div>

            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
                {pin.title}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-[color:var(--cofex-cream)]/80 px-2.5 py-1 text-xs font-semibold text-[color:var(--cofex-coffee-deep)]">
                <RewardTypeChip type={pin.rewardType} label={t(`campaignMap.rewardTypes.${pin.rewardType}`)} />
              </span>
              {pin.isExpiringSoon && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <Clock className="h-3 w-3" /> {t("campaignMap.expiringSoon")}
                </span>
              )}
              {pin.isLimited && pin.remainingQuantity != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
                  <Sparkles className="h-3 w-3" /> {t("campaignMap.limited")}
                </span>
              )}
              {pin.visited && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" /> {t("campaignMap.collected")}
                </span>
              )}
              {pin.isOpenNow != null && (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    pin.isOpenNow
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-black)]/60"
                  }`}
                >
                  {t(`campaignMap.opening.${openingStatusLabel(pin.isOpenNow)}`)}
                </span>
              )}
            </div>

            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cofex-black)]/45">
                    {t("campaignMap.reward")}
                  </p>
                  <p className="font-medium text-[color:var(--cofex-coffee-deep)]">
                    {pin.rewardDescription ?? t("campaignsPage.surpriseReward")}
                  </p>
                </div>
              </li>
              {pin.remainingQuantity != null && (
                <li className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cofex-black)]/45">
                      {t("campaignMap.remaining")}
                    </p>
                    <p className="font-medium">{t("campaignsPage.spotsLeft", { count: pin.remainingQuantity })}</p>
                  </div>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cofex-black)]/45">
                    {t("campaignMap.distance")}
                  </p>
                  <p className="font-medium">{formatDistance(pin.distanceKm)}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cofex-black)]/45">
                    {t("campaignMap.socialAction")}
                  </p>
                  <p className="font-medium">{pin.socialActionLabel}</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--cofex-black)]/45">
                    {t("campaignMap.cafe")}
                  </p>
                  <Link
                    to="/coffee/$slug"
                    params={{ slug: pin.shopSlug }}
                    className="font-medium text-[color:var(--cofex-cyan)] hover:underline"
                    onClick={onClose}
                  >
                    {pin.shopName}
                  </Link>
                </div>
              </li>
            </ul>

            <div className="mt-6 space-y-2">
              <Button asChild className="w-full rounded-full py-6 text-base font-bold" size="lg">
                <Link to="/campaign/$id" params={{ id: pin.campaignId }} onClick={onClose}>
                  {pin.joined ? t("campaignMap.continueMission") : t("campaignMap.startMission")}
                </Link>
              </Button>
            </div>

            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-1.5 text-[color:var(--cofex-black)]/50 shadow hover:bg-white"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" />
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
