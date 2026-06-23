import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MapPin, Gift } from "lucide-react";
import type { PassportStamp } from "@/lib/queries/passport-stamps";
import {
  STAMP_CATEGORY_LABEL_KEYS,
  stampCategoryGradient,
  stampVariantStyle,
  type PassportStampCategory,
} from "@/lib/passport-stamps";
import { REWARD_ICON_META } from "@/lib/reward-icons";
import { CofexIconTile } from "@/components/app/CofexIconTile";

export function PassportStampCard({ stamp, index = 0 }: { stamp: PassportStamp; index?: number }) {
  const { t, i18n } = useTranslation();
  const category = stamp.stamp_category as PassportStampCategory;
  const variant = stampVariantStyle(stamp.stamp_variant);
  const rewardMeta = REWARD_ICON_META[stamp.reward_type] ?? REWARD_ICON_META.coffee;
  const slug = stamp.coffee_shops?.slug;
  const earnedLabel = new Date(stamp.earned_at).toLocaleDateString(i18n.language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const inner = (
    <article
      className={`cofex-passport-stamp group relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-md transition hover:-translate-y-1 hover:shadow-xl ${variant.border} ${stampCategoryGradient(category)}`}
      style={{
        transform: `rotate(${variant.rotate}deg)`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/30 blur-2xl" />
      <div className="flex items-start justify-between gap-2">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-white/80 bg-white shadow-sm">
          {stamp.shop_logo_url || stamp.coffee_shops?.cover_image_url ? (
            <img
              src={stamp.shop_logo_url ?? stamp.coffee_shops?.cover_image_url ?? ""}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-white to-[color:var(--cofex-cream)]">
              <CofexIconTile rewardType={stamp.reward_type} size="sm" />
            </div>
          )}
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm"
          style={{ background: rewardMeta.color }}
        >
          {t(STAMP_CATEGORY_LABEL_KEYS[category])}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-sm font-extrabold leading-tight text-[color:var(--cofex-coffee-deep)]">
        {stamp.campaign_title}
      </h3>
      <p className="mt-1 text-xs font-semibold text-[color:var(--cofex-black)]/70">{stamp.shop_name}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[color:var(--cofex-black)]/55">
        <span className="inline-flex items-center gap-0.5">
          <Gift className="h-3 w-3" />
          {t(`campaignMap.rewardTypes.${stamp.reward_type}`)}
        </span>
        {stamp.city && (
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {stamp.city}
            {stamp.country ? `, ${stamp.country}` : ""}
          </span>
        )}
      </div>

      <div className="mt-auto pt-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/40">
        {earnedLabel}
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 opacity-15">
        <CofexIconTile rewardType={stamp.reward_type} size="lg" />
      </div>
    </article>
  );

  if (slug) {
    return (
      <Link to="/coffee/$slug" params={{ slug }} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cofex-cyan)]">
        {inner}
      </Link>
    );
  }
  return inner;
}
