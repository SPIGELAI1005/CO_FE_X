import { describe, expect, it } from "vitest";
import {
  canJoinCampaign,
  campaignHasStarted,
  isCampaignDiscoverable,
  isCampaignExpired,
  isCampaignFull,
  remainingCampaignQuantity,
} from "./campaign-availability";

const now = new Date("2026-06-23T12:00:00.000Z");

describe("campaign-availability", () => {
  it("detects expired campaigns by status or ends_at", () => {
    expect(isCampaignExpired({ status: "expired", endsAt: null, now })).toBe(true);
    expect(
      isCampaignExpired({
        status: "active",
        endsAt: "2026-06-22T00:00:00.000Z",
        now,
      }),
    ).toBe(true);
    expect(
      isCampaignExpired({
        status: "active",
        endsAt: "2026-06-24T00:00:00.000Z",
        now,
      }),
    ).toBe(false);
  });

  it("computes remaining quantity from available_quantity or max_participants", () => {
    expect(
      remainingCampaignQuantity({
        availableQuantity: 10,
        maxParticipants: 100,
        participantCount: 7,
      }),
    ).toBe(3);
    expect(
      remainingCampaignQuantity({
        availableQuantity: null,
        maxParticipants: 5,
        participantCount: 5,
      }),
    ).toBe(0);
  });

  it("blocks join when campaign is full", () => {
    expect(
      isCampaignFull({
        status: "active",
        endsAt: null,
        availableQuantity: 3,
        maxParticipants: null,
        participantCount: 3,
        now,
      }),
    ).toBe(true);
    expect(canJoinCampaign({
      status: "active",
      endsAt: null,
      availableQuantity: 3,
      maxParticipants: null,
      participantCount: 3,
      now,
    })).toEqual({ ok: false, reason: "full" });
  });

  it("blocks join for expired or inactive campaigns", () => {
    expect(
      canJoinCampaign({
        status: "active",
        endsAt: "2026-06-20T00:00:00.000Z",
        availableQuantity: 10,
        maxParticipants: null,
        participantCount: 0,
        now,
      }),
    ).toEqual({ ok: false, reason: "expired" });
    expect(
      canJoinCampaign({
        status: "paused",
        endsAt: null,
        availableQuantity: 10,
        maxParticipants: null,
        participantCount: 0,
        now,
      }),
    ).toEqual({ ok: false, reason: "not_active" });
  });

  it("lists discoverable active non-expired campaigns", () => {
    expect(
      isCampaignDiscoverable({
        status: "active",
        endsAt: "2026-06-24T00:00:00.000Z",
        availableQuantity: 5,
        maxParticipants: null,
        participantCount: 0,
        now,
      }),
    ).toBe(true);
    expect(
      isCampaignDiscoverable({
        status: "active",
        endsAt: "2026-06-20T00:00:00.000Z",
        availableQuantity: 5,
        maxParticipants: null,
        participantCount: 0,
        now,
      }),
    ).toBe(false);
  });

  it("treats UTC-midnight custom start dates as live from local calendar day", () => {
    const startsAt = "2026-06-24T00:00:00.000Z";
    const justAfterLocalMidnight = new Date(2026, 5, 24, 0, 10, 0, 0);
    expect(campaignHasStarted(startsAt, justAfterLocalMidnight)).toBe(true);
    expect(
      canJoinCampaign({
        status: "active",
        startsAt,
        endsAt: "2026-06-24T21:59:59.999Z",
        availableQuantity: 10,
        maxParticipants: null,
        participantCount: 0,
        now: justAfterLocalMidnight,
      }),
    ).toEqual({ ok: true });
  });

  it("keeps exact start time for same-day publish (today_only)", () => {
    const startsAt = "2026-06-24T13:00:00.000Z";
    const beforePublish = new Date("2026-06-24T12:00:00.000Z");
    expect(campaignHasStarted(startsAt, beforePublish)).toBe(false);
  });
});
