/**
 * Tier 1: Feature Coverage — F3: Customer Case Lifecycle
 * 5 Tests: Case creation, Initial DRAFT status, Case submission to SUBMITTED,
 * Transition to IN_REVIEW/APPROVED, Dashboard summary retrieval
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { cleanup } = require('../helpers/test_utils');

module.exports = {
  name: 'F3: Customer Case Lifecycle',
  tests: [
    {
      name: 'T1.3.1: Case creation - Successfully initializes new case with customer relation',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const newCase = await prisma.case.create({
          data: {
            customerId: customer.id,
            flags: 'STANDARD'
          }
        });

        try {
          assert.ok(newCase.id, 'Case must be generated with valid ID');
          assert.equal(newCase.customerId, customer.id, 'Case must be linked to customer ID');
          assert.ok(newCase.createdAt instanceof Date, 'Case must record valid createdAt timestamp');
          assert.ok(newCase.updatedAt instanceof Date, 'Case must record valid updatedAt timestamp');
        } finally {
          await cleanup({ caseIds: [newCase.id] });
        }
      }
    },

    {
      name: 'T1.3.2: Initial status verification - Default case status is DRAFT',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const freshCase = await prisma.case.create({
          data: {
            customerId: customer.id
          }
        });

        try {
          assert.equal(freshCase.status, 'DRAFT', 'Default status for freshly created case must be DRAFT');
        } finally {
          await cleanup({ caseIds: [freshCase.id] });
        }
      }
    },

    {
      name: 'T1.3.3: Case submission - Transitions status from DRAFT to SUBMITTED',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const caseItem = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const submittedCase = await prisma.case.update({
            where: { id: caseItem.id },
            data: { status: 'SUBMITTED' }
          });

          assert.equal(submittedCase.status, 'SUBMITTED', 'Case status must be updated to SUBMITTED');
        } finally {
          await cleanup({ caseIds: [caseItem.id] });
        }
      }
    },

    {
      name: 'T1.3.4: Transition to IN_REVIEW and APPROVED',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const lawyer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.lawyer.email } });

        const caseItem = await prisma.case.create({
          data: { customerId: customer.id, status: 'SUBMITTED' }
        });

        try {
          // Transition 1: Submitted -> IN_REVIEW
          const reviewCase = await prisma.case.update({
            where: { id: caseItem.id },
            data: { status: 'IN_REVIEW', lawyerId: lawyer.id }
          });
          assert.equal(reviewCase.status, 'IN_REVIEW', 'Case status must transition to IN_REVIEW');
          assert.equal(reviewCase.lawyerId, lawyer.id, 'Lawyer must be assigned for review');

          // Transition 2: IN_REVIEW -> APPROVED
          const approvedCase = await prisma.case.update({
            where: { id: caseItem.id },
            data: { status: 'APPROVED' }
          });
          assert.equal(approvedCase.status, 'APPROVED', 'Case status must transition to APPROVED after review');
        } finally {
          await cleanup({ caseIds: [caseItem.id] });
        }
      }
    },

    {
      name: 'T1.3.5: Dashboard summary retrieval - Returns active customer cases',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const case1 = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT', flags: 'STANDARD' }
        });
        const case2 = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID', flags: 'STANDARD' }
        });

        try {
          const userCases = await prisma.case.findMany({
            where: { customerId: customer.id },
            orderBy: { createdAt: 'desc' },
            include: { customer: true }
          });

          assert.ok(userCases.length >= 2, 'Customer dashboard must retrieve all cases for the logged-in customer');
          const found1 = userCases.find(c => c.id === case1.id);
          const found2 = userCases.find(c => c.id === case2.id);

          assert.ok(found1, 'Case 1 must be present in dashboard query');
          assert.ok(found2, 'Case 2 must be present in dashboard query');
          assert.equal(found1.customer.email, customer.email, 'Linked customer relation must be included');
        } finally {
          await cleanup({ caseIds: [case1.id, case2.id] });
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
