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

/** Wizard custom dates were saved as UTC midnight; treat as live from local start of that day. */
export function isUtcDateBoundary(d: Date): boolean {
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

export function localStartOfCalendarDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function campaignHasStarted(startsAt: string | null | undefined, now = new Date()): boolean {
  if (!startsAt) return true;
  const start = new Date(startsAt);
  if (now >= start) return true;
  if (isUtcDateBoundary(start)) {
    return now >= localStartOfCalendarDay(start);
  }
  return false;
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
  if (input.startsAt && !campaignHasStarted(input.startsAt, now)) {
    return { ok: false, reason: "not_started" };
  }
  if (isCampaignExpired(input)) return { ok: false, reason: "expired" };
  if (isCampaignFull(input)) return { ok: false, reason: "full" };
  return { ok: true };
}

/** Active campaigns visible on discovery map (non-expired). */
export function isCampaignDiscoverable(input: CampaignAvailabilityInput): boolean {
  if (input.status !== "active") return false;
  return !isCampaignExpired(input);
}
