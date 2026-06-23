export type TrustStatus = "normal" | "watch" | "flagged" | "restricted";

export const TRUST_STATUS_LABELS: Record<TrustStatus, string> = {
  normal: "Normal",
  watch: "Watch",
  flagged: "Flagged",
  restricted: "Restricted",
};

export const TRUST_STATUS_TONES: Record<TrustStatus, string> = {
  normal: "bg-emerald-100 text-emerald-800",
  watch: "bg-amber-100 text-amber-900",
  flagged: "bg-orange-100 text-orange-900",
  restricted: "bg-rose-100 text-rose-900",
};

export interface PrivacyPreferences {
  show_on_leaderboard?: boolean;
  allow_arrival_signals?: boolean;
  allow_gift_receipt?: boolean;
  marketing_emails?: boolean;
  /** When false, check-ins skip GPS distance validation (privacy mode). */
  share_location?: boolean;
}

export function userSharesLocation(prefs: PrivacyPreferences | Record<string, unknown> | null | undefined): boolean {
  if (!prefs || typeof prefs !== "object") return true;
  if ("share_location" in prefs && prefs.share_location === false) return false;
  return true;
}

export interface DuplicateRedemptionRow {
  id: string;
  code: string;
  result: string;
  verified_at: string;
  explorer_id: string | null;
  explorer_name: string | null;
  campaign_title: string | null;
  shop_name: string | null;
}

export interface QrScanFailureRow {
  id: string;
  result: string;
  token: string | null;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  shop_name: string | null;
}

export interface AdminFraudDashboard {
  suspicious_users: SuspiciousUserRow[];
  failed_scans: FailedScanRow[];
  duplicate_redemptions: DuplicateRedemptionRow[];
  qr_scan_failures: QrScanFailureRow[];
  rejected_proofs: RejectedProofRow[];
  high_redemption_users: HighRedemptionRow[];
  cafe_reports: CafeReportRow[];
  qr_failures_7d: number;
  open_content_reports: number;
}

export interface SuspiciousUserRow {
  id: string;
  display_name: string | null;
  handle: string | null;
  trust_status: TrustStatus;
  fraud_score: number;
  total_check_ins: number;
  total_rewards_redeemed: number;
  events_7d: number;
}

export interface FailedScanRow {
  id: string;
  code: string;
  result: string;
  verified_at: string;
  explorer_id: string | null;
  campaign_id: string | null;
  campaign_title: string | null;
  shop_name: string | null;
}

export interface RejectedProofRow {
  id: string;
  user_id: string;
  campaign_id: string;
  platform: string;
  status: string;
  reviewed_at: string | null;
  review_notes: string | null;
  campaign_title: string | null;
  explorer_name: string | null;
}

export interface HighRedemptionRow {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  trust_status: TrustStatus;
  redemptions_24h: number;
}

export interface CafeReportRow {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reported_user_id: string | null;
  shop_name: string | null;
  campaign_title: string | null;
  reporter_name: string | null;
}

export function parseAdminFraudDashboard(raw: unknown): AdminFraudDashboard {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    suspicious_users: Array.isArray(o.suspicious_users) ? (o.suspicious_users as SuspiciousUserRow[]) : [],
    failed_scans: Array.isArray(o.failed_scans) ? (o.failed_scans as FailedScanRow[]) : [],
    duplicate_redemptions: Array.isArray(o.duplicate_redemptions)
      ? (o.duplicate_redemptions as DuplicateRedemptionRow[])
      : [],
    qr_scan_failures: Array.isArray(o.qr_scan_failures) ? (o.qr_scan_failures as QrScanFailureRow[]) : [],
    rejected_proofs: Array.isArray(o.rejected_proofs) ? (o.rejected_proofs as RejectedProofRow[]) : [],
    high_redemption_users: Array.isArray(o.high_redemption_users)
      ? (o.high_redemption_users as HighRedemptionRow[])
      : [],
    cafe_reports: Array.isArray(o.cafe_reports) ? (o.cafe_reports as CafeReportRow[]) : [],
    qr_failures_7d: Number(o.qr_failures_7d ?? 0),
    open_content_reports: Number(o.open_content_reports ?? 0),
  };
}
