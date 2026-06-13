import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Users, Calendar, Hash, MapPin } from "lucide-react";
import { EmptyState } from "@/components/patterns/EmptyState";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { useActiveCampaigns, type CampaignListItem } from "@/lib/queries/campaigns";

export const Route = createFileRoute("/_authenticated/_explorer/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — CO:FE(X)" }] }),
  component: ExplorerCampaignsPage,
});

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
  const campaignsQuery = useActiveCampaigns();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-rose-50 p-4 md:p-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-amber-700">EEFFOC Campaigns</div>
        <h1 className="text-3xl font-serif font-bold mt-1">We Give EEFFOC</h1>
        <p className="text-sm text-zinc-600">Active campaigns from cafés near you. Join, post, redeem.</p>
      </div>

      <QueryBoundary
        query={campaignsQuery}
        loadingLabel="Loading campaigns…"
        isEmpty={(items) => items.length === 0}
        emptyTitle="No active campaigns right now"
        emptyDescription="Explore cafés near you — new EEFFOC drops land every week."
        emptyActionLabel="Explore cafés"
        emptyActionTo="/explore"
      >
        {(items) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

function CampaignCard({ c }: { c: CampaignListItem }) {
  const cover = c.cover_image_url ?? c.coffee_shops?.cover_image_url;
  const remaining = c.max_participants ? Math.max(0, c.max_participants - c.participant_count) : null;
  const pct = c.max_participants
    ? Math.min(100, Math.round((c.participant_count / c.max_participants) * 100))
    : 0;

  return (
    <Link
      to="/campaign/$id"
      params={{ id: c.id }}
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
          {c.coffee_shops && (
            <Meta
              Icon={MapPin}
              text={`${c.coffee_shops.name}${c.coffee_shops.city ? ` · ${c.coffee_shops.city}` : ""}`}
            />
          )}
          {c.ends_at && <Meta Icon={Calendar} text={`Ends ${new Date(c.ends_at).toLocaleDateString()}`} />}
        </div>
        {c.max_participants && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> {c.participant_count} / {c.max_participants}
              </span>
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
}

function Meta({ Icon, text }: { Icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2 text-zinc-700">
      <Icon className="h-4 w-4 text-amber-700 shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}
