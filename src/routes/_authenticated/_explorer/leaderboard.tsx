import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coffee, MessageSquareText, Megaphone, Share2, Sparkles, Trophy, Crown, Medal, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_explorer/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — CO:FE(X)" }] }),
  component: LeaderboardPage,
});

type Metric = "points" | "cafes" | "reviews" | "campaigns" | "social";
type Row = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  total_points: number;
  cafes_visited: number;
  reviews_written: number;
  campaigns_completed: number;
  social_posts: number;
  rank: number;
};

const METRICS: { id: Metric; label: string; Icon: any; field: keyof Row; suffix?: string }[] = [
  { id: "points", label: "Explorer points", Icon: Sparkles, field: "total_points", suffix: "pts" },
  { id: "cafes", label: "Cafés visited", Icon: Coffee, field: "cafes_visited" },
  { id: "reviews", label: "Reviews written", Icon: MessageSquareText, field: "reviews_written" },
  { id: "campaigns", label: "Campaigns completed", Icon: Megaphone, field: "campaigns_completed" },
  { id: "social", label: "Social posts", Icon: Share2, field: "social_posts" },
];

const LEVELS = [
  { name: "Rookie Explorer", min: 0, gradient: "from-zinc-400 to-zinc-600", emoji: "🌱" },
  { name: "Coffee Seeker", min: 50, gradient: "from-amber-300 to-amber-500", emoji: "🔍" },
  { name: "Espresso Hunter", min: 200, gradient: "from-orange-400 to-amber-700", emoji: "🎯" },
  { name: "Cappuccino Master", min: 500, gradient: "from-rose-400 to-amber-700", emoji: "☕" },
  { name: "Coffee Nomad", min: 1500, gradient: "from-emerald-500 to-teal-700", emoji: "🧭" },
  { name: "Coffee Legend", min: 5000, gradient: "from-fuchsia-500 via-amber-500 to-orange-700", emoji: "👑" },
];

function levelFor(points: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) level = l;
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  const progress = next ? Math.min(100, ((points - level.min) / (next.min - level.min)) * 100) : 100;
  return { level, next, progress, idx };
}

