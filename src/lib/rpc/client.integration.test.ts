import { describe, expect, it, vi } from "vitest";
import {
  parseCheckInResult,
  parseClaimChallengeResult,
  parseRpcErrorMessage,
  rpcClaimExplorerChallenge,
  rpcJoinCampaign,
  rpcPerformCheckIn,
  rpcRedeemCampaign,
  rpcVerifyRedemptionCode,
} from "./client";
import { parseVerifyRedemptionResult } from "@/lib/verify-redemption";

function mockClient(rpcImpl: (...args: unknown[]) => unknown) {
  return { rpc: vi.fn(rpcImpl) } as unknown as Parameters<typeof rpcPerformCheckIn>[0];
}

describe("rpc client wrappers", () => {
  it("calls perform_check_in with coordinates", async () => {
    const client = mockClient(() =>
      Promise.resolve({
        data: {
          check_in_id: "ci-1",
          points_awarded: 10,
          total_points: 20,
          total_check_ins: 2,
          new_badges: [],
        },
        error: null,
      }),
    );

    const { data, error } = await rpcPerformCheckIn(client, {
      shopId: "shop-1",
      latitude: 38.71,
      longitude: -9.14,
    });

    expect(error).toBeNull();
    expect(client.rpc).toHaveBeenCalledWith("perform_check_in", {
      _shop_id: "shop-1",
      _campaign_id: undefined,
      _latitude: 38.71,
      _longitude: -9.14,
    });
    expect(parseCheckInResult(data)?.points_awarded).toBe(10);
  });

  it("surfaces distance errors from RPC", async () => {
    const client = mockClient(() =>
      Promise.resolve({
        data: null,
        error: { message: 'You must be within 200 m of the café to check in (currently ~450 m away)' },
      }),
    );

    const { error } = await rpcPerformCheckIn(client, {
      shopId: "shop-1",
      latitude: 38.8,
      longitude: -9.14,
    });

    expect(parseRpcErrorMessage(error)).toContain("200 m");
  });

  it("joins and redeems campaigns via RPC names", async () => {
    const client = mockClient((name: unknown) => {
      if (name === "join_campaign") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: { points_awarded: 25 }, error: null });
    });

    await rpcJoinCampaign(client, "camp-1", { termsAccepted: true });
    const redeem = await rpcRedeemCampaign(client, "camp-1");

    expect(client.rpc).toHaveBeenCalledWith("join_campaign", {
      _campaign_id: "camp-1",
      _join_source: undefined,
      _terms_accepted: true,
      _disclosure_acknowledged: false,
    });
    expect(client.rpc).toHaveBeenCalledWith("redeem_campaign", { _campaign_id: "camp-1" });
    expect(redeem.data).toEqual({ points_awarded: 25 });
  });

  it("claims explorer challenge via RPC", async () => {
    const client = mockClient((name: unknown) => {
      if (name === "claim_explorer_challenge") {
        return Promise.resolve({
          data: {
            challenge_id: "weekly",
            period_key: "2026-W24",
            points_awarded: 50,
            total_points: 250,
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { data, error } = await rpcClaimExplorerChallenge(client, "weekly");

    expect(error).toBeNull();
    expect(client.rpc).toHaveBeenCalledWith("claim_explorer_challenge", { _challenge_id: "weekly" });
    expect(parseClaimChallengeResult(data)?.points_awarded).toBe(50);
  });

  it("surfaces incomplete challenge errors from RPC", async () => {
    const client = mockClient(() =>
      Promise.resolve({
        data: null,
        error: { message: "Challenge not complete (3 / 5)" },
      }),
    );

    const { error } = await rpcClaimExplorerChallenge(client, "weekly");
    expect(parseRpcErrorMessage(error)).toContain("3 / 5");
  });

  it("surfaces already claimed errors from RPC", async () => {
    const client = mockClient(() =>
      Promise.resolve({
        data: null,
        error: { message: "Already claimed" },
      }),
    );

    const { error } = await rpcClaimExplorerChallenge(client, "weekly");
    expect(parseRpcErrorMessage(error)).toBe("Already claimed");
  });

  it("verifies redemption codes with optional rotating token", async () => {
    const client = mockClient((name: unknown, args: unknown) => {
      if (name === "verify_redemption_code") {
        return Promise.resolve({
          data: {
            result: "ok",
            redemption_code: "ABC12345",
            kind: "campaign",
            points_awarded: 30,
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { data, error } = await rpcVerifyRedemptionCode(client, {
      code: "ABC12345",
      rotatingToken: "654321",
    });

    expect(error).toBeNull();
    expect(client.rpc).toHaveBeenCalledWith("verify_redemption_code", {
      _code: "ABC12345",
      _rotating_token: "654321",
      _ip: undefined,
    });
    expect(parseVerifyRedemptionResult(data)?.result).toBe("ok");
  });

  it("surfaces duplicate redemption errors from verify RPC", async () => {
    const client = mockClient(() =>
      Promise.resolve({
        data: { result: "already_used", redemption_code: "ABC12345" },
        error: null,
      }),
    );

    const { data } = await rpcVerifyRedemptionCode(client, { code: "ABC12345" });
    expect(parseVerifyRedemptionResult(data)?.result).toBe("already_used");
  });

  it("surfaces expired campaign errors from redeem RPC", async () => {
    const client = mockClient(() =>
      Promise.resolve({
        data: null,
        error: { message: "Campaign has ended" },
      }),
    );

    const { error } = await rpcRedeemCampaign(client, "camp-ended");
    expect(parseRpcErrorMessage(error)).toContain("ended");
  });
});
