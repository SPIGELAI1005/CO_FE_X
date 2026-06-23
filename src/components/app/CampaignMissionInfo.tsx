import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Clock,
  ExternalLink,
  Gift,
  Hash,
  MapPin,
  Megaphone,
  Navigation,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { FULFILLMENT_MODE_LABELS } from "@/lib/campaign-fulfillment";
import { formatExpiryCountdown } from "@/lib/campaign-mission";
import type { CampaignDetail } from "@/lib/queries/campaigns";

interface CampaignMissionInfoProps {
  campaign: CampaignDetail;
  participantCount: number;
  remainingQuantity: number | null;
}

export function CampaignMissionInfo({ campaign: c, participantCount, remainingQuantity }: CampaignMissionInfoProps) {
  const { t } = useTranslation();
  const shop = c.coffee_shops;
  const expiry = formatExpiryCountdown(c.ends_at);
  const allHashtags = [
    ...c.hashtags,
    ...(c.hashtag && !c.hashtags.includes(c.hashtag) ? [c.hashtag] : []),
  ].filter(Boolean);

  const mapsUrl =
    shop?.latitude != null && shop?.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`
      : shop?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`
        : null;

  return (
    <div className="space-y-4">
      <div className="cofex-app-card overflow-hidden p-0">
        {c.cover_image_url && (
          <div className="relative h-40 bg-[color:var(--cofex-cream)]">
            <img src={c.cover_image_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        <div className="p-5">
        <div className="flex gap-4">
          <CofexIconTile rewardType={c.reward_type} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--cofex-cyan)]">
              {t("campaignMission.rewardType")}
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
              {t(`campaignMap.rewardTypes.${c.reward_type}`)}
            </p>
            <p className="mt-1 text-sm text-[color:var(--cofex-black)]/70">
              {c.reward_description ?? t("campaignsPage.surpriseReward")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoTile
            icon={Megaphone}
            label={t("campaignMission.requiredAction")}
            value={FULFILLMENT_MODE_LABELS[c.fulfillment_mode]}
          />
          <InfoTile
            icon={Sparkles}
            label={t("campaignMission.bonusXp")}
            value={`+${c.points_reward}`}
          />
          <InfoTile
            icon={Users}
            label={t("campaignMission.availability")}
            value={
              remainingQuantity != null
                ? t("campaignsPage.spotsLeft", { count: remainingQuantity })
                : t("campaignMission.unlimited")
            }
          />
          <InfoTile
            icon={Clock}
            label={t("campaignMission.expires")}
            value={
              expiry ??
              (c.ends_at ? new Date(c.ends_at).toLocaleDateString() : t("campaignMission.noExpiry"))
            }
            highlight={!!expiry}
          />
        </div>
        </div>
      </div>

      {c.description && (
        <div className="cofex-app-card p-5">
          <h3 className="text-sm font-extrabold text-[color:var(--cofex-coffee-deep)]">
            {t("campaignMission.aboutMission")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--cofex-black)]/75">{c.description}</p>
        </div>
      )}

      {shop && (
        <div className="cofex-app-card p-5">
          <h3 className="text-sm font-extrabold text-[color:var(--cofex-coffee-deep)]">
            {t("campaignMission.location")}
          </h3>
          <LinkBlock shop={shop} mapsUrl={mapsUrl} />
          {shop.description && (
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--cofex-black)]/70">{shop.description}</p>
          )}
        </div>
      )}

      {allHashtags.length > 0 && (
        <div className="cofex-app-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[color:var(--cofex-coffee-deep)]">
            <Hash className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
            {t("campaignMission.hashtags")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {allHashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[color:var(--cofex-pastel-blue)] px-3 py-1 text-xs font-semibold text-[color:var(--cofex-coffee-deep)]"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-[color:var(--cofex-black)]/55">{t("campaignMission.hashtagHint")}</p>
        </div>
      )}

      {(c.requirements || c.terms_and_conditions) && (
        <div className="cofex-app-card p-5">
          {c.requirements && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[color:var(--cofex-coffee-deep)]">
                <Gift className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
                {t("campaignMission.rewardRules")}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--cofex-black)]/75">
                {c.requirements}
              </p>
            </div>
          )}
          {c.terms_and_conditions && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--cofex-black)]/75">
              {c.terms_and_conditions}
            </p>
          )}
        </div>
      )}

      <div className="cofex-app-card rounded-xl border border-[color:var(--border)] bg-[color:var(--cofex-cream)]/50 p-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/55">
          <Shield className="h-3.5 w-3.5" />
          {t("campaignMission.termsTitle")}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--cofex-black)]/65">
          {t("campaignMission.termsDefault")}
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-[10px] text-[color:var(--cofex-black)]/45">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          {t("campaignMission.termsReminder")}
        </p>
      </div>

      <p className="text-center text-xs text-[color:var(--cofex-black)]/40">
        {c.max_participants
          ? t("campaignMission.participantCount_max", {
              count: participantCount,
              max: c.max_participants,
            })
          : t("campaignMission.participantCount", { count: participantCount })}
      </p>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[color:var(--cofex-cream)]/60 px-3 py-2.5">
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/45">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div
        className={`mt-0.5 truncate text-sm font-bold ${
          highlight ? "text-amber-700" : "text-[color:var(--cofex-coffee-deep)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function LinkBlock({
  shop,
  mapsUrl,
}: {
  shop: NonNullable<CampaignDetail["coffee_shops"]>;
  mapsUrl: string | null;
}) {
  const { t } = useTranslation();
  const locationLine = [shop.address, shop.city].filter(Boolean).join(", ");

  return (
    <div className="mt-2">
      <p className="font-semibold text-[color:var(--cofex-coffee-deep)]">{shop.name}</p>
      {locationLine && (
        <p className="mt-1 flex items-start gap-1.5 text-sm text-[color:var(--cofex-black)]/65">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
          {locationLine}
        </p>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--cofex-coffee-deep)] transition hover:border-[color:var(--cofex-cyan)]"
        >
          <Navigation className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" />
          {t("campaignMission.openMaps")}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
      )}
    </div>
  );
}
