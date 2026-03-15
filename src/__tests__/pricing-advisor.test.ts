import { describe, it, expect, vi, beforeEach } from "vitest";
import { Chargly } from "../client";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

describe("Pricing Advisor", () => {
  const client = new Chargly({ apiKey: "sk_123" });

  describe("getPricingRule", () => {
    it("requests correct path and returns rule", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              id: "pr_1",
              feature: "chat.reply",
              multiplier: 1000,
              minimumCredits: 3,
              enabled: true,
              version: 2,
            })
          ),
      });

      const rule = await client.getPricingRule({ feature: "chat.reply" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.chargly.ai/api/pricing/rules/chat.reply",
        expect.objectContaining({ method: "GET" })
      );
      expect(rule).toEqual({
        id: "pr_1",
        feature: "chat.reply",
        multiplier: 1000,
        minimumCredits: 3,
        enabled: true,
        version: 2,
      });
    });
  });

  describe("listPricingRecommendations", () => {
    it("returns recommendations with optional filters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              items: [
                {
                  id: "rec_1",
                  feature: "chat.reply",
                  currentCredits: 4,
                  recommendedCredits: 5,
                  reason: "Margin below target",
                  confidence: "high",
                  estimatedLift: "+$182/mo",
                  versionFrom: 1,
                  versionTo: 2,
                  status: "pending",
                  createdAt: "2025-03-12T12:00:00Z",
                },
              ],
            })
          ),
      });

      const { recommendations } = await client.listPricingRecommendations({
        feature: "chat.reply",
        status: "pending",
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/pricing/recommendations"),
        expect.any(Object)
      );
      expect(mockFetch.mock.calls[0][0]).toContain("feature=chat.reply");
      expect(mockFetch.mock.calls[0][0]).toContain("status=pending");
      expect(mockFetch.mock.calls[0][0]).toContain("limit=10");

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toMatchObject({
        id: "rec_1",
        feature: "chat.reply",
        currentCredits: 4,
        recommendedCredits: 5,
        reason: "Margin below target",
        confidence: "high",
        estimatedLift: "+$182/mo",
      });
    });

    it("works without filters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ items: [] })),
      });

      const { recommendations } = await client.listPricingRecommendations();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.chargly.ai/api/pricing/recommendations",
        expect.any(Object)
      );
      expect(recommendations).toEqual([]);
    });
  });

  describe("getPricingRecommendation", () => {
    it("returns single recommendation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              id: "rec_1",
              feature: "image.generate",
              currentCredits: 40,
              recommendedCredits: 45,
              reason: "Provider cost drift",
              confidence: "medium",
            })
          ),
      });

      const rec = await client.getPricingRecommendation({ recommendationId: "rec_1" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.chargly.ai/api/pricing/recommendations/rec_1",
        expect.objectContaining({ method: "GET" })
      );
      expect(rec.feature).toBe("image.generate");
      expect(rec.recommendedCredits).toBe(45);
    });
  });

  describe("explainPricingRecommendation", () => {
    it("returns explanation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              recommendationId: "rec_1",
              reason: "Margin below target threshold",
              confidence: "high",
              targetMarginPercent: 75,
              estimatedMarginPercent: 79,
              providerCostContext: "$0.0042/req",
              versionTransition: { from: 1, to: 2 },
            })
          ),
      });

      const explanation = await client.explainPricingRecommendation({
        recommendationId: "rec_1",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.chargly.ai/api/pricing/recommendations/rec_1/explain",
        expect.objectContaining({ method: "GET" })
      );
      expect(explanation.reason).toBe("Margin below target threshold");
      expect(explanation.confidence).toBe("high");
      expect(explanation.versionTransition).toEqual({ from: 1, to: 2 });
    });
  });

  describe("applyPricingRecommendation", () => {
    it("sends POST and returns result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              success: true,
              recommendationId: "rec_1",
              status: "applied",
              newVersion: 2,
            })
          ),
      });

      const result = await client.applyPricingRecommendation({ recommendationId: "rec_1" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.chargly.ai/api/pricing/recommendations/rec_1/apply",
        expect.objectContaining({
          method: "POST",
          body: "{}",
        })
      );
      expect(result).toEqual({
        success: true,
        recommendationId: "rec_1",
        status: "applied",
        newVersion: 2,
      });
    });
  });

  describe("rejectPricingRecommendation", () => {
    it("sends POST and returns result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              success: true,
              recommendationId: "rec_1",
              status: "rejected",
            })
          ),
      });

      const result = await client.rejectPricingRecommendation({ recommendationId: "rec_1" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.chargly.ai/api/pricing/recommendations/rec_1/reject",
        expect.objectContaining({ method: "POST" })
      );
      expect(result).toEqual({
        success: true,
        recommendationId: "rec_1",
        status: "rejected",
      });
    });
  });

  describe("error handling", () => {
    it("propagates CharglyError on 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () =>
          Promise.resolve(
            JSON.stringify({ error: { code: "not_found", message: "Recommendation not found" } })
          ),
      });

      await expect(
        client.getPricingRecommendation({ recommendationId: "rec_missing" })
      ).rejects.toMatchObject({
        name: "CharglyError",
        statusCode: 404,
        code: "not_found",
      });
    });
  });
});
