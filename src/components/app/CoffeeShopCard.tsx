import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { OptimizedImage } from "@/components/app/OptimizedImage";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { SHOP_CARD_ICONS } from "@/lib/explorer-section-icons";

export type ShopCardData = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  cover_image_url: string | null;
  rating: number;
  rating_count: number;
  tags: string[];
  free_coffee_available: boolean;
  distance_km: number;
  active_campaigns: number;
  popularity: number;
};

export function CoffeeShopCard({
  shop,
  onHover,
  active,
}: {
  shop: ShopCardData;
  onHover?: (id: string | null) => void;
  active?: boolean;
}) {
  return (
    <Link
      to="/coffee/$slug"
      params={{ slug: shop.slug }}
      onMouseEnter={() => onHover?.(shop.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`cofex-campaign-card cofex-app-card group block ${
        active ? "ring-2 ring-[color:var(--cofex-cyan)]" : ""
      }`}
    >
      <div className="cofex-app-card-inner">
      <div className="cofex-campaign-card-media relative aspect-[4/3] overflow-hidden bg-[color:var(--cofex-pastel-blue)]">
        {shop.cover_image_url ? (
          <OptimizedImage
            src={shop.cover_image_url}
            alt={shop.name}
            width={640}
            height={480}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[color:var(--cofex-pastel-blue)] to-[color:var(--cofex-cream)]" />
        )}
        {shop.free_coffee_available && (
          <span
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md"
            style={{ background: "var(--gradient-coffee)" }}
          >
            <CofexIconTile rewardType="coffee" size="xs" /> Free coffee
          </span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur">
          <Star className="h-3 w-3 fill-[color:var(--cofex-accent-gold)] text-[color:var(--cofex-accent-gold)]" />
          {shop.rating.toFixed(1)}
          <span className="font-normal text-[color:var(--cofex-black)]/50">({shop.rating_count})</span>
        </span>
      </div>
      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold leading-tight text-[color:var(--cofex-coffee-deep)]">
              {shop.name}
            </h3>
            {shop.city && (
              <p className="mt-0.5 truncate text-xs text-[color:var(--cofex-black)]/55">{shop.city}</p>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--cofex-cream)] px-2 py-1 text-[11px] font-semibold text-[color:var(--cofex-coffee-deep)]">
            <CofexIconTile meta={SHOP_CARD_ICONS.distance} size="xs" /> {shop.distance_km.toFixed(1)} km
          </span>
        </div>
        {shop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {shop.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--cofex-cream)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--cofex-coffee-deep)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 border-t border-[color:var(--border)] pt-2.5 text-xs text-[color:var(--cofex-black)]/55">
          <span className="inline-flex items-center gap-1.5">
            <CofexIconTile meta={SHOP_CARD_ICONS.campaigns} size="xs" /> {shop.active_campaigns} active
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CofexIconTile meta={SHOP_CARD_ICONS.explorers} size="xs" /> {shop.popularity} explorers
          </span>
        </div>
      </div>
      </div>
    </Link>
  );
}
