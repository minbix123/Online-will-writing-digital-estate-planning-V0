/**
 * Test Utilities and Evaluation Helpers
 * Provides shared functions for authorization checks, conditional evaluation,
 * and test lifecycle management.
 */

const { getPrisma } = require('./db');

const TestUtils = {
  /**
   * Evaluates conditional branching logic based on question/section conditions
   */
  evaluateCondition(condition, answers) {
    if (!condition || !condition.field) return true;
    const actualVal = answers[condition.field];
    const expectedVal = condition.value;

    switch (condition.operator) {
      case 'equals':
        return actualVal === expectedVal;
      case 'not_equals':
        return actualVal !== expectedVal;
      case 'includes':
        return Array.isArray(actualVal) && actualVal.includes(expectedVal);
      default:
        return actualVal === expectedVal;
    }
  },

  /**
   * Evaluates an array of conditions (AND logic)
   */
  evaluateConditions(conditions, answers) {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every(c => TestUtils.evaluateCondition(c, answers));
  },

  /**
   * Evaluates questionnaire completion progress
   */
  calculateProgress(sections, answers) {
    if (!sections || sections.length === 0) return 0;
    let totalQuestions = 0;
    let answeredQuestions = 0;

    for (const sec of sections) {
      // If section has conditions and they aren't met, skip
      if (sec.conditions && !TestUtils.evaluateConditions(sec.conditions, answers)) {
        continue;
      }

      for (const q of sec.questions || []) {
        // If question has conditions and they aren't met, skip
        if (q.conditions && !TestUtils.evaluateConditions(q.conditions, answers)) {
          continue;
        }

        if (q.required) {
          totalQuestions++;
          const val = answers[q.id];
          if (val !== undefined && val !== null && val !== '') {
            if (Array.isArray(val) ? val.length > 0 : true) {
              answeredQuestions++;
            }
          }
        }
      }
    }

    return totalQuestions === 0 ? 100 : Math.round((answeredQuestions / totalQuestions) * 100);
  },

  /**
   * RBAC Case Access Policy Evaluator
   * Matches PROJECT.md § Case Lifecycle Contract and src/app/api/document/download/route.ts
   */
  canAccessCase(user, caseData) {
    if (!user || !caseData) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'LAWYER') {
      return caseData.lawyerId === user.id || caseData.lawyerId === null || caseData.status === 'IN_REVIEW';
    }
    if (user.role === 'CUSTOMER') {
      return caseData.customerId === user.id;
    }
    return false;
  },

  /**
   * Cleanup utility for test artifacts
   */
  async cleanup(opts = {}) {
    const prisma = getPrisma();
    if (opts.caseIds && opts.caseIds.length > 0) {
      await prisma.$transaction([
        prisma.auditLog.deleteMany({ where: { caseId: { in: opts.caseIds } } }),
        prisma.document.deleteMany({ where: { caseId: { in: opts.caseIds } } }),
        prisma.payment.deleteMany({ where: { caseId: { in: opts.caseIds } } }),
        prisma.lawyerReview.deleteMany({ where: { caseId: { in: opts.caseIds } } }),
        prisma.questionnaireAnswer.deleteMany({ where: { caseId: { in: opts.caseIds } } }),
        prisma.case.deleteMany({ where: { id: { in: opts.caseIds } } })
      ]);
    }
    if (opts.userIds && opts.userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: opts.userIds } } });
    }
  }
};

module.exports = TestUtils;
