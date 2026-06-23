/** Pure helpers for campaign join/discovery eligibility (mirrors map + detail UI rules). */

export interface CampaignAvailabilityInput {
  status: string;
  endsAt: string | null;
  startsAt?: string | null;
  availableQuantity: number | null;
  maxParticipants: number | null;
  participantCount: number;
  now?: Date;
}

export function isCampaignExpired(
  input: Pick<CampaignAvailabilityInput, "status" | "endsAt"> & { now?: Date },
): boolean {
  const now = input.now ?? new Date();
  if (input.status === "expired" || input.status === "ended" || input.status === "completed") {
    return true;
  }
  if (input.endsAt && new Date(input.endsAt) <= now) return true;
  return false;
}

export function remainingCampaignQuantity(
  input: Pick<CampaignAvailabilityInput, "availableQuantity" | "maxParticipants" | "participantCount">,
): number | null {
  const cap = input.availableQuantity ?? input.maxParticipants;
  if (cap == null) return null;
  return Math.max(0, cap - input.participantCount);
}

export function isCampaignFull(input: CampaignAvailabilityInput): boolean {
  const remaining = remainingCampaignQuantity(input);
  return remaining !== null && remaining <= 0;
}

export function canJoinCampaign(
  input: CampaignAvailabilityInput,
): { ok: true } | { ok: false; reason: "expired" | "full" | "not_active" | "not_started" } {
  const now = input.now ?? new Date();
  if (input.status !== "active") return { ok: false, reason: "not_active" };
  if (input.startsAt && new Date(input.startsAt) > now) return { ok: false, reason: "not_started" };
  if (isCampaignExpired(input)) return { ok: false, reason: "expired" };
  if (isCampaignFull(input)) return { ok: false, reason: "full" };
  return { ok: true };
}

/** Active campaigns visible on discovery map (non-expired). */
export function isCampaignDiscoverable(input: CampaignAvailabilityInput): boolean {
  if (input.status !== "active") return false;
  return !isCampaignExpired(input);
}
