import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haversineMetres } from "@/lib/geo";
import { FULFILLMENT_MODE_LABELS, type CampaignFulfillmentMode } from "@/lib/campaign-fulfillment";
import type { CampaignRewardType, OpeningHours } from "@/lib/domain/campaign-reward-model";
import { inferRewardType } from "@/lib/map/campaign-markers";
import { isOpenNow } from "@/lib/map/opening-hours";

export interface MapCampaignPin {
  campaignId: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  title: string;
  slogan: string;
  rewardDescription: string | null;
  rewardType: CampaignRewardType;
  latitude: number;
  longitude: number;
  coverImageUrl: string | null;
  logoUrl: string | null;
  fulfillmentMode: CampaignFulfillmentMode;
  socialActionLabel: string;
  participantCount: number;
  remainingQuantity: number | null;
  maxParticipants: number | null;
  endsAt: string | null;
  startsAt: string | null;
  createdAt: string;
  campaignType: string;
  distanceKm: number;
  visited: boolean;
  joined: boolean;
  isLimited: boolean;
  isExpiringSoon: boolean;
  isNew: boolean;
  isOpenNow: boolean | null;
  isBadgeCampaign: boolean;
}

export interface CampaignMapFilters {
  drinkTypes: CampaignRewardType[];
  maxDistanceKm: number;
  availableNow: boolean;
  newOnly: boolean;
  expiringSoon: boolean;
  notCollected: boolean;
  badgeCampaigns: boolean;
}

export const DEFAULT_CAMPAIGN_MAP_FILTERS: CampaignMapFilters = {
  drinkTypes: [],
  maxDistanceKm: 10,
  availableNow: false,
  newOnly: false,
  expiringSoon: false,
  notCollected: false,
  badgeCampaigns: false,
};

function socialActionLabel(mode: CampaignFulfillmentMode): string {
  return FULFILLMENT_MODE_LABELS[mode] ?? FULFILLMENT_MODE_LABELS.check_in;
}

function isExpiringSoon(endsAt: string | null): boolean {
  if (!endsAt) return false;
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  return end > now && end - now < 48 * 60 * 60 * 1000;
}

function isNewCampaign(createdAt: string, startsAt: string | null): boolean {
  const ref = startsAt ? new Date(startsAt).getTime() : new Date(createdAt).getTime();
  return Date.now() - ref < 7 * 24 * 60 * 60 * 1000;
}

export function filterCampaignPins(pins: MapCampaignPin[], filters: CampaignMapFilters): MapCampaignPin[] {
  return pins.filter((p) => {
    if (filters.drinkTypes.length && !filters.drinkTypes.includes(p.rewardType)) return false;
    if (p.distanceKm > filters.maxDistanceKm) return false;
    if (filters.availableNow && p.isOpenNow !== true) return false;
    if (filters.newOnly && !p.isNew) return false;
    if (filters.expiringSoon && !p.isExpiringSoon) return false;
    if (filters.notCollected && p.visited) return false;
    if (filters.badgeCampaigns && !p.isBadgeCampaign) return false;
    return true;
  });
}

export function useCampaignMapPins(
  userId: string | undefined,
  center: [number, number] | null,
) {
  return useQuery({
    queryKey: ["campaignMapPins", userId ?? "", center?.[0], center?.[1]],
    queryFn: async (): Promise<MapCampaignPin[]> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `id, title, slogan, reward_description, reward_type, available_quantity, max_participants,
          campaign_type, fulfillment_mode, social_requirements, starts_at, ends_at, created_at, cover_image_url,
          coffee_shops!inner (
            id, name, slug, latitude, longitude, logo_url, cover_image_url, opening_hours
          )`,
        )
        .eq("status", "active")
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`);

      if (error) throw error;

      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const campaignIds = rows.map((r) => String(r.id));

      const [{ data: participants }, { data: checkIns }, { data: joinedRows }] = await Promise.all([
        campaignIds.length
          ? supabase.from("campaign_participants").select("campaign_id").in("campaign_id", campaignIds)
          : Promise.resolve({ data: [] }),
        userId
          ? supabase.from("check_ins").select("coffee_shop_id").eq("user_id", userId)
          : Promise.resolve({ data: [] }),
        userId && campaignIds.length
          ? supabase
              .from("campaign_participants")
              .select("campaign_id")
              .eq("user_id", userId)
              .in("campaign_id", campaignIds)
          : Promise.resolve({ data: [] }),
      ]);

      const countMap = new Map<string, number>();
      for (const p of participants ?? []) {
        countMap.set(p.campaign_id, (countMap.get(p.campaign_id) ?? 0) + 1);
      }
      const visitedShops = new Set((checkIns ?? []).map((c) => c.coffee_shop_id));
      const joinedSet = new Set((joinedRows ?? []).map((j) => j.campaign_id));

      const mapCenter = center ?? [38.7139, -9.1394];

      const pins: MapCampaignPin[] = [];
      for (const row of rows) {
        const shop = row.coffee_shops as Record<string, unknown> | null;
        if (!shop) continue;
        const lat = Number(shop.latitude);
        const lng = Number(shop.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const campaignId = String(row.id);
        const participantCount = countMap.get(campaignId) ?? 0;
        const maxParticipants = row.max_participants != null ? Number(row.max_participants) : null;
        const availableQty =
          row.available_quantity != null
            ? Number(row.available_quantity)
            : maxParticipants;
        const remaining =
          availableQty != null ? Math.max(0, availableQty - participantCount) : null;
        const fulfillmentMode = (row.fulfillment_mode as CampaignFulfillmentMode) ?? "check_in";
        const openingHours = (shop.opening_hours as OpeningHours | null) ?? null;
        const rewardType = inferRewardType(
          row.reward_type as string | null,
          row.reward_description as string | null,
        );
        const campaignType = String(row.campaign_type ?? "custom");
        const endsAt = row.ends_at as string | null;
        const createdAt = String(row.created_at ?? "");
        const startsAt = row.starts_at as string | null;
        const limited = availableQty != null;

        pins.push({
          campaignId,
          shopId: String(shop.id),
          shopName: String(shop.name),
          shopSlug: String(shop.slug),
          title: String(row.title),
          slogan: String(row.slogan ?? "We give EEFFOC!"),
          rewardDescription: row.reward_description as string | null,
          rewardType,
          latitude: lat,
          longitude: lng,
          coverImageUrl: (row.cover_image_url as string | null) ?? (shop.cover_image_url as string | null),
          logoUrl: shop.logo_url as string | null,
          fulfillmentMode,
          socialActionLabel: socialActionLabel(fulfillmentMode),
          participantCount,
          remainingQuantity: remaining,
          maxParticipants,
          endsAt,
          startsAt,
          createdAt,
          campaignType,
          distanceKm: haversineMetres(mapCenter[0], mapCenter[1], lat, lng) / 1000,
          visited: visitedShops.has(String(shop.id)),
          joined: joinedSet.has(campaignId),
          isLimited: limited,
          isExpiringSoon: isExpiringSoon(endsAt),
          isNew: isNewCampaign(createdAt, startsAt),
          isOpenNow: isOpenNow(openingHours),
          isBadgeCampaign:
            campaignType === "social_story" ||
            fulfillmentMode === "social_proof" ||
            fulfillmentMode === "hybrid",
        });
      }

      return pins.sort((a, b) => a.distanceKm - b.distanceKm);
    },
    staleTime: 60_000,
  });
}
