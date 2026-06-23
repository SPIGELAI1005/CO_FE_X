import { describe, expect, it } from "vitest";
import {
  buildCombinedTerms,
  buildPartnerCampaignTermsTemplate,
  buildPlatformDefaultTerms,
  needsDisclosureAcknowledgment,
} from "./campaign-compliance";

describe("campaign-compliance", () => {
  it("detects social campaigns needing disclosure", () => {
    expect(needsDisclosureAcknowledgment("social_proof")).toBe(true);
    expect(needsDisclosureAcknowledgment("hybrid")).toBe(true);
    expect(needsDisclosureAcknowledgment("check_in")).toBe(false);
  });

  it("builds platform terms in EN and DE", () => {
    expect(buildPlatformDefaultTerms("en")).toContain("#ad");
    expect(buildPlatformDefaultTerms("de")).toContain("#Anzeige");
  });

  it("merges café terms", () => {
    const t = buildCombinedTerms({ cafeTerms: "No reposts.", locale: "en" });
    expect(t.fullText).toContain("No reposts");
    expect(t.cafeTerms).toBe("No reposts.");
  });

  it("builds partner wizard terms template", () => {
    expect(buildPartnerCampaignTermsTemplate("en")).toContain("EEFFOC");
    expect(buildPartnerCampaignTermsTemplate("de")).toContain("EEFFOC");
  });
});
