import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function SpawnBanner({
  spawns,
}: {
  spawns: Array<{ id: string; title: string; shop_slug: string; rarity: string; ends_at: string }>;
}) {
  if (spawns.length === 0) return null;
  const s = spawns[0];

  return (
    <Link
      to="/coffee/$slug"
      params={{ slug: s.shop_slug }}
      className="cofex-app-card flex items-center gap-3 border-2 border-violet-300 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 animate-pulse"
    >
      <Sparkles className="h-6 w-6 text-violet-600" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold uppercase tracking-wider text-violet-700">{s.rarity} spawn</div>
        <div className="truncate font-semibold text-[color:var(--cofex-coffee-deep)]">{s.title}</div>
        <div className="text-[11px] text-violet-800/70">Limited time — tap to visit</div>
      </div>
    </Link>
  );
}
