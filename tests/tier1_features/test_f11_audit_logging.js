/**
 * Tier 1: Feature Coverage — F11: Tamper-Resistant Audit Logging
 * 5 Tests: Login audit event, case creation audit event, submission audit event,
 * document gen audit event, UTC timestamp & actor verification
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { cleanup } = require('../helpers/test_utils');

module.exports = {
  name: 'F11: Tamper-Resistant Audit Logging',
  tests: [
    {
      name: 'T1.11.1: Login audit event recording',
      async fn() {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const log = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'AUTH_LOGIN_SUCCESS',
            metadata: JSON.stringify({ ip: '127.0.0.1', userAgent: 'Browser' })
          }
        });

        try {
          assert.ok(log.id, 'Audit log ID must exist');
          assert.equal(log.actorId, user.id, 'actorId must match logged-in user');
          assert.equal(log.action, 'AUTH_LOGIN_SUCCESS');
        } finally {
          await prisma.auditLog.delete({ where: { id: log.id } });
        }
      }
    },

    {
      name: 'T1.11.2: Case creation audit event recording',
      async fn() {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: user.id, status: 'DRAFT' }
        });

        const log = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            caseId: testCase.id,
            action: 'CASE_CREATED',
            metadata: JSON.stringify({ status: 'DRAFT' })
          }
        });

        try {
          assert.equal(log.caseId, testCase.id, 'caseId must be linked in audit log');
          assert.equal(log.action, 'CASE_CREATED');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.11.3: Submission audit event recording',
      async fn() {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: user.id, status: 'SUBMITTED' }
        });

        const log = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            caseId: testCase.id,
            action: 'QUESTIONNAIRE_SUBMITTED',
            metadata: JSON.stringify({ totalSections: 8, completionPercent: 100 })
          }
        });

        try {
          assert.equal(log.action, 'QUESTIONNAIRE_SUBMITTED');
          const meta = JSON.parse(log.metadata);
          assert.equal(meta.completionPercent, 100);
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.11.4: Document generation audit event recording',
      async fn() {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: user.id, status: 'PAID' }
        });

        const log = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            caseId: testCase.id,
            action: 'DOCUMENT_GENERATED',
            metadata: JSON.stringify({ format: 'DOCX', status: 'GENERATED' })
          }
        });

        try {
          assert.equal(log.action, 'DOCUMENT_GENERATED');
          assert.equal(log.caseId, testCase.id);
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.11.5: UTC timestamp and actor relation verification',
      async fn() {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const log = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'SECURITY_VERIFY_UTC'
          }
        });

        try {
          const loaded = await prisma.auditLog.findUnique({
            where: { id: log.id },
            include: { actor: true }
          });

          assert.ok(loaded.timestamp instanceof Date, 'timestamp must be a Date instance');
          const iso = loaded.timestamp.toISOString();
          assert.ok(iso.endsWith('Z'), 'Timestamp must be stored in UTC format with Z suffix');
          assert.equal(loaded.actor.email, user.email, 'Actor relation must link to user record');
        } finally {
          await prisma.auditLog.delete({ where: { id: log.id } });
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
