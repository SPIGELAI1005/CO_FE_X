import { Link } from "@tanstack/react-router";
import { Star, MapPin, Megaphone, Users, Gift } from "lucide-react";
import { OptimizedImage } from "@/components/app/OptimizedImage";

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
      className="group block overflow-hidden rounded-2xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderColor: active ? "var(--cofex-coffee-deep)" : "var(--border)",
        boxShadow: active ? "0 10px 30px -12px rgba(0,0,0,.25)" : undefined,
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {shop.cover_image_url ? (
          <OptimizedImage
            src={shop.cover_image_url}
            alt={shop.name}
            width={640}
            height={480}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full" style={{ background: "var(--cofex-pastel-blue)" }} />
        )}
        {shop.free_coffee_available && (
          <span
            className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow"
            style={{ background: "var(--cofex-accent-gold, #c8a063)" }}
          >
            <Gift className="h-3 w-3" /> Free coffee
          </span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow">
          <Star className="h-3 w-3 fill-current" style={{ color: "var(--cofex-accent-gold, #c8a063)" }} />
          {shop.rating.toFixed(1)}
          <span className="text-muted-foreground font-normal">({shop.rating_count})</span>
        </span>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight" style={{ color: "var(--cofex-coffee-deep)" }}>
            {shop.name}
          </h3>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0">
            <MapPin className="h-3 w-3" /> {shop.distance_km.toFixed(1)} km
          </span>
        </div>
        {shop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {shop.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: "var(--cofex-cream, #f5efe6)", color: "var(--cofex-coffee-deep)" }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Megaphone className="h-3.5 w-3.5" /> {shop.active_campaigns} active
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {shop.popularity} explorers
          </span>
        </div>
      </div>
    </Link>
  );
}
