/**
 * Tier 2: Boundary & Corner Cases — F10: Mock Payment & Transactions
 * 5 Tests:
 * - T2.10.1: Unknown payment plan tier resolution and rejection
 * - T2.10.2: Negative or zero payment amount validation
 * - T2.10.3: Re-paying an already PAID case idempotency check
 * - T2.10.4: Payment creation for non-existent case ID rejected by foreign key constraint
 * - T2.10.5: Transaction rollback integrity on checkout failure
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { cleanup } = require('../helpers/test_utils');

module.exports = {
  name: 'F10: Mock Payment Boundaries',
  tests: [
    {
      name: 'T2.10.1: Unknown payment tier rejected or unmapped to standard pricing',
      async fn() {
        const validTiers = {
          BASIC: 999,
          LAWYER_REVIEW: 2999,
          COMPLEX_NRI: 4999
        };

        const resolvePlanAmount = (plan) => {
          if (!plan || !validTiers[plan]) return null;
          return validTiers[plan];
        };

        assert.equal(resolvePlanAmount('BASIC'), 999);
        assert.equal(resolvePlanAmount('LAWYER_REVIEW'), 2999);
        assert.equal(resolvePlanAmount('COMPLEX_NRI'), 4999);

        // Unknown tiers
        assert.equal(resolvePlanAmount('FREE_TIER'), null, 'Unknown FREE_TIER must not resolve to valid amount');
        assert.equal(resolvePlanAmount('VIP_UNLIMITED'), null, 'Unknown VIP_UNLIMITED must not resolve');
        assert.equal(resolvePlanAmount(''), null, 'Empty string plan must not resolve');
        assert.equal(resolvePlanAmount(null), null, 'Null plan must not resolve');
      }
    },

    {
      name: 'T2.10.2: Negative or zero payment amount validation prevents invalid charges',
      async fn() {
        const validatePaymentAmount = (amt) => {
          if (typeof amt !== 'number' || isNaN(amt) || !isFinite(amt)) return false;
          return amt > 0;
        };

        assert.equal(validatePaymentAmount(999), true, '999 INR is valid');
        assert.equal(validatePaymentAmount(0), false, '0 INR payment must be rejected');
        assert.equal(validatePaymentAmount(-999), false, 'Negative payment amount must be rejected');
        assert.equal(validatePaymentAmount(-0.01), false, 'Negative fraction must be rejected');
        assert.equal(validatePaymentAmount(NaN), false, 'NaN amount must be rejected');
      }
    },

    {
      name: 'T2.10.3: Re-paying an already PAID case detects existing payment status',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        const initialPayment = await prisma.payment.create({
          data: {
            caseId: testCase.id,
            amount: 999,
            currency: 'INR',
            status: 'SUCCESS',
            mode: 'MOCK'
          }
        });

        try {
          // Check whether case already has successful payment
          const isCaseAlreadyPaid = async (caseId) => {
            const c = await prisma.case.findUnique({ where: { id: caseId } });
            if (c.status === 'PAID') return true;
            const existingSuccess = await prisma.payment.findFirst({
              where: { caseId, status: 'SUCCESS' }
            });
            return existingSuccess !== null;
          };

          const alreadyPaid = await isCaseAlreadyPaid(testCase.id);
          assert.equal(alreadyPaid, true, 'Case must be detected as already having completed payment');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T2.10.4: Payment creation for non-existent case ID rejected by foreign key constraint',
      async fn() {
        const prisma = getPrisma();
        const fakeCaseId = 'non-existent-case-id-12345';

        await assert.rejects(
          async () => {
            await prisma.payment.create({
              data: {
                caseId: fakeCaseId,
                amount: 999,
                status: 'SUCCESS',
                mode: 'MOCK'
              }
            });
          },
          /foreign key/i,
          'Payment for non-existent case must fail with foreign key constraint violation'
        );
      }
    },

    {
      name: 'T2.10.5: Transaction rollback integrity on checkout failure',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          // Attempt a transaction where the second operation deliberately fails
          let txFailed = false;
          try {
            await prisma.$transaction([
              prisma.payment.create({
                data: {
                  caseId: testCase.id,
                  amount: 999,
                  status: 'SUCCESS',
                  mode: 'MOCK'
                }
              }),
              // Deliberate failure: updating non-existent case ID
              prisma.case.update({
                where: { id: 'non-existent-case-id-xyz' },
                data: { status: 'PAID' }
              })
            ]);
          } catch (err) {
            txFailed = true;
          }

          assert.equal(txFailed, true, 'Transaction must fail and reject');

          // Verify atomic rollback: no orphan payment should exist for testCase
          const orphanPayments = await prisma.payment.findMany({
            where: { caseId: testCase.id }
          });
          assert.equal(orphanPayments.length, 0, 'No payment record should persist after transaction rollback');

          // Verify case status remained unchanged
          const unchangedCase = await prisma.case.findUnique({ where: { id: testCase.id } });
          assert.equal(unchangedCase.status, 'DRAFT', 'Case status must remain DRAFT after rolled-back checkout');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
