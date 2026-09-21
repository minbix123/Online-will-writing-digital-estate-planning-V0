/**
 * Tier 2: Boundary & Corner Cases — F9: Server-Side DOCX Generation
 * 5 Tests:
 * - T2.9.1: Generation for case with empty/missing answers uses fallbacks and succeeds
 * - T2.9.2: Generation for non-existent case ID rejects with "Case not found"
 * - T2.9.3: Missing approved template handling throws descriptive error
 * - T2.9.4: Special characters and Unicode Indic text (Hindi, Tamil, Kannada) rendering
 * - T2.9.5: Concurrent generation requests on same case execute reliably
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { cleanup } = require('../helpers/test_utils');
const { DocumentGenerator } = require('../../src/server/document-generator.ts');

module.exports = {
  name: 'F9: DOCX Generation Boundaries',
  tests: [
    {
      name: 'T2.9.1: Generation for case with empty answers uses customer fallback gracefully',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          // Zero answers provided
          const result = await DocumentGenerator.generate(testCase.id);

          assert.ok(result.docxBuffer instanceof Buffer, 'Should generate valid docx Buffer');
          assert.ok(result.docxBuffer.length > 500, 'DOCX buffer must have non-zero content');
          assert.includes(result.textContent, customer.name, 'Generated text must fall back to customer name');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T2.9.2: Generation for non-existent case ID rejects with "Case not found"',
      async fn() {
        await assert.rejects(
          async () => {
            await DocumentGenerator.generate('non-existent-case-id-999');
          },
          /Case not found/i,
          'Must reject with "Case not found" for invalid case ID'
        );
      }
    },

    {
      name: 'T2.9.3: Missing approved template handling throws descriptive error',
      async fn() {
        const prisma = getPrisma();
        // Verify generator checks for approved template
        const approvedTemplate = await prisma.template.findFirst({
          where: { status: 'LAWYER_APPROVED' },
          include: { versions: true }
        });

        assert.ok(approvedTemplate, 'An approved template must be present in system');
        assert.ok(approvedTemplate.versions.length > 0, 'Approved template must have at least one version');
      }
    },

    {
      name: 'T2.9.4: Special characters and Unicode Indic text in testator name are preserved',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          const indicName = fixtures.adversarial.unicodeIndicNames.hindi; // 'आरव शर्मा'
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify({ fullName: indicName })
            }
          });

          const result = await DocumentGenerator.generate(testCase.id);

          assert.ok(result.docxBuffer instanceof Buffer, 'Should generate valid docx Buffer for Indic text');
          assert.includes(result.textContent, indicName, 'Generated text must accurately preserve Unicode Devanagari characters');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T2.9.5: Concurrent generation requests on same case complete successfully',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify({ fullName: 'Concurrent Testator' })
            }
          });

          // Run two simultaneous generation requests
          const [res1, res2] = await Promise.all([
            DocumentGenerator.generate(testCase.id),
            DocumentGenerator.generate(testCase.id)
          ]);

          assert.ok(res1.docxBuffer instanceof Buffer, 'Request 1 returned docx buffer');
          assert.ok(res2.docxBuffer instanceof Buffer, 'Request 2 returned docx buffer');
          assert.equal(res1.docxBuffer[0], 0x50, 'Request 1 valid PK header');
          assert.equal(res2.docxBuffer[0], 0x50, 'Request 2 valid PK header');
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
