export interface EvaluationResult {
  flags: string[];
  requiresLawyerReview: boolean;
  recommendedClauses: string[];
}

export class LegalWorkflowEngine {
  static async evaluate(answers: any): Promise<EvaluationResult> {
    const safeAnswers = answers && typeof answers === "object" ? answers : {};
    const flags: Set<string> = new Set();
    flags.add("STANDARD");

    // Marital Status
    if (safeAnswers.maritalStatus === "Other") {
      flags.add("LEGAL_REVIEW_REQUIRED");
      flags.add("MANUAL_CONSULTATION_REQUIRED");
    }

    // Minor Children
    if (safeAnswers.hasMinorChildren === "Yes") {
      flags.add("GUARDIAN_REQUIRED");
    }

    // NRI
    if (safeAnswers.isNRI === "Yes") {
      flags.add("NRI");
      flags.add("FOREIGN_ASSETS");
      flags.add("LEGAL_REVIEW_REQUIRED");
    }

    // Check assets for Business Interest
    let hasBusiness = safeAnswers.hasBusinessInterests === "Yes";
    if (safeAnswers.assetsList && Array.isArray(safeAnswers.assetsList)) {
      for (const asset of safeAnswers.assetsList) {
        if (asset && asset.type === "BusinessInterests") {
          flags.add("BUSINESS_INTEREST");
          flags.add("LEGAL_REVIEW_REQUIRED");
          hasBusiness = true;
        }
      }
    }
    if (safeAnswers.hasBusinessInterests === "Yes") {
      flags.add("BUSINESS_INTEREST");
      flags.add("LEGAL_REVIEW_REQUIRED");
    }

    // Existing Will
    if (safeAnswers.hasExistingWill === "Yes" || safeAnswers.hasExistingWill === "Not sure") {
      flags.add("EXISTING_WILL");
      flags.add("LEGAL_REVIEW_REQUIRED");
    }

    const requiresLawyerReview = flags.has("LEGAL_REVIEW_REQUIRED") || flags.has("MANUAL_CONSULTATION_REQUIRED");

    // Deterministic recommended clauses
    const recommendedClauses: string[] = ["STANDARD_DECLARATION", "EXECUTORS"];
    if (safeAnswers.hasMinorChildren === "Yes") {
      recommendedClauses.push("GUARDIAN");
    }
    if (safeAnswers.isNRI === "Yes") {
      recommendedClauses.push("NRI_ASSETS");
    }
    if (hasBusiness || flags.has("BUSINESS_INTEREST")) {
      recommendedClauses.push("BUSINESS_SUCCESSION");
    }

    return {
      flags: Array.from(flags),
      requiresLawyerReview,
      recommendedClauses
    };
  }
}

