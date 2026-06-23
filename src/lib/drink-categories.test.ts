import { describe, expect, it } from "vitest";
import { resolveDrinkCategory, energyVibeLabelKey } from "./drink-categories";

describe("resolveDrinkCategory", () => {
  it("maps known reward types", () => {
    expect(resolveDrinkCategory("espresso")).toBe("espresso");
    expect(resolveDrinkCategory("cappuccino")).toBe("cappuccino");
    expect(resolveDrinkCategory("matcha")).toBe("matcha");
    expect(resolveDrinkCategory("ice_cream")).toBe("ice_cream");
  });

  it("falls back to other for generic coffee", () => {
    expect(resolveDrinkCategory("coffee")).toBe("other");
    expect(resolveDrinkCategory(null)).toBe("other");
    expect(resolveDrinkCategory("unknown")).toBe("other");
  });
});

describe("energyVibeLabelKey", () => {
  it("returns i18n keys for vibes", () => {
    expect(energyVibeLabelKey("fully_brewed")).toBe("drinkTracker.vibes.fullyBrewed");
    expect(energyVibeLabelKey(undefined)).toBe("drinkTracker.vibes.sleepy");
  });
});
