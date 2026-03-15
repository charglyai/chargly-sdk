import { describe, it, expect, vi, beforeEach } from "vitest";
import { Chargly } from "../client";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

describe("Chargly client", () => {
  describe("initialization", () => {
    it("throws when apiKey is missing", () => {
      expect(() => new Chargly({ apiKey: "" })).toThrow("Chargly: apiKey is required");
      expect(() => new Chargly({ apiKey: null as unknown as string })).toThrow(
        "Chargly: apiKey is required"
      );
    });

    it("uses default baseUrl when not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ userId: "u1", walletId: "w1", balance: 100, unit: "credits" })),
      });

      const client = new Chargly({ apiKey: "sk_test_123" });
      await client.getWallet({ customerId: "u1" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.chargly.ai/api/wallet/balance/u1",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "x-api-key": "sk_test_123",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("uses custom baseUrl when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ userId: "u1", walletId: "w1", balance: 50, unit: "credits" })),
      });

      const client = new Chargly({ apiKey: "sk_123", baseUrl: "https://custom.api.test" });
      await client.getWallet({ customerId: "u1" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.api.test/api/wallet/balance/u1",
        expect.any(Object)
      );
    });
  });

  describe("getWallet", () => {
    it("returns wallet data with correct shape", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              userId: "cust_abc",
              walletId: "wal_xyz",
              balance: 500,
              unit: "credits",
            })
          ),
      });

      const client = new Chargly({ apiKey: "sk_123" });
      const wallet = await client.getWallet({ customerId: "cust_abc" });

      expect(wallet).toEqual({
        customerId: "cust_abc",
        walletId: "wal_xyz",
        balance: 500,
        unit: "credits",
      });
    });
  });

  describe("meterEvent", () => {
    it("calls consume then usage log and returns combined result", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                success: true,
                creditsCharged: 40,
                balanceAfter: 460,
                transactionId: "txn_1",
              })
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ id: "evt_123" })),
        });

      const client = new Chargly({ apiKey: "sk_123" });
      const result = await client.meterEvent({
        customerId: "u1",
        event: "image.generate",
        credits: 40,
        metadata: { reqId: "r1" },
      });

      expect(result).toEqual({
        success: true,
        eventId: "evt_123",
        deductedCredits: 40,
        remainingBalance: 460,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/wallet/consume"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            userId: "u1",
            amount: 40,
            source: "image.generate",
          }),
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/api/usage/log"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            userId: "u1",
            featureKey: "image.generate",
            creditsCharged: 40,
            metadata: { reqId: "r1" },
          }),
        })
      );
    });
  });

  describe("createCheckout", () => {
    it("returns checkout URL and credits", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              checkoutId: "cs_123",
              checkoutUrl: "https://checkout.stripe.com/...",
              credits: 2000,
            })
          ),
      });

      const client = new Chargly({ apiKey: "sk_123" });
      const checkout = await client.createCheckout({
        customerId: "u1",
        creditPackId: "chargly_2000",
        successUrl: "https://app.com/success",
        cancelUrl: "https://app.com/cancel",
      });

      expect(checkout).toEqual({
        checkoutId: "cs_123",
        checkoutUrl: "https://checkout.stripe.com/...",
        credits: 2000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/billing/checkout"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            userId: "u1",
            creditPackCode: "chargly_2000",
            successUrl: "https://app.com/success",
            cancelUrl: "https://app.com/cancel",
          }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("propagates CharglyError when API returns non-2xx", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: { code: "insufficient_balance", message: "Insufficient balance" },
            })
          ),
      });

      const client = new Chargly({ apiKey: "sk_123" });

      await expect(
        client.meterEvent({ customerId: "u1", event: "chat.reply", credits: 99999 })
      ).rejects.toMatchObject({
        name: "CharglyError",
        message: "Insufficient balance",
        statusCode: 400,
        code: "insufficient_balance",
      });
    });
  });

  describe("listCreditPacks", () => {
    it("maps API response to packs shape", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              items: [
                { code: "pack_500", name: "500 Credits", credits: 500, priceCents: 500 },
                { code: "pack_2000", name: "2000 Credits", credits: 2000, priceCents: 1500 },
              ],
            })
          ),
      });

      const client = new Chargly({ apiKey: "sk_123" });
      const { packs } = await client.listCreditPacks();

      expect(packs).toEqual([
        { id: "pack_500", name: "500 Credits", credits: 500, price: 500 },
        { id: "pack_2000", name: "2000 Credits", credits: 2000, price: 1500 },
      ]);
    });
  });
});
