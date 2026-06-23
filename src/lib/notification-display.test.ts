import { describe, expect, it } from "vitest";
import { getNotificationDisplay } from "./notification-display";

const t = (key: string, vars?: Record<string, string> & { defaultValue?: string }) => {
  const map: Record<string, string> = {
    "notificationTypes.partner_application_received.title": "Application received",
    "notificationTypes.partner_application_received.body":
      "Thank you for applying with {{business_name}}. We're reviewing your application and will get back to you soon.",
  };
  if (!map[key]) return vars?.defaultValue ?? key;
  let out = map[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      if (k === "defaultValue") continue;
      out = out.replace(`{{${k}}}`, v);
    }
  }
  return out;
};

describe("getNotificationDisplay", () => {
  it("localizes known partner application types", () => {
    const display = getNotificationDisplay(
      {
        type: "partner_application_received",
        title: "Partner application received",
        body: "fallback",
        payload: { business_name: "Klein & Fein" },
      },
      t,
    );
    expect(display.title).toBe("Application received");
    expect(display.body).toContain("Klein & Fein");
  });

  it("falls back to stored copy for dynamic notification types", () => {
    const display = getNotificationDisplay(
      {
        type: "campaign_joined",
        title: "You joined Matcha Week",
        body: "Visit Café Luna and check in.",
        payload: null,
      },
      t,
    );
    expect(display.title).toBe("You joined Matcha Week");
    expect(display.body).toBe("Visit Café Luna and check in.");
  });
});
