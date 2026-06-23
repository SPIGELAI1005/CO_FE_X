/**
 * Campaign compliance: terms, disclosure, and privacy copy for social reward missions.
 */

export const DISCLOSURE_HASHTAGS = ["#ad", "#Anzeige", "#Werbung"] as const;

export const COMPLIANCE_TERMS_VERSION = "2026-06";

export interface CampaignTermsContext {
  cafeTerms?: string | null;
  locale?: string;
}

export function needsDisclosureAcknowledgment(fulfillmentMode: string): boolean {
  return fulfillmentMode === "social_proof" || fulfillmentMode === "hybrid";
}

export function buildPlatformDefaultTerms(locale = "en"): string {
  if (locale.startsWith("de")) {
    return [
      "Ein Reward pro Explorer, sofern das Café nichts anderes angibt.",
      "Reward-QR vor der Bestellung an der Theke zeigen.",
      "Bei Social-Kampagnen: Kooperation kennzeichnen (z. B. #ad, #Anzeige, #Werbung).",
      "Missbrauch kann zum Entzug des Rewards führen.",
    ].join(" ");
  }
  return [
    "One reward per explorer unless the café states otherwise.",
    "Show your reward QR at the counter before ordering.",
    "For social campaigns: label the collaboration (e.g. #ad, #Anzeige, #Werbung).",
    "Misuse may result in forfeited rewards.",
  ].join(" ");
}

export function buildCombinedTerms(ctx: CampaignTermsContext): {
  platformTerms: string;
  cafeTerms: string | null;
  fullText: string;
} {
  const locale = ctx.locale ?? "en";
  const platformTerms = buildPlatformDefaultTerms(locale);
  const cafeTerms = ctx.cafeTerms?.trim() || null;
  const fullText = cafeTerms
    ? `${platformTerms}\n\n${locale.startsWith("de") ? "Zusätzliche Café-Bedingungen:" : "Additional café terms:"}\n${cafeTerms}`
    : platformTerms;
  return { platformTerms, cafeTerms, fullText };
}

export type CampaignDataCategory = "check_ins" | "rewards" | "social_proof" | "location";

export interface CampaignDataPoint {
  id: CampaignDataCategory;
  optional?: boolean;
}

export const CAMPAIGN_DATA_POINTS: CampaignDataPoint[] = [
  { id: "check_ins" },
  { id: "rewards" },
  { id: "social_proof" },
  { id: "location", optional: true },
];

export function disclosureHashtagsLine(): string {
  return DISCLOSURE_HASHTAGS.join(" ");
}
