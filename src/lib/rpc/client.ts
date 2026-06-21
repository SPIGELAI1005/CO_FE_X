import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface CheckInRpcResult {
  check_in_id: string;
  points_awarded: number;
  total_points: number;
  total_check_ins: number;
  new_badges: { slug: string; name: string }[];
  time_bonus?: string | null;
  multiplier?: number;
  beverage_tag?: string | null;
  check_in_status?: string | null;
}

export async function rpcPerformCheckIn(
  client: SupabaseClient<Database>,
  payload: {
    shopId: string;
    latitude: number;
    longitude: number;
    campaignId?: string;
    beverageTag?: string;
  },
) {
  return client.rpc("perform_check_in", {
    _shop_id: payload.shopId,
    _campaign_id: payload.campaignId ?? undefined,
    _latitude: payload.latitude,
    _longitude: payload.longitude,
    _beverage_tag: payload.beverageTag ?? undefined,
  });
}

export async function rpcJoinCampaign(client: SupabaseClient<Database>, campaignId: string) {
  return client.rpc("join_campaign", { _campaign_id: campaignId });
}

export async function rpcRedeemCampaign(client: SupabaseClient<Database>, campaignId: string) {
  return client.rpc("redeem_campaign", { _campaign_id: campaignId });
}

export interface ClaimChallengeRpcResult {
  challenge_id: string;
  period_key: string;
  points_awarded: number;
  total_points: number;
}

export async function rpcClaimExplorerChallenge(
  client: SupabaseClient<Database>,
  challengeId: string,
) {
  return client.rpc("claim_explorer_challenge", { _challenge_id: challengeId });
}

export function parseClaimChallengeResult(data: unknown): ClaimChallengeRpcResult | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (typeof row.points_awarded !== "number") return null;
  return {
    challenge_id: String(row.challenge_id ?? ""),
    period_key: String(row.period_key ?? ""),
    points_awarded: row.points_awarded,
    total_points: Number(row.total_points ?? 0),
  };
}

export function parseCheckInResult(data: unknown): CheckInRpcResult | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (typeof row.points_awarded !== "number") return null;
  return {
    check_in_id: String(row.check_in_id ?? ""),
    points_awarded: row.points_awarded,
    total_points: Number(row.total_points ?? 0),
    total_check_ins: Number(row.total_check_ins ?? 0),
    new_badges: Array.isArray(row.new_badges)
      ? (row.new_badges as { slug: string; name: string }[])
      : [],
    time_bonus: row.time_bonus ? String(row.time_bonus) : null,
    multiplier: row.multiplier != null ? Number(row.multiplier) : undefined,
    beverage_tag: row.beverage_tag ? String(row.beverage_tag) : null,
    check_in_status: row.check_in_status ? String(row.check_in_status) : null,
  };
}

export function parseRpcErrorMessage(error: { message?: string } | null): string {
  if (!error?.message) return "Request failed";
  return error.message.replace(/^.*?: /, "");
}
