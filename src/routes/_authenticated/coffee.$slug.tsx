import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Star, Gift, Megaphone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Shop = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  logo_url: string | null;
  rating: number;
  rating_count: number;
  tags: string[];
  amenities: string[];
  free_coffee_available: boolean;
  gallery_urls: string[];
  price_level: number;
};

export const Route = createFileRoute("/_authenticated/coffee/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — CO:FE(X)` }] }),
  component: CoffeeShopDetail,
});

function CoffeeShopDetail() {
  const { slug } = useParams({ from: "/_authenticated/coffee/$slug" });
  const [shop, setShop] = useState<Shop | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: string; title: string; reward_description: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("coffee_shops")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!mounted) return;
      setShop(data as Shop | null);
      if (data) {
        const { data: cs } = await supabase
          .from("campaigns")
          .select("id, title, reward_description")
          .eq("coffee_shop_id", (data as any).id)
          .eq("status", "active");
        if (mounted) setCampaigns(cs ?? []);
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!shop) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Café not found.</p>
        <Link to="/explore" className="mt-4 inline-block text-sm underline">
          Back to Explore
        </Link>
      </div>
    );
  }

  const gallery = shop.gallery_urls?.length ? shop.gallery_urls : shop.cover_image_url ? [shop.cover_image_url] : [];

  return (
    <div style={{ background: "var(--cofex-cream, #f5efe6)" }} className="min-h-full pb-10">
      <div className="relative">
        <div className="aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-muted">
          {shop.cover_image_url && (
            <img src={shop.cover_image_url} alt={shop.name} className="h-full w-full object-cover" />
          )}
        </div>
        <Link
          to="/explore"
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium shadow"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
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
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm">
              <Star className="h-4 w-4 fill-current" style={{ color: "var(--cofex-accent-gold, #c8a063)" }} />
              {Number(shop.rating).toFixed(1)}
              <span className="text-xs text-muted-foreground font-normal">({shop.rating_count})</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {shop.free_coffee_available && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: "var(--cofex-accent-gold, #c8a063)" }}>
                <Gift className="h-3 w-3" /> Free coffee today
              </span>
            )}
            {shop.tags.map((t) => (
              <span key={t} className="rounded-full bg-white px-3 py-1 text-xs font-medium" style={{ color: "var(--cofex-coffee-deep)" }}>
                {t}
              </span>
            ))}
            {shop.amenities.map((a) => (
              <span key={a} className="rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: "var(--border)" }}>
                {a}
              </span>
            ))}
          </div>
        </div>

        {shop.description && (
          <p className="text-sm leading-relaxed text-foreground/80">{shop.description}</p>
        )}

        {campaigns.length > 0 && (
          <section className="rounded-2xl bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Active campaigns
            </h2>
            <ul className="space-y-3">
              {campaigns.map((c) => (
                <li key={c.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                  <p className="font-medium">{c.title}</p>
                  {c.reward_description && (
                    <p className="text-xs text-muted-foreground mt-1">{c.reward_description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {gallery.length > 1 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gallery</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {gallery.map((g, i) => (
                <img key={i} src={g} alt="" className="aspect-square w-full rounded-xl object-cover" />
              ))}
            </div>
          </section>
        )}

        <CheckInButton shopId={shop.id} />
      </div>
    </div>
  );
}

function CheckInButton({ shopId }: { shopId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | null
    | { points_awarded: number; total_points: number; total_check_ins: number; new_badges: { slug: string; name: string }[] }
  >(null);
  const [error, setError] = useState<string | null>(null);

  const checkIn = async () => {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("perform_check_in", { _shop_id: shopId });
    setBusy(false);
    if (error) {
      setError(error.message.replace(/^.*?: /, ""));
      return;
    }
    setResult(data as any);
  };

  if (result) {
    return (
      <div className="rounded-2xl border-2 border-dashed p-5 text-center" style={{ borderColor: "var(--cofex-accent-gold, #c8a063)", background: "white" }}>
        <p className="text-2xl">☕✨</p>
        <p className="mt-1 font-semibold" style={{ color: "var(--cofex-coffee-deep)" }}>
          Check-in confirmed!
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          +{result.points_awarded} points · {result.total_points} total · {result.total_check_ins} visits
        </p>
        {result.new_badges?.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {result.new_badges.map((b) => (
              <span key={b.slug} className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: "var(--cofex-accent-gold, #c8a063)" }}>
                🏅 {b.name} unlocked
              </span>
            ))}
          </div>
        )}
        <Link to="/passport" className="mt-4 inline-block text-xs font-medium underline">
          View passport →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={checkIn}
        disabled={busy}
        className="w-full rounded-full py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: "var(--cofex-coffee-deep, #3d2417)" }}
      >
        <Users className="mr-2 inline h-4 w-4" />
        {busy ? "Checking in…" : "Check in & earn +10 points"}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
