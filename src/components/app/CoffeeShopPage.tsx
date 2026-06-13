import { Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Star, Gift, Megaphone, LogIn } from "lucide-react";
import { useShopActiveCampaigns } from "@/lib/queries/coffee-shops";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { ReviewSection } from "@/components/app/ReviewSection";
import { OptimizedImage } from "@/components/app/OptimizedImage";
import { ShopCheckInFlow } from "@/components/app/ShopCheckInFlow";
import { useUser } from "@/hooks/use-user";
import type { CoffeeShopDetail } from "@/lib/queries/coffee-shops";
import { cityToSlug } from "@/lib/cities";
interface CoffeeShopPageProps {
  shop: CoffeeShopDetail;
  backTo?: string;
  backLabel?: string;
}

export function CoffeeShopPage({
  shop,
  backTo = "/explore",
  backLabel = "Back",
}: CoffeeShopPageProps) {
  const { user } = useUser();
  const campaignsQuery = useShopActiveCampaigns(shop.id);
  const gallery = shop.gallery_urls?.length
    ? shop.gallery_urls
    : shop.cover_image_url
      ? [shop.cover_image_url]
      : [];

  return (
    <div style={{ background: "var(--cofex-cream, #f5efe6)" }} className="min-h-full pb-10">
      <div className="relative">
        <div className="aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-muted">
          <OptimizedImage
            src={shop.cover_image_url}
            alt={shop.name}
            width={1200}
            height={514}
            priority
            className="h-full w-full object-cover"
          />
        </div>
        <Link
          to={backTo as "/explore"}
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium shadow"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-5 py-6">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--cofex-coffee-deep)" }}>
                {shop.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {shop.address}, {shop.city}
              </p>
              {shop.city && (
                <Link
                  to="/city/$city"
                  params={{ city: cityToSlug(shop.city) }}
                  className="mt-1 inline-block text-xs text-amber-800 underline"
                >
                  More cafés in {shop.city}
                </Link>
              )}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm">
              <Star className="h-4 w-4 fill-current" style={{ color: "var(--cofex-accent-gold, #c8a063)" }} />
              {Number(shop.rating).toFixed(1)}
              <span className="text-xs text-muted-foreground font-normal">({shop.rating_count})</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {shop.free_coffee_available && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: "var(--cofex-accent-gold, #c8a063)" }}
              >
                <Gift className="h-3 w-3" /> Free coffee today
              </span>
            )}
            {shop.tags?.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium"
                style={{ color: "var(--cofex-coffee-deep)" }}
              >
                {t}
              </span>
            ))}
            {shop.amenities?.map((a) => (
              <span
                key={a}
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: "var(--border)" }}
              >
                {a}
              </span>
            ))}
          </div>
        </div>

        {shop.description && (
          <p className="text-sm leading-relaxed text-foreground/80">{shop.description}</p>
        )}

        <QueryBoundary query={campaignsQuery} loadingLabel="Loading campaigns…">
          {(campaigns) =>
            campaigns.length > 0 ? (
              <section className="rounded-2xl bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-2">
                  <Megaphone className="h-4 w-4" /> Active campaigns
                </h2>
                <ul className="space-y-3">
                  {campaigns.map((c) => (
                    <li key={c.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                      {user ? (
                        <Link to="/campaign/$id" params={{ id: c.id }} className="font-medium hover:underline">
                          {c.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{c.title}</span>
                      )}
                      {c.reward_description && (
                        <p className="text-xs text-muted-foreground mt-1">{c.reward_description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null
          }
        </QueryBoundary>

        {gallery.length > 1 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gallery</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {gallery.map((g, i) => (
                <OptimizedImage
                  key={i}
                  src={g}
                  alt=""
                  width={400}
                  height={400}
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ))}
            </div>
          </section>
        )}

        {user ? (
          <>
            <ShopCheckInFlow
              shopId={shop.id}
              shopSlug={shop.slug}
              shopName={shop.name}
              shopCity={shop.city}
              campaigns={campaignsQuery.data ?? []}
              onWriteReview={() => {
                document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
            <ReviewSection shopId={shop.id} shopName={shop.name} />
          </>
        ) : (          <div className="rounded-2xl border-2 border-dashed bg-white p-6 text-center" style={{ borderColor: "var(--cofex-accent-gold, #c8a063)" }}>
            <LogIn className="mx-auto h-8 w-8 text-amber-700" />
            <p className="mt-2 font-semibold" style={{ color: "var(--cofex-coffee-deep)" }}>
              Sign in to check in & earn points
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              GPS check-ins, passport stamps, and EEFFOC rewards are for explorers.
            </p>
            <Link
              to="/auth"
              search={{ next: `/coffee/${shop.slug}` }}
              className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--cofex-coffee-deep, #3d2417)" }}
            >
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          </div>
        )}

        {!user && <ReviewSection shopId={shop.id} shopName={shop.name} />}
      </div>
    </div>
  );
}