function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>("points");
  const [rows, setRows] = useState<Row[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: { user } }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      (supabase as any).rpc("get_leaderboard", { _metric: metric, _limit: 50 }),
    ]);
    setMeId(user?.id ?? null);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [metric]);
  useEffect(() => { load(); }, [load]);

  const me = useMemo(() => rows.find((r) => r.user_id === meId), [rows, meId]);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const activeMetric = METRICS.find((m) => m.id === metric)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-white pb-20">
      <div className="mx-auto max-w-4xl px-5 pt-8">
        <div className="text-center mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-800">Compete</div>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mt-1">The Coffee Leaderboard</h1>
          <p className="text-sm text-zinc-600 mt-2">Hunters, nomads & legends across the network.</p>
        </div>

        {/* Metric tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                metric === m.id ? "bg-amber-900 border-amber-900 text-white shadow" : "bg-white border-zinc-200 text-zinc-700 hover:border-amber-400"
              }`}
            >
              <m.Icon className="h-3.5 w-3.5" /> {m.label}
            </button>
          ))}
        </div>

        {/* My card */}
        {me && (
          <MyCard row={me} metric={activeMetric} />
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading explorers…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No explorers yet — be the first.</div>
        ) : (
          <>
            {/* Podium */}
            <div className="grid grid-cols-3 gap-3 mb-8 items-end">
              {[top3[1], top3[0], top3[2]].map((r, i) => r ? (
                <PodiumCard key={r.user_id} row={r} metric={activeMetric} place={i === 1 ? 1 : i === 0 ? 2 : 3} />
              ) : <div key={i} />)}
            </div>

            {/* Rest */}
            <div className="space-y-2">
              {rest.map((r) => (
                <RankRow key={r.user_id} row={r} metric={activeMetric} highlight={r.user_id === meId} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MyCard({ row, metric }: { row: Row; metric: typeof METRICS[number] }) {
  const value = row[metric.field] as number;
  const { level, next, progress, idx } = levelFor(row.total_points);
  return (
    <div className={`rounded-3xl p-5 mb-6 text-white shadow-xl bg-gradient-to-br ${level.gradient} relative overflow-hidden`}>
      <div className="absolute -right-8 -top-8 text-[140px] opacity-10 select-none">{level.emoji}</div>
      <div className="relative flex items-center gap-4">
        <Avatar url={row.avatar_url} name={row.display_name} size={56} ring />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest opacity-80">You · Rank #{row.rank}</div>
          <div className="text-lg font-bold truncate">{row.display_name ?? "Explorer"}</div>
          <div className="text-xs opacity-90 inline-flex items-center gap-1">
            <span>{level.emoji}</span> Level {idx + 1} · {level.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold leading-none">{value.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-widest opacity-80 mt-0.5">{metric.label}</div>
        </div>
      </div>
      {next && (
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[11px] opacity-90 mb-1">
            <span>{row.total_points.toLocaleString()} pts</span>
            <span>{next.min.toLocaleString()} pts → {next.name}</span>
          </div>
          <div className="h-2 rounded-full bg-white/25 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumCard({ row, metric, place }: { row: Row; metric: typeof METRICS[number]; place: 1 | 2 | 3 }) {
  const value = row[metric.field] as number;
  const { level } = levelFor(row.total_points);
  const heights = { 1: "pt-8 pb-6", 2: "pt-6 pb-5", 3: "pt-5 pb-4" };
  const icons = { 1: <Crown className="h-5 w-5" />, 2: <Medal className="h-5 w-5" />, 3: <Award className="h-5 w-5" /> };
  const colors = {
    1: "bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-amber-950 border-amber-500",
    2: "bg-gradient-to-b from-zinc-100 to-zinc-300 text-zinc-800 border-zinc-300",
    3: "bg-gradient-to-b from-orange-200 to-orange-400 text-orange-950 border-orange-400",
  };
  return (
    <div className={`relative rounded-3xl border-2 ${colors[place]} ${heights[place]} px-3 text-center shadow-lg`}>
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white rounded-full w-9 h-9 flex items-center justify-center shadow border">
        {icons[place]}
      </div>
      <div className="flex flex-col items-center gap-2 mt-2">
        <Avatar url={row.avatar_url} name={row.display_name} size={place === 1 ? 64 : 52} ring />
        <div className="min-w-0 w-full">
          <div className="font-bold text-sm truncate">{row.display_name ?? "Explorer"}</div>
          <div className="text-[10px] opacity-80 truncate">{level.emoji} {level.name}</div>
        </div>
        <div className="bg-white/60 rounded-full px-3 py-1 backdrop-blur">
          <div className="text-lg font-extrabold leading-none">{value.toLocaleString()}</div>
          <div className="text-[9px] uppercase tracking-widest opacity-80">{metric.suffix ?? metric.label.split(" ")[0]}</div>
        </div>
      </div>
    </div>
  );
}

function RankRow({ row, metric, highlight }: { row: Row; metric: typeof METRICS[number]; highlight?: boolean }) {
  const value = row[metric.field] as number;
  const { level } = levelFor(row.total_points);
  return (
    <div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition hover:shadow-md ${highlight ? "ring-2 ring-amber-500 border-amber-300" : "border-zinc-200"}`}>
      <div className="w-8 text-center font-bold text-zinc-400 text-sm">#{row.rank}</div>
      <Avatar url={row.avatar_url} name={row.display_name} size={40} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-zinc-900 truncate text-sm">{row.display_name ?? "Explorer"}{row.city ? <span className="text-zinc-400 font-normal"> · {row.city}</span> : null}</div>
        <div className="text-[11px] text-zinc-500 inline-flex items-center gap-2 mt-0.5">
          <span>{level.emoji} {level.name}</span>
          <span className="inline-flex items-center gap-0.5"><Coffee className="h-3 w-3" /> {row.cafes_visited}</span>
          <span className="inline-flex items-center gap-0.5"><Megaphone className="h-3 w-3" /> {row.campaigns_completed}</span>
          <span className="inline-flex items-center gap-0.5"><Share2 className="h-3 w-3" /> {row.social_posts}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-zinc-900 leading-none">{value.toLocaleString()}</div>
        <div className="text-[9px] uppercase tracking-widest text-zinc-400 mt-0.5">{metric.suffix ?? metric.label.split(" ")[0]}</div>
      </div>
    </div>
  );
}

function Avatar({ url, name, size = 40, ring }: { url?: string | null; name?: string | null; size?: number; ring?: boolean }) {
  const initials = (name ?? "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return url ? (
    <img src={url} alt="" style={{ width: size, height: size }} className={`rounded-full object-cover ${ring ? "ring-2 ring-white/70" : ""}`} />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white flex items-center justify-center font-bold ${ring ? "ring-2 ring-white/70" : ""}`}
    >
      {initials}
    </div>
  );
}

export { Trophy };
