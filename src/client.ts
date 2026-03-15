import { request } from "./request";
import type {
  CharglyConfig,
  GetWalletInput,
  GetWalletResponse,
  MeterEventInput,
  MeterEventResponse,
  CreateCheckoutInput,
  CreateCheckoutResponse,
  ListCreditPacksResponse,
  CreditPack,
  GetPricingRuleInput,
  PricingRule,
  ListPricingRecommendationsInput,
  ListPricingRecommendationsResponse,
  GetPricingRecommendationInput,
  PricingRecommendation,
  ExplainPricingRecommendationInput,
  PricingRecommendationExplanation,
  ApplyPricingRecommendationInput,
  RejectPricingRecommendationInput,
  ApplyRejectRecommendationResult,
} from "./types";

/** API path prefixes - centralize for easy adjustment */
const PATHS = {
  walletBalance: (customerId: string) => `/api/wallet/balance/${customerId}`,
  walletConsume: "/api/wallet/consume",
  usageLog: "/api/usage/log",
  billingCheckout: "/api/billing/checkout",
  creditPacks: "/api/credit-packs",
  pricingRule: (feature: string) => `/api/pricing/rules/${encodeURIComponent(feature)}`,
  pricingRecommendations: "/api/pricing/recommendations",
  pricingRecommendation: (id: string) => `/api/pricing/recommendations/${encodeURIComponent(id)}`,
  pricingRecommendationExplain: (id: string) =>
    `/api/pricing/recommendations/${encodeURIComponent(id)}/explain`,
  pricingRecommendationApply: (id: string) =>
    `/api/pricing/recommendations/${encodeURIComponent(id)}/apply`,
  pricingRecommendationReject: (id: string) =>
    `/api/pricing/recommendations/${encodeURIComponent(id)}/reject`,
} as const;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
}

export class Chargly {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CharglyConfig) {
    if (!config.apiKey || typeof config.apiKey !== "string") {
      throw new Error("Chargly: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.chargly.ai";
  }

  /**
   * Get wallet balance for a customer.
   */
  async getWallet(input: GetWalletInput): Promise<GetWalletResponse> {
    const res = await request<{
      userId: string;
      walletId: string;
      balance: number;
      unit: string;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "GET",
      path: PATHS.walletBalance(input.customerId),
    });
    return {
      customerId: res.userId,
      walletId: res.walletId,
      balance: res.balance,
      unit: res.unit,
    };
  }

  /**
   * Record a usage event and deduct credits from the customer's wallet.
   */
  async meterEvent(input: MeterEventInput): Promise<MeterEventResponse> {
    const consumeRes = await request<{
      success: boolean;
      creditsCharged: number;
      balanceAfter: number;
      transactionId?: string;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "POST",
      path: PATHS.walletConsume,
      body: {
        userId: input.customerId,
        amount: input.credits,
        source: input.event,
      },
    });

