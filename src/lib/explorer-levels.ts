import type { LucideIcon } from "lucide-react";
import {
  Coffee,
  Compass,
  Crown,
  Gem,
  Leaf,
  MapPin,
  Search,
  Sparkles,
  Sprout,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

export interface ExplorerLevel {
  key: string;
  min: number;
  gradient: string;
  Icon: LucideIcon;
}

/** Ten progression tiers, thresholds mirrored in `sync_explorer_level_from_points`. */
export const EXPLORER_LEVELS: ExplorerLevel[] = [
  { key: "coffee_rookie", min: 0, gradient: "from-slate-400 to-slate-600", Icon: Sprout },
  { key: "espresso_explorer", min: 75, gradient: "from-amber-300 to-amber-500", Icon: Search },
  { key: "cappuccino_collector", min: 200, gradient: "from-orange-400 to-amber-600", Icon: Coffee },
  { key: "matcha_hunter", min: 400, gradient: "from-emerald-400 to-green-700", Icon: Leaf },
  { key: "local_supporter", min: 700, gradient: "from-sky-400 to-blue-700", Icon: Users },
  { key: "hidden_gem_finder", min: 1200, gradient: "from-violet-400 to-purple-700", Icon: Gem },
  { key: "eeffoc_pro", min: 2000, gradient: "from-fuchsia-500 to-rose-600", Icon: Zap },
  { key: "city_explorer", min: 3200, gradient: "from-teal-400 to-cyan-700", Icon: MapPin },
  { key: "cofex_ambassador", min: 5000, gradient: "from-amber-400 via-orange-500 to-rose-600", Icon: Crown },
  { key: "local_legend", min: 8000, gradient: "from-yellow-300 via-amber-500 to-orange-700", Icon: Trophy },
];

export function levelDisplayName(level: ExplorerLevel, t: (key: string) => string) {
  return t(`levels.${level.key}`);
}

export function levelNumber(level: ExplorerLevel) {
  return EXPLORER_LEVELS.indexOf(level) + 1;
}

export function levelFor(points: number) {
  let level = EXPLORER_LEVELS[0];
  for (const l of EXPLORER_LEVELS) if (points >= l.min) level = l;
  const idx = EXPLORER_LEVELS.indexOf(level);
  const next = EXPLORER_LEVELS[idx + 1];
  const progress = next ? Math.min(100, ((points - level.min) / (next.min - level.min)) * 100) : 100;
  const pointsToNext = next ? next.min - points : 0;
  return { level, next, progress, idx, pointsToNext, levelNum: idx + 1 };
}
