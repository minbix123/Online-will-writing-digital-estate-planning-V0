export interface PaymentTier {
  id: "BASIC" | "LAWYER_REVIEW" | "COMPLEX_NRI";
  name: string;
  price: number;
  currency: string;
  description: string;
  recommended?: boolean;
  features: string[];
}

export const PAYMENT_TIERS: Record<string, PaymentTier> = {
  BASIC: {
    id: "BASIC",
    name: "Basic Will",
    price: 1499,
    currency: "INR",
    description: "Ideal for straightforward estate plans without business assets or complex trusts.",
    features: [
      "Guided question-by-question builder",
      "Automated deterministic workflow analysis",
      "Instant DOCX document compilation",
      "Indian Succession Act signing checklist",
      "Secure encrypted storage"
    ],
  },
  LAWYER_REVIEW: {
    id: "LAWYER_REVIEW",
    name: "Will + Lawyer Review",
    price: 3999,
    currency: "INR",
    recommended: true,
    description: "Recommended for most families. Every clause is reviewed and approved by an Indian advocate.",
    features: [
      "Everything included in Basic Will",
      "Dedicated High Court / City Civil advocate review",
      "Direct legal clarification requests & notes",
      "Formal legal review approval",
      "Re-issuance upon minor life changes"
    ],
  },
  COMPLEX_NRI: {
    id: "COMPLEX_NRI",
    name: "Complex / NRI Will",
    price: 7999,
    currency: "INR",
    description: "For cross-border estate planning, foreign assets, business shareholding, or blended families.",
    features: [
      "Cross-border NRI movable/immovable assets",
      "Foreign assets jurisdictional declaration",
      "Business ownership & partnership succession",
      "Senior counsel review & redlining",
      "Digital assets & multi-executor directives"
    ],
  },
};

/**
 * Resolves plan string or number to official price in INR.
 * Accepts tier names or legacy numbers, defaulting to Basic tier.
 */
export function resolvePlanAmount(planOrTier?: string | number): number {
  if (typeof planOrTier === "number") return planOrTier;
  const normalized = (planOrTier || "").toUpperCase();
  if (normalized === "BASIC" || normalized === "999") return 1499;
  if (normalized === "LAWYER_REVIEW" || normalized === "2999") return 3999;
  if (normalized === "COMPLEX_NRI" || normalized === "COMPLEX" || normalized === "NRI" || normalized === "4999") return 7999;
  return 1499;
}

/**
 * Resolves tier key from plan string or price amount.
 */
export function resolveTierKey(planOrAmount?: string | number): "BASIC" | "LAWYER_REVIEW" | "COMPLEX_NRI" {
  if (typeof planOrAmount === "number") {
    if (planOrAmount >= 7000 || planOrAmount === 4999) return "COMPLEX_NRI";
    if (planOrAmount >= 2500) return "LAWYER_REVIEW";
    return "BASIC";
  }
  const normalized = (planOrAmount || "").toUpperCase();
  if (normalized.includes("COMPLEX") || normalized.includes("NRI") || normalized === "4999" || normalized === "7999") {
    return "COMPLEX_NRI";
  }
  if (normalized.includes("LAWYER") || normalized.includes("REVIEW") || normalized === "2999" || normalized === "3999") {
    return "LAWYER_REVIEW";
  }
  return "BASIC";
}
