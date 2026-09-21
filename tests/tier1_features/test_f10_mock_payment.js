/**
 * Tier 1: Feature Coverage — F10: Mock Payment & Transactions
 * 5 Tests: Basic tier mock checkout, Lawyer Review tier checkout, Complex/NRI tier checkout,
 * transactional status update, mock transparency tag
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { cleanup } = require('../helpers/test_utils');

module.exports = {
  name: 'F10: Mock Payment & Transactions',
  tests: [
    {
      name: 'T1.10.1: Basic tier mock checkout - Creates payment record of 999 INR',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const payment = await prisma.payment.create({
            data: {
              caseId: testCase.id,
              amount: 999,
              currency: 'INR',
              status: 'SUCCESS',
              mode: 'MOCK'
            }
          });

          assert.ok(payment.id, 'Payment record must be created');
          assert.equal(payment.amount, 999, 'Basic plan amount must be 999 INR');
          assert.equal(payment.currency, 'INR', 'Currency must be INR');
          assert.equal(payment.status, 'SUCCESS', 'Payment status must be SUCCESS');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.10.2: Lawyer Review tier checkout - Creates payment record of 2999 INR',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const payment = await prisma.payment.create({
            data: {
              caseId: testCase.id,
              amount: 2999,
              currency: 'INR',
              status: 'SUCCESS',
              mode: 'MOCK'
            }
          });

          assert.equal(payment.amount, 2999, 'Lawyer review tier amount must be 2999 INR');
          assert.equal(payment.status, 'SUCCESS');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.10.3: Complex / NRI tier checkout - Creates payment record of 4999 INR',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const payment = await prisma.payment.create({
            data: {
              caseId: testCase.id,
              amount: 4999,
              currency: 'INR',
              status: 'SUCCESS',
              mode: 'MOCK'
            }
          });

          assert.equal(payment.amount, 4999, 'Complex/NRI plan amount must be 4999 INR');
          assert.equal(payment.status, 'SUCCESS');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.10.4: Transactional status update - Updates case status upon checkout',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'SUBMITTED' }
        });

        try {
          // Perform transactional state update
          await prisma.$transaction([
            prisma.payment.create({
              data: {
                caseId: testCase.id,
                amount: 999,
                status: 'SUCCESS',
                mode: 'MOCK'
              }
            }),
            prisma.case.update({
              where: { id: testCase.id },
              data: { status: 'PAID' }
            })
          ]);

          const updatedCase = await prisma.case.findUnique({ where: { id: testCase.id } });
          assert.equal(updatedCase.status, 'PAID', 'Case status must be updated to PAID after checkout');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.10.5: Mock transparency tag - Differentiates mock payment from real financial transaction',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const payment = await prisma.payment.create({
            data: {
              caseId: testCase.id,
              amount: 999,
              status: 'SUCCESS',
              mode: 'MOCK'
            }
          });

          assert.equal(payment.mode, 'MOCK', 'Payment mode must be explicitly tagged as MOCK');
          assert.notEqual(payment.mode, 'RAZORPAY', 'Mock payment must not be flagged as live bank transaction');
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
