import type { LucideIcon } from "lucide-react";
import { Clock, Crown, Sparkles, Target, Zap } from "lucide-react";

import type { RadarStats } from "@/lib/queries/radar";

export type ExplorerChallengeId = string;
export type ExplorerChallengePeriod = "weekly" | "lifetime" | "limited";

const STAT_KEY_MAP = {
  visits_this_week: "visits_this_week",
  new_shops_this_week: "new_shops_this_week",
  streak_days: "streak_days",
  cities_explored: "cities_explored",
} as const satisfies Record<string, keyof Pick<RadarStats, "visits_this_week" | "new_shops_this_week" | "streak_days" | "cities_explored">>;

export interface ExplorerChallengeDefRow {
  id: string;
  title: string;
  subtitle: string;
  stat_key: string;
  target: number;
  reward: number;
  period_type: ExplorerChallengePeriod;
  sort_order: number;
  starts_at?: string | null;
  ends_at?: string | null;
  campaign_tag?: string | null;
}

const CHALLENGE_UI: Record<string, { accent: string; Icon: LucideIcon }> = {
  weekly: { accent: "from-violet-500 to-fuchsia-600", Icon: Target },
  new3: { accent: "from-amber-500 to-orange-600", Icon: Sparkles },
  streak: { accent: "from-rose-500 to-red-600", Icon: Zap },
  cities: { accent: "from-emerald-500 to-teal-600", Icon: Crown },
  "matcha-week": { accent: "from-emerald-400 to-teal-600", Icon: Clock },
};

export interface ExplorerChallengeDef {
  id: ExplorerChallengeId;
  title: string;
  subtitle: string;
  statKey: keyof Pick<RadarStats, "visits_this_week" | "new_shops_this_week" | "streak_days" | "cities_explored">;
  target: number;
  reward: number;
  period: ExplorerChallengePeriod;
  accent: string;
  Icon: LucideIcon;
  startsAt?: string | null;
  endsAt?: string | null;
  campaignTag?: string | null;
}

export function isLimitedChallengeActive(def: ExplorerChallengeDef, now = new Date()): boolean {
  if (def.period !== "limited") return true;
  const t = now.getTime();
  if (def.startsAt && new Date(def.startsAt).getTime() > t) return false;
  if (def.endsAt && new Date(def.endsAt).getTime() < t) return false;
  return true;
}

export function limitedCountdownLabel(def: ExplorerChallengeDef, now = new Date()): string | null {
  if (def.period !== "limited" || !def.endsAt) return null;
  const ms = new Date(def.endsAt).getTime() - now.getTime();
  if (ms <= 0) return "Ended";
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 1) return "Ends today";
  return `${days}d left`;
}

export function challengesFromDefs(rows: ExplorerChallengeDefRow[]): ExplorerChallengeDef[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => {
      const ui = CHALLENGE_UI[row.id] ?? { accent: "from-violet-500 to-fuchsia-600", Icon: Target };
      const statKey = STAT_KEY_MAP[row.stat_key as keyof typeof STAT_KEY_MAP] ?? "visits_this_week";
      return {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        statKey,
        target: row.target,
        reward: row.reward,
        period: row.period_type,
        accent: ui.accent,
        Icon: ui.Icon,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        campaignTag: row.campaign_tag,
      };
    })
    .filter((c) => isLimitedChallengeActive(c));
}
/** Fallback when DB defs are unavailable, rules mirror `explorer_challenge_defs` seed. */
export const EXPLORER_CHALLENGES: ExplorerChallengeDef[] = challengesFromDefs([
  { id: "weekly", title: "Weekly Wanderer", subtitle: "Check in 5 times this week", stat_key: "visits_this_week", target: 5, reward: 50, period_type: "weekly", sort_order: 1 },
  { id: "new3", title: "Three New Doors", subtitle: "Visit 3 cafés you've never been to this week", stat_key: "new_shops_this_week", target: 3, reward: 75, period_type: "weekly", sort_order: 2 },
  { id: "streak", title: "On Fire", subtitle: "Hit a 5-day check-in streak", stat_key: "streak_days", target: 5, reward: 100, period_type: "lifetime", sort_order: 3 },
  { id: "cities", title: "City Hopper", subtitle: "Explore 3 different cities", stat_key: "cities_explored", target: 3, reward: 150, period_type: "lifetime", sort_order: 4 },
]);

export function weeklyResetLabel(challenge: ExplorerChallengeDef, weekPeriodKey?: string): string | null {
  if (challenge.period !== "weekly") return null;
  return weekPeriodKey ? `Resets Monday · week ${weekPeriodKey}` : "Resets every Monday";
}

export function getChallengePeriodKey(period: ExplorerChallengePeriod, date = new Date()): string {
  if (period === "lifetime") return "lifetime";
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getChallengeProgress(stats: RadarStats | undefined, challenge: ExplorerChallengeDef): number {
  if (!stats) return 0;
  return stats[challenge.statKey] ?? 0;
}

export interface ChallengeClaimRecord {
  challenge_id: string;
  period_key: string;
  claimed_at: string;
  points_awarded: number;
}

export function isChallengeClaimed(
  claims: ChallengeClaimRecord[],
  challenge: ExplorerChallengeDef,
  weekPeriodKey: string,
): boolean {
  const periodKey =
    challenge.period === "lifetime"
      ? "lifetime"
      : challenge.period === "limited"
        ? (challenge.campaignTag ?? `limited:${challenge.id}`)
        : weekPeriodKey;
  return claims.some((c) => c.challenge_id === challenge.id && c.period_key === periodKey);
}

export function partitionChallenges(challenges: ExplorerChallengeDef[]) {
  const limited = challenges.filter((c) => c.period === "limited");
  const regular = challenges.filter((c) => c.period !== "limited");
  return { limited, regular };
}

export function buildChallengeView(
  stats: RadarStats | undefined,
  claims: ChallengeClaimRecord[],
  weekPeriodKey: string,
  challenges: ExplorerChallengeDef[] = EXPLORER_CHALLENGES,
) {
  return challenges.map((challenge) => {
    const progress = getChallengeProgress(stats, challenge);
    const complete = progress >= challenge.target;
    const claimed = isChallengeClaimed(claims, challenge, weekPeriodKey);
    const periodKey =
      challenge.period === "lifetime"
        ? "lifetime"
        : challenge.period === "limited"
          ? (challenge.campaignTag ?? `limited:${challenge.id}`)
          : weekPeriodKey;
    const pct = Math.min(100, Math.round((progress / challenge.target) * 100));
    return { challenge, progress, complete, claimed, periodKey, pct, claimable: complete && !claimed };
  });
}
