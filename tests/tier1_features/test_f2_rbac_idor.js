/**
 * Tier 1: Feature Coverage — F2: RBAC & Security Isolation (IDOR)
 * 5 Tests: Customer isolation, Lawyer authorized access, Admin oversight, IDOR rejection on case access, IDOR rejection on document access
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { canAccessCase, cleanup } = require('../helpers/test_utils');

module.exports = {
  name: 'F2: RBAC & Security Isolation (IDOR)',
  tests: [
    {
      name: 'T1.2.1: Customer isolation - Customer can only access their own case',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const nriCustomer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.nriCustomer.email } });

        // Fetch or create case owned by customer A
        let custCase = await prisma.case.findFirst({ where: { customerId: customer.id } });
        if (!custCase) {
          custCase = await prisma.case.create({
            data: { customerId: customer.id, status: 'DRAFT', flags: 'STANDARD' }
          });
        }

        // Customer A can access their own case
        assert.equal(canAccessCase(customer, custCase), true, 'Customer A must be permitted to access their own case');

        // Customer B cannot access Customer A's case
        assert.equal(canAccessCase(nriCustomer, custCase), false, 'Customer B must NOT be permitted to access Customer A case');
      }
    },

    {
      name: 'T1.2.2: Lawyer authorized access - Lawyer can access assigned/in-review cases',
      async fn() {
        const prisma = getPrisma();
        const lawyer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.lawyer.email } });
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        // Case assigned to this lawyer
        const assignedCase = await prisma.case.create({
          data: {
            customerId: customer.id,
            lawyerId: lawyer.id,
            status: 'IN_REVIEW',
            flags: 'LEGAL_REVIEW_REQUIRED'
          }
        });

        try {
          const authorized = canAccessCase(lawyer, assignedCase);
          assert.equal(authorized, true, 'Lawyer must have access to case assigned to them');
        } finally {
          await cleanup({ caseIds: [assignedCase.id] });
        }
      }
    },

    {
      name: 'T1.2.3: Admin oversight - Admin role possesses system-wide access',
      async fn() {
        const prisma = getPrisma();
        const admin = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.admin.email } });
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: {
            customerId: customer.id,
            status: 'SUBMITTED',
            flags: 'STANDARD'
          }
        });

        try {
          const authorized = canAccessCase(admin, testCase);
          assert.equal(authorized, true, 'Admin must possess system-wide case access for audit and oversight');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.2.4: IDOR rejection on case access - Forged customerId is blocked',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const nriCustomer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.nriCustomer.email } });

        // Victim case owned by Customer A
        const victimCase = await prisma.case.create({
          data: {
            customerId: customer.id,
            status: 'DRAFT',
            flags: 'STANDARD'
          }
        });

        try {
          // Attacker (nriCustomer) attempts to read/modify victim case
          const isAllowed = canAccessCase(nriCustomer, victimCase);
          assert.equal(isAllowed, false, 'IDOR Attempt: Attacker accessing foreign case must be rejected');
        } finally {
          await cleanup({ caseIds: [victimCase.id] });
        }
      }
    },

    {
      name: 'T1.2.5: IDOR rejection on document access - Unauthorized customer cannot access document',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const nriCustomer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.nriCustomer.email } });
        const approvedTemplate = await prisma.template.findFirst({
          where: { status: 'LAWYER_APPROVED' },
          include: { versions: true }
        });

        const victimCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID', flags: 'STANDARD' }
        });

        const victimDoc = await prisma.document.create({
          data: {
            caseId: victimCase.id,
            templateVersionId: approvedTemplate.versions[0].id,
            status: 'GENERATED',
            clauseVersions: 'v1.0',
            ruleVersions: 'v1.0'
          }
        });

        try {
          // Check access policy matching download route logic:
          // if (!caseData || (caseData.customerId !== user.id && user.role !== "LAWYER" && user.role !== "ADMIN"))
          const caseForDoc = await prisma.case.findUnique({ where: { id: victimDoc.caseId } });
          const userHasAccess = canAccessCase(nriCustomer, caseForDoc);

          assert.equal(userHasAccess, false, 'Unauthorized customer cannot access or download another user document');
        } finally {
          await cleanup({ caseIds: [victimCase.id] });
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
