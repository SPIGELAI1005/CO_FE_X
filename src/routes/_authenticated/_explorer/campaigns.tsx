import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Gift, Users, Calendar, Hash, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_explorer/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — CO:FE(X)" }] }),
  component: ExplorerCampaignsPage,
});

type Row = {
  id: string;
  title: string;
  description: string | null;
  reward_description: string | null;
  requirements: string | null;
  hashtag: string | null;
  points_reward: number;
  max_participants: number | null;
  campaign_type: string;
  ends_at: string | null;
  cover_image_url: string | null;
  coffee_shops: { name: string; slug: string; city: string | null; cover_image_url: string | null } | null;
  participant_count?: number;
};

const EMOJI: Record<string, string> = {
  free_espresso_friday: "☕️",
  matcha_monday: "🍵",
  student_week: "🎓",
  bogo: "🎁",
  free_with_pastry: "🥐",
  social_story: "📸",
  custom: "✨",
};

function ExplorerCampaignsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, title, description, reward_description, requirements, hashtag, points_reward, max_participants, campaign_type, ends_at, cover_image_url, coffee_shops(name, slug, city, cover_image_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as Row[];
      if (rows.length) {
        const { data: counts } = await supabase
          .from("check_ins")
          .select("campaign_id")
          .in("campaign_id", rows.map((r) => r.id));
        const map = new Map<string, number>();
        for (const r of counts ?? []) {
          if (!r.campaign_id) continue;
          map.set(r.campaign_id, (map.get(r.campaign_id) ?? 0) + 1);
        }
        rows.forEach((r) => (r.participant_count = map.get(r.id) ?? 0));
      }
      setItems(rows);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-rose-50 p-4 md:p-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-amber-700">EEFFOC Campaigns</div>
        <h1 className="text-3xl font-serif font-bold mt-1">We Give EEFFOC</h1>
        <p className="text-sm text-zinc-600">Active campaigns from cafés near you. Join, post, redeem.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/60 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center bg-white/60">
          <Megaphone className="h-10 w-10 mx-auto text-amber-700 mb-3" />
          <h3 className="font-semibold">No active campaigns right now</h3>
          <p className="text-sm text-zinc-600">Check back soon — new EEFFOC drops weekly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((c) => {
            const cover = c.cover_image_url ?? c.coffee_shops?.cover_image_url;
            const remaining = c.max_participants ? Math.max(0, c.max_participants - (c.participant_count ?? 0)) : null;
            const pct = c.max_participants ? Math.min(100, Math.round(((c.participant_count ?? 0) / c.max_participants) * 100)) : 0;
            return (
              <Link
                key={c.id}
                to="/coffee/$slug"
                params={{ slug: c.coffee_shops?.slug ?? "" }}
                className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition border border-zinc-200"
              >
                <div className="relative h-40 bg-gradient-to-br from-amber-200 to-orange-300">
                  {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 text-3xl">{EMOJI[c.campaign_type] ?? "✨"}</div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="text-xs uppercase tracking-widest opacity-80">{c.hashtag}</div>
                    <h3 className="text-lg font-bold leading-tight">{c.title}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-zinc-600 line-clamp-2">{c.description}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <Meta Icon={Gift} text={c.reward_description ?? "Surprise reward"} />
                    {c.coffee_shops && <Meta Icon={MapPin} text={`${c.coffee_shops.name}${c.coffee_shops.city ? ` · ${c.coffee_shops.city}` : ""}`} />}
                    {c.ends_at && <Meta Icon={Calendar} text={`Ends ${new Date(c.ends_at).toLocaleDateString()}`} />}
                  </div>
                  {c.max_participants && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {c.participant_count ?? 0} / {c.max_participants}</span>
                        <span>{remaining} spots left</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                  {c.requirements && (
                    <div className="mt-3 text-xs text-zinc-500 inline-flex items-start gap-1">
                      <Hash className="h-3 w-3 mt-0.5" /> {c.requirements}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Meta({ Icon, text }: { Icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2 text-zinc-700">
      <Icon className="h-4 w-4 text-amber-700 shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}
