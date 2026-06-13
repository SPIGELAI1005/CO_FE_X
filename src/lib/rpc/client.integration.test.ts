import { describe, expect, it, vi } from "vitest";
import {
  parseCheckInResult,
  parseRpcErrorMessage,
  rpcJoinCampaign,
  rpcPerformCheckIn,
  rpcRedeemCampaign,
} from "./client";

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

    await rpcJoinCampaign(client, "camp-1");
    const redeem = await rpcRedeemCampaign(client, "camp-1");

    expect(client.rpc).toHaveBeenCalledWith("join_campaign", { _campaign_id: "camp-1" });
    expect(client.rpc).toHaveBeenCalledWith("redeem_campaign", { _campaign_id: "camp-1" });
    expect(redeem.data).toEqual({ points_awarded: 25 });
  });
});
