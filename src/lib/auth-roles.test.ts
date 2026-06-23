import { describe, expect, it } from "vitest";
import {
  canAccessAdminRoute,
  canAccessPartnerRoute,
  defaultExplorerRoles,
  hasAppRole,
} from "./auth-roles";

describe("auth-roles", () => {
  it("grants admin route only to admins", () => {
    expect(canAccessAdminRoute(["admin"])).toBe(true);
    expect(canAccessAdminRoute(["partner"])).toBe(false);
    expect(canAccessAdminRoute(["explorer"])).toBe(false);
  });

  it("grants partner route to partners, shop owners, or admins", () => {
    expect(canAccessPartnerRoute(["partner"], false)).toBe(true);
    expect(canAccessPartnerRoute(["explorer"], true)).toBe(true);
    expect(canAccessPartnerRoute(["admin"], false)).toBe(true);
    expect(canAccessPartnerRoute(["explorer"], false)).toBe(false);
  });

  it("checks individual roles", () => {
    expect(hasAppRole(["explorer", "partner"], "partner")).toBe(true);
    expect(defaultExplorerRoles()).toEqual(["explorer"]);
  });
});