    const logRes = await request<{ id: string }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "POST",
      path: PATHS.usageLog,
      body: {
        userId: input.customerId,
        featureKey: input.event,
        creditsCharged: input.credits,
        metadata: input.metadata,
      },
    });

    return {
      success: consumeRes.success,
      eventId: logRes.id,
      deductedCredits: consumeRes.creditsCharged,
      remainingBalance: consumeRes.balanceAfter,
    };
  }

  /**
   * Create a checkout session for a customer to purchase credits.
   */
  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResponse> {
    const res = await request<{
      checkoutId: string;
      checkoutUrl: string;
      credits: number;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "POST",
      path: PATHS.billingCheckout,
      body: {
        userId: input.customerId,
        creditPackCode: input.creditPackId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      },
    });
    return res;
  }

  /**
   * List available credit packs.
   */
  async listCreditPacks(): Promise<ListCreditPacksResponse> {
    const res = await request<{
      items: Array<{
        code: string;
        name: string;
        credits: number;
        priceCents: number;
        currency?: string;
      }>;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "GET",
      path: PATHS.creditPacks,
    });
    const packs: CreditPack[] = (res.items ?? []).map((p) => ({
      id: p.code,
      name: p.name,
      credits: p.credits,
      price: p.priceCents,
    }));
    return { packs };
  }

  // --- Pricing Advisor ---

  /**
   * Get a pricing rule by feature.
   */
  async getPricingRule(input: GetPricingRuleInput): Promise<PricingRule> {
    const res = await request<{
      id: string;
      feature: string;
      multiplier: number;
      minimumCredits: number;
      enabled: boolean;
      version?: number;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "GET",
      path: PATHS.pricingRule(input.feature),
    });
    return res;
  }

  /**
   * List pricing recommendations, optionally filtered.
   */
  async listPricingRecommendations(
    input?: ListPricingRecommendationsInput
  ): Promise<ListPricingRecommendationsResponse> {
    const query = buildQuery({
      feature: input?.feature,
      status: input?.status,
      limit: input?.limit,
    });
    const res = await request<{
      items: Array<{
        id: string;
        feature: string;
        currentCredits: number;
        recommendedCredits: number;
        reason: string;
        confidence: string;
        estimatedLift?: string;
        versionFrom?: number;
        versionTo?: number;
        status?: string;
        createdAt?: string;
      }>;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "GET",
      path: PATHS.pricingRecommendations + query,
    });
    const recommendations: PricingRecommendation[] = (res.items ?? []).map((r) => ({
      id: r.id,
      feature: r.feature,
      currentCredits: r.currentCredits,
      recommendedCredits: r.recommendedCredits,
      reason: r.reason,
      confidence: r.confidence as PricingRecommendation["confidence"],
      estimatedLift: r.estimatedLift,
      versionFrom: r.versionFrom,
      versionTo: r.versionTo,
      status: r.status,
      createdAt: r.createdAt,
    }));
    return { recommendations };
  }

  /**
   * Get a single pricing recommendation by ID.
   */
  async getPricingRecommendation(
    input: GetPricingRecommendationInput
  ): Promise<PricingRecommendation> {
    const res = await request<{
      id: string;
      feature: string;
      currentCredits: number;
      recommendedCredits: number;
      reason: string;
      confidence: string;
      estimatedLift?: string;
      versionFrom?: number;
      versionTo?: number;
      status?: string;
      createdAt?: string;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "GET",
      path: PATHS.pricingRecommendation(input.recommendationId),
    });
    return {
      id: res.id,
      feature: res.feature,
      currentCredits: res.currentCredits,
      recommendedCredits: res.recommendedCredits,
      reason: res.reason,
      confidence: res.confidence as PricingRecommendation["confidence"],
      estimatedLift: res.estimatedLift,
      versionFrom: res.versionFrom,
      versionTo: res.versionTo,
      status: res.status,
      createdAt: res.createdAt,
    };
  }

  /**
   * Get detailed explanation for a pricing recommendation.
   */
  async explainPricingRecommendation(
    input: ExplainPricingRecommendationInput
  ): Promise<PricingRecommendationExplanation> {
    const res = await request<{
      recommendationId: string;
      reason: string;
      confidence: string;
      targetMarginPercent?: number;
      estimatedMarginPercent?: number;
      providerCostContext?: string;
      versionTransition?: { from: number; to: number };
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "GET",
      path: PATHS.pricingRecommendationExplain(input.recommendationId),
    });
    return {
      recommendationId: res.recommendationId,
      reason: res.reason,
      confidence: res.confidence as PricingRecommendationExplanation["confidence"],
      targetMarginPercent: res.targetMarginPercent,
      estimatedMarginPercent: res.estimatedMarginPercent,
      providerCostContext: res.providerCostContext,
      versionTransition: res.versionTransition,
    };
  }

  /**
   * Apply a pricing recommendation. Creates a new pricing rule version.
   */
  async applyPricingRecommendation(
    input: ApplyPricingRecommendationInput
  ): Promise<ApplyRejectRecommendationResult> {
    const res = await request<{
      success: boolean;
      recommendationId: string;
      status: string;
      newVersion?: number;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "POST",
      path: PATHS.pricingRecommendationApply(input.recommendationId),
      body: {},
    });
    return {
      success: res.success,
      recommendationId: res.recommendationId,
      status: "applied",
      newVersion: res.newVersion,
    };
  }

  /**
   * Reject a pricing recommendation. Preserves audit history.
   */
  async rejectPricingRecommendation(
    input: RejectPricingRecommendationInput
  ): Promise<ApplyRejectRecommendationResult> {
    const res = await request<{
      success: boolean;
      recommendationId: string;
      status: string;
    }>({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      method: "POST",
      path: PATHS.pricingRecommendationReject(input.recommendationId),
      body: {},
    });
    return {
      success: res.success,
      recommendationId: res.recommendationId,
      status: "rejected",
    };
  }
}
