import { describe, expect, it } from "vitest";
import {
  canJoinCampaign,
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
});
