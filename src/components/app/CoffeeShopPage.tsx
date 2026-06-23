import { Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Star, Gift, Megaphone, LogIn } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useShopActiveCampaigns } from "@/lib/queries/coffee-shops";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { ReviewSection } from "@/components/app/ReviewSection";
import { OptimizedImage } from "@/components/app/OptimizedImage";
import { ShopCheckInFlow } from "@/components/app/ShopCheckInFlow";
import { OriginStoryBlock } from "@/components/app/OriginStoryBlock";
import { ShopStoriesReel } from "@/components/app/ShopStoriesReel";
import { SoundscapePlayer } from "@/components/app/SoundscapePlayer";
import { ArrivalButton } from "@/components/app/ArrivalButton";
import { MayorBadge } from "@/components/app/MayorBadge";
import { CoffeeSteam } from "@/components/app/CofexDecor";
import { useUser } from "@/hooks/use-user";
import { useShopMayor, useShopStories } from "@/lib/queries/vision";
import type { CoffeeShopDetail } from "@/lib/queries/coffee-shops";
import { cityToSlug } from "@/lib/cities";

interface CoffeeShopPageProps {
  shop: CoffeeShopDetail;
  backTo?: string;
  backLabel?: string;
  doorScan?: boolean;
}

export function CoffeeShopPage({
  shop,
  backTo = "/explore",
  backLabel = "Back",
  doorScan = false,
}: CoffeeShopPageProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const campaignsQuery = useShopActiveCampaigns(shop.id);
  const storiesQuery = useShopStories(shop.id);
  const mayorQuery = useShopMayor(shop.id);
  const checkInRef = useRef<HTMLDivElement>(null);
  const gallery = shop.gallery_urls?.length
    ? shop.gallery_urls
    : shop.cover_image_url
      ? [shop.cover_image_url]
      : [];

  useEffect(() => {
    if (doorScan && checkInRef.current) {
      checkInRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [doorScan]);

  return (
    <div className="cofex-app-page min-h-full pb-10">
      <div className="cofex-cafe-hero relative">
        <div className="aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-muted">
          <OptimizedImage
            src={shop.cover_image_url}
            alt={shop.name}
            width={1200}
            height={514}
            priority
            className="h-full w-full object-cover"
          />
          <div className="cofex-cafe-hero-overlay" />
        </div>
        <Link
          to={backTo as "/explore"}
          className="cofex-cafe-hero-badge absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[color:var(--cofex-coffee-deep)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
        <CoffeeSteam className="absolute bottom-8 right-8 hidden opacity-60 sm:flex" />
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-5 py-6">
        <div className="cofex-app-card space-y-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--cofex-cyan)]">
                {t("shopPage.eyebrow", { defaultValue: "Local café" })}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
                {shop.name}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--cofex-black)]/60 inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" /> {shop.address}, {shop.city}
              </p>
              {shop.city && (
                <Link
                  to="/city/$city"
                  params={{ city: cityToSlug(shop.city) }}
                  className="mt-1 inline-block text-xs text-amber-800 underline"
                >
                  {t("shopPage.moreInCity", { city: shop.city })}
                </Link>
              )}
            </div>
            <span className="cofex-cafe-hero-badge inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[color:var(--cofex-coffee-deep)]">
              <Star className="h-4 w-4 fill-[color:var(--cofex-gold)] text-[color:var(--cofex-gold)]" />
              {Number(shop.rating).toFixed(1)}
              <span className="text-xs text-muted-foreground font-normal">({shop.rating_count})</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <SoundscapePlayer url={shop.soundscape_url} />
            {user ? <ArrivalButton shopId={shop.id} /> : null}
            {mayorQuery.data ? (
              <MayorBadge name={mayorQuery.data.display_name} checkIns={mayorQuery.data.check_ins} />
            ) : null}
            {shop.free_coffee_available && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md"
                style={{ background: "var(--gradient-coffee)" }}
              >
                <Gift className="h-3 w-3" /> {t("shopPage.freeCoffeeToday")}
              </span>
            )}
            {shop.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium"
                style={{ color: "var(--cofex-coffee-deep)" }}
              >
                {tag}
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

        {doorScan ? (
          <div className="rounded-xl border border-[color:var(--cofex-cyan)] bg-[color:var(--cofex-pastel-blue)]/30 px-4 py-3 text-sm text-[color:var(--cofex-coffee-deep)]">
            {t("shopPage.doorScanHint")}
          </div>
        ) : null}

        {shop.description && (
          <p className="text-sm leading-relaxed text-foreground/80">{shop.description}</p>
        )}

        <OriginStoryBlock
          originRegion={shop.origin_region}
          roasterName={shop.roaster_name}
          fairTrade={shop.fair_trade}
          co2Note={shop.co2_note}
        />

        <QueryBoundary query={storiesQuery} loadingLabel="">
          {(stories) => <ShopStoriesReel stories={stories} />}
        </QueryBoundary>

        <QueryBoundary query={campaignsQuery} loadingLabel={t("shopPage.loadingCampaigns")}>
          {(campaigns) =>
            campaigns.length > 0 ? (
              <section className="rounded-2xl bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-2">
                  <Megaphone className="h-4 w-4" /> {t("shopPage.activeCampaigns")}
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("shopPage.gallery")}</h2>
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
            <div ref={checkInRef}>
              <ShopCheckInFlow
                shopId={shop.id}
                shopSlug={shop.slug}
                shopName={shop.name}
                shopCity={shop.city}
                campaigns={campaignsQuery.data ?? []}
                autoFocus={doorScan}
                onWriteReview={() => {
                  document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
            </div>
            <ReviewSection shopId={shop.id} shopName={shop.name} />
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed bg-white p-6 text-center" style={{ borderColor: "var(--cofex-accent-gold, #c8a063)" }}>
            <LogIn className="mx-auto h-8 w-8 text-amber-700" />
            <p className="mt-2 font-semibold" style={{ color: "var(--cofex-coffee-deep)" }}>
              {t("shopPage.signInTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("shopPage.signInHint")}</p>
            <Link
              to="/auth"
              search={{ next: `/coffee/${shop.slug}` }}
              className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--cofex-coffee-deep, #3d2417)" }}
            >
              <LogIn className="h-4 w-4" /> {t("header.signIn")}
            </Link>
          </div>
        )}

        {!user && <ReviewSection shopId={shop.id} shopName={shop.name} />}
      </div>
    </div>
  );
}
