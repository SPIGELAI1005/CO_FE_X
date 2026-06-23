export type VerifyResultCode =
  | "ok"
  | "already_used"
  | "not_found"
  | "not_yours"
  | "expired"
  | "invalid_token"
  | "rate_limited"
  | "gift_pending";

export interface VerifyRedemptionResult {
  result: VerifyResultCode;
  redemption_code: string;
  kind?: "campaign" | "wallet";
  campaign_title?: string;
  reward?: string | null;
  shop_name?: string;
  used_at?: string | null;
  expires_at?: string | null;
  points_awarded?: number;
}

const VERIFY_RESULT_CODES = new Set<VerifyResultCode>([
  "ok",
  "already_used",
  "not_found",
  "not_yours",
  "expired",
  "invalid_token",
  "rate_limited",
  "gift_pending",
]);

export function parseVerifyRedemptionResult(raw: unknown): VerifyRedemptionResult | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const result = String(row.result ?? "");
  if (!VERIFY_RESULT_CODES.has(result as VerifyResultCode)) return null;
  return {
    result: result as VerifyResultCode,
    redemption_code: String(row.redemption_code ?? ""),
    kind: row.kind === "wallet" ? "wallet" : row.kind === "campaign" ? "campaign" : undefined,
    campaign_title: row.campaign_title ? String(row.campaign_title) : undefined,
    reward: row.reward != null ? String(row.reward) : null,
    shop_name: row.shop_name ? String(row.shop_name) : undefined,
    used_at: row.used_at ? String(row.used_at) : null,
    expires_at: row.expires_at ? String(row.expires_at) : null,
    points_awarded: row.points_awarded != null ? Number(row.points_awarded) : undefined,
  };
}

export function isVerifySuccess(result: VerifyResultCode): boolean {
  return result === "ok";
}

export function isDuplicateRedemption(result: VerifyResultCode): boolean {
  return result === "already_used";
}

export function verifyResultSeverity(result: VerifyResultCode): "success" | "warn" | "error" {
  if (result === "ok") return "success";
  if (result === "already_used" || result === "expired" || result === "gift_pending") return "warn";
  return "error";
}
