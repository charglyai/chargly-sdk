/** Chargly client configuration */
export interface CharglyConfig {
  /** Your Chargly secret API key */
  apiKey: string;
  /** Base URL for the Chargly API (default: https://api.chargly.ai) */
  baseUrl?: string;
}

/** Input for getWallet */
export interface GetWalletInput {
  customerId: string;
}

/** Response from getWallet */
export interface GetWalletResponse {
  customerId: string;
  walletId: string;
  balance: number;
  unit: string;
}

/** Input for meterEvent */
export interface MeterEventInput {
  customerId: string;
  event: string;
  credits: number;
  metadata?: Record<string, unknown>;
}

/** Response from meterEvent */
export interface MeterEventResponse {
  success: boolean;
  eventId: string;
  deductedCredits: number;
  remainingBalance: number;
}

/** Input for createCheckout */
export interface CreateCheckoutInput {
  customerId: string;
  creditPackId: string;
  successUrl?: string;
  cancelUrl?: string;
}

/** Response from createCheckout */
export interface CreateCheckoutResponse {
  checkoutId: string;
  checkoutUrl: string;
  credits: number;
}

/** Credit pack item from listCreditPacks */
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
}

/** Response from listCreditPacks */
export interface ListCreditPacksResponse {
  packs: CreditPack[];
}

/** API error shape from Chargly API */
export interface CharglyApiError {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

// --- Pricing Advisor ---

/** Confidence level for a pricing recommendation */
export type RecommendationConfidence = "high" | "medium" | "low";

/** Input for getPricingRule */
export interface GetPricingRuleInput {
  feature: string;
}

/** Pricing rule from the API */
export interface PricingRule {
  id: string;
  feature: string;
  multiplier: number;
  minimumCredits: number;
  enabled: boolean;
  version?: number;
}

/** Input for listPricingRecommendations */
export interface ListPricingRecommendationsInput {
  feature?: string;
  status?: "pending" | "accepted" | "rejected" | "applied" | "expired";
  limit?: number;
}

/** Pricing recommendation from the API */
export interface PricingRecommendation {
  id: string;
  feature: string;
  currentCredits: number;
  recommendedCredits: number;
  reason: string;
  confidence: RecommendationConfidence;
  estimatedLift?: string;
  versionFrom?: number;
  versionTo?: number;
  status?: string;
  createdAt?: string;
}

/** Response from listPricingRecommendations */
export interface ListPricingRecommendationsResponse {
  recommendations: PricingRecommendation[];
}

/** Input for getPricingRecommendation */
export interface GetPricingRecommendationInput {
  recommendationId: string;
}

/** Input for explainPricingRecommendation */
export interface ExplainPricingRecommendationInput {
  recommendationId: string;
}

/** Explanation detail for a recommendation */
export interface PricingRecommendationExplanation {
  recommendationId: string;
  reason: string;
  confidence: RecommendationConfidence;
  targetMarginPercent?: number;
  estimatedMarginPercent?: number;
  providerCostContext?: string;
  versionTransition?: { from: number; to: number };
}

/** Input for applyPricingRecommendation */
export interface ApplyPricingRecommendationInput {
  recommendationId: string;
}

/** Input for rejectPricingRecommendation */
export interface RejectPricingRecommendationInput {
  recommendationId: string;
}

/** Result from apply or reject */
export interface ApplyRejectRecommendationResult {
  success: boolean;
  recommendationId: string;
  status: "applied" | "rejected";
  newVersion?: number;
}
