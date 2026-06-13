import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface CheckInRpcResult {
  check_in_id: string;
  points_awarded: number;
  total_points: number;
  total_check_ins: number;
  new_badges: { slug: string; name: string }[];
}

export async function rpcPerformCheckIn(
  client: SupabaseClient<Database>,
  payload: {
    shopId: string;
    latitude: number;
    longitude: number;
    campaignId?: string;
  },
) {
  return client.rpc("perform_check_in", {
    _shop_id: payload.shopId,
    _campaign_id: payload.campaignId ?? undefined,
    _latitude: payload.latitude,
    _longitude: payload.longitude,
  });
}

export async function rpcJoinCampaign(client: SupabaseClient<Database>, campaignId: string) {
  return client.rpc("join_campaign", { _campaign_id: campaignId });
}

export async function rpcRedeemCampaign(client: SupabaseClient<Database>, campaignId: string) {
  return client.rpc("redeem_campaign", { _campaign_id: campaignId });
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
  };
}

export function parseRpcErrorMessage(error: { message?: string } | null): string {
  if (!error?.message) return "Request failed";
  return error.message.replace(/^.*?: /, "");
}
