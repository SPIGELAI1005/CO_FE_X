import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MapPin, Megaphone, Star, Gift } from "lucide-react";
import { cityFromSlug } from "@/lib/cities";
import { useCoffeeShopsByCity, useCityActiveCampaigns } from "@/lib/queries/coffee-shops";
import { useCityCollectionProgress } from "@/lib/queries/city-collections";
import { CityCollectionCard } from "@/components/app/CityCollectionCard";
import { useUser } from "@/hooks/use-user";
import { CoffeeShopCard, type ShopCardData } from "@/components/app/CoffeeShopCard";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { EmptyState } from "@/components/patterns/EmptyState";

export const Route = createFileRoute("/city/$city")({
  ssr: true,
  head: ({ params }) => {
    const name = cityFromSlug(params.city);
    const title = `Coffee in ${name} · CO:FE(X)`;
    const description = `Top cafés and active EEFFOC campaigns in ${name}. Discover, check in, and earn rewards with CO:FE(X).`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
    };
  },
  component: CityPage,
});

function CityPage() {
  const { city } = Route.useParams();
  const cityName = cityFromSlug(city);
  const { user } = useUser();
  const progressQuery = useCityCollectionProgress(city, user?.id);
  const shopsQuery = useCoffeeShopsByCity(city);
  const shopIds = useMemo(() => (shopsQuery.data ?? []).map((s) => s.id), [shopsQuery.data]);
  const campaignsQuery = useCityActiveCampaigns(city, shopIds);

  const cards: ShopCardData[] = useMemo(() => {
    return (shopsQuery.data ?? [])
      .map((r) => ({
        ...r,
        distance_km: 0,
        active_campaigns: 0,
        popularity: 0,
      }))
      .sort((a, b) => b.rating - a.rating);
  }, [shopsQuery.data]);

  return (
    <div className="min-h-screen" style={{ background: "var(--cofex-cream, #f5efe6)" }}>
      <header className="border-b bg-white/95 backdrop-blur px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <Link to="/" className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--cofex-coffee-deep)" }}>
          CO:FE(X)
        </Link>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700">
          <MapPin className="h-3.5 w-3.5" /> City guide
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Coffee in {cityName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved partner cafés and active EEFFOC campaigns near you.
        </p>

        {user && progressQuery.data && (
          <div className="mt-6">
            <CityCollectionCard progress={progressQuery.data} />
          </div>
        )}

        <QueryBoundary
          query={shopsQuery}
          loadingLabel="Loading cafés…"
          isEmpty={(shops) => shops.length === 0}
          emptyTitle={`No cafés listed in ${cityName} yet`}
          emptyDescription="We're expanding the network. Explore all locations or list your café as a partner."
          emptyActionLabel="Back home"
          emptyActionTo="/"
        >
          {() => (
            <>
              <section className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Top cafés</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cards.map((shop) => (
                    <CoffeeShopCard key={shop.id} shop={shop} />
                  ))}
                </div>
              </section>

              <QueryBoundary query={campaignsQuery} loadingLabel="Loading campaigns…">
                {(campaigns) =>
                  campaigns.length > 0 ? (
                    <section className="mt-10 rounded-2xl bg-white p-5 border" style={{ borderColor: "var(--border)" }}>
                      <h2 className="text-lg font-semibold inline-flex items-center gap-2 mb-4">
                        <Megaphone className="h-5 w-5 text-amber-700" /> Active campaigns
                      </h2>
                      <ul className="space-y-3">
                        {campaigns.map((c) => (
                          <li key={c.id} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
                            <div className="font-medium">{c.title}</div>
                            {c.coffee_shops && (
                              <Link
                                to="/coffee/$slug"
                                params={{ slug: c.coffee_shops.slug }}
                                className="text-xs text-amber-800 underline mt-0.5 inline-block"
                              >
                                {c.coffee_shops.name}
                              </Link>
                            )}
                            {c.reward_description && (
                              <p className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1">
                                <Gift className="h-3.5 w-3.5" /> {c.reward_description}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 text-xs text-muted-foreground">
                        <Link to="/auth" className="underline font-medium">
                          Sign in
                        </Link>{" "}
                        to join campaigns and redeem rewards.
                      </p>
                    </section>
                  ) : null
                }
              </QueryBoundary>

              <div className="mt-10 rounded-2xl border bg-white p-6 text-center" style={{ borderColor: "var(--border)" }}>
                <Star className="mx-auto h-8 w-8 text-amber-700" />
                <p className="mt-2 font-semibold">Ready to explore {cityName}?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a free account to check in, collect passport stamps, and unlock EEFFOC rewards.
                </p>
                <Link
                  to="/auth"
                  search={{ next: `/city/${city}` }}
                  className="mt-4 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: "var(--cofex-coffee-deep)" }}
                >
                  Get started
                </Link>
              </div>
            </>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}
