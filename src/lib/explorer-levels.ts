import type { LucideIcon } from "lucide-react";
import { Coffee, Compass, Crown, Search, Sprout, Target } from "lucide-react";

export interface ExplorerLevel {
  name: string;
  min: number;
  gradient: string;
  Icon: LucideIcon;
}

export const EXPLORER_LEVELS: ExplorerLevel[] = [
  { name: "Rookie Explorer", min: 0, gradient: "from-slate-400 to-slate-600", Icon: Sprout },
  { name: "Coffee Seeker", min: 50, gradient: "from-amber-300 to-amber-500", Icon: Search },
  { name: "Espresso Hunter", min: 200, gradient: "from-orange-400 to-amber-700", Icon: Target },
  { name: "Cappuccino Master", min: 500, gradient: "from-rose-400 to-amber-700", Icon: Coffee },
  { name: "Coffee Nomad", min: 1500, gradient: "from-emerald-500 to-teal-700", Icon: Compass },
  { name: "Coffee Legend", min: 5000, gradient: "from-fuchsia-500 via-amber-500 to-orange-700", Icon: Crown },
];

export function levelFor(points: number) {
  let level = EXPLORER_LEVELS[0];
  for (const l of EXPLORER_LEVELS) if (points >= l.min) level = l;
  const idx = EXPLORER_LEVELS.indexOf(level);
  const next = EXPLORER_LEVELS[idx + 1];
  const progress = next ? Math.min(100, ((points - level.min) / (next.min - level.min)) * 100) : 100;
  return { level, next, progress, idx };
}
