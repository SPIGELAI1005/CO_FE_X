/** Pure metrics helpers for partner dashboard counters (testable without Supabase). */

export interface CampaignCapacityRow {
  id: string;
  status: string;
  ends_at: string | null;
  max_participants: number | null;
  available_quantity: number | null;
}

export const REACH_PER_POST: Record<string, number> = {
  instagram_post: 600,
  instagram_story: 350,
  tiktok: 1200,
  facebook: 400,
  facebook_post: 400,
  screenshot: 200,
};

export function countActiveCampaigns(campaigns: CampaignCapacityRow[], now = new Date()): number {
  return campaigns.filter((c) => c.status === "active" && (!c.ends_at || new Date(c.ends_at) > now)).length;
}

export function estimateSocialReachToday(platforms: string[]): number {
  return platforms.reduce((sum, platform) => sum + (REACH_PER_POST[platform] ?? 300), 0);
}

export function computeRewardsRemaining(
  campaigns: CampaignCapacityRow[],
  participantCountByCampaign: Map<string, number>,
  now = new Date(),
): number {
  let total = 0;
  for (const c of campaigns) {
    if (c.status !== "active") continue;
    if (c.ends_at && new Date(c.ends_at) <= now) continue;
    const cap = c.available_quantity ?? c.max_participants;
    if (cap == null) continue;
    total += Math.max(0, cap - (participantCountByCampaign.get(c.id) ?? 0));
  }
  return total;
}

export function countNewExplorersToday(
  firstVisitByUser: Map<string, string>,
  todayIso: string,
): number {
  let count = 0;
  for (const first of firstVisitByUser.values()) {
    if (first >= todayIso) count += 1;
  }
  return count;
}
