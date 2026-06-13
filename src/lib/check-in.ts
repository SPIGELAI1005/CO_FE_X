import { CHECK_IN_MAX_METRES, haversineMetres } from "@/lib/geo";

export const CHECK_IN_COOLDOWN_HOURS = 24;
export const CHECK_IN_RATE_LIMIT_PER_HOUR = 20;
export const REVIEW_REQUIRES_CHECK_IN_DAYS = 30;

export interface CheckInValidationInput {
  userLatitude: number | null | undefined;
  userLongitude: number | null | undefined;
  shopLatitude: number | null | undefined;
  shopLongitude: number | null | undefined;
  shopApproved?: boolean;
  lastCheckInAt?: Date | null;
  recentCheckInCountLastHour?: number;
  now?: Date;
}

export type CheckInValidationCode =
  | "ok"
  | "missing_location"
  | "shop_unavailable"
  | "shop_missing_coords"
  | "too_far"
  | "cooldown"
  | "rate_limited";

export interface CheckInValidationResult {
  ok: boolean;
  code: CheckInValidationCode;
  distanceMetres?: number;
}

export function validateCheckIn(input: CheckInValidationInput): CheckInValidationResult {
  const now = input.now ?? new Date();

  if (input.userLatitude == null || input.userLongitude == null) {
    return { ok: false, code: "missing_location" };
  }

  if (input.shopApproved === false) {
    return { ok: false, code: "shop_unavailable" };
  }

  if (input.shopLatitude == null || input.shopLongitude == null) {
    return { ok: false, code: "shop_missing_coords" };
  }

  if ((input.recentCheckInCountLastHour ?? 0) >= CHECK_IN_RATE_LIMIT_PER_HOUR) {
    return { ok: false, code: "rate_limited" };
  }

  const distanceMetres = haversineMetres(
    input.userLatitude,
    input.userLongitude,
    input.shopLatitude,
    input.shopLongitude,
  );

  if (distanceMetres > CHECK_IN_MAX_METRES) {
    return { ok: false, code: "too_far", distanceMetres };
  }

  if (input.lastCheckInAt) {
    const hoursSince =
      (now.getTime() - input.lastCheckInAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince < CHECK_IN_COOLDOWN_HOURS) {
      return { ok: false, code: "cooldown", distanceMetres };
    }
  }

  return { ok: true, code: "ok", distanceMetres };
}

export function checkInErrorMessage(result: CheckInValidationResult): string {
  switch (result.code) {
    case "missing_location":
      return "Location required — enable GPS to check in at the café";
    case "shop_unavailable":
      return "Coffee shop not available";
    case "shop_missing_coords":
      return "This café has no location on file yet";
    case "too_far":
      return `You must be within ${CHECK_IN_MAX_METRES} m of the café to check in (currently ~${Math.round(result.distanceMetres ?? 0)} m away)`;
    case "cooldown":
      return "You already checked in here in the last 24h";
    case "rate_limited":
      return "Too many check-in attempts. Try again in an hour.";
    default:
      return "Unable to check in";
  }
}

export function canSubmitReview(lastCheckInAt: Date | null | undefined, now = new Date()): boolean {
  if (!lastCheckInAt) return false;
  const days = (now.getTime() - lastCheckInAt.getTime()) / (1000 * 60 * 60 * 24);
  return days <= REVIEW_REQUIRES_CHECK_IN_DAYS;
}
