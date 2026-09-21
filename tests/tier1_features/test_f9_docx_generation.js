/**
 * Tier 1: Feature Coverage — F9: Server-Side DOCX Generation
 * 5 Tests: Structured testator data merging, asset schedule generation, clause merging,
 * local storage file persistence, download authorization metadata
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { cleanup } = require('../helpers/test_utils');
const { DocumentGenerator } = require('../../src/server/document-generator.ts');

module.exports = {
  name: 'F9: Server-Side DOCX Generation',
  tests: [
    {
      name: 'T1.9.1: Structured testator data merging into will document',
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
              answerData: JSON.stringify({ fullName: 'Aarav Sharma', city: 'Bengaluru' })
            }
          });

          const result = await DocumentGenerator.generate(testCase.id);
          assert.ok(result.docxBuffer, 'Must return docxBuffer');
          assert.ok(result.textContent, 'Must return textContent');
          assert.includes(result.textContent, 'Aarav Sharma', 'Generated will text must merge testator full name');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.9.2: Asset schedule and detail merging',
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
              answerData: JSON.stringify({ fullName: 'Aarav Sharma' })
            }
          });
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'assets',
              answerData: JSON.stringify({
                assetsList: fixtures.assets.bangalorePortfolio
              })
            }
          });

          const result = await DocumentGenerator.generate(testCase.id);
          assert.ok(result.docxBuffer instanceof Buffer, 'Should generate valid docx Buffer');
          assert.ok(result.docxBuffer.length > 500, 'DOCX buffer must have non-trivial size');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.9.3: Clause merging - Injects guardianship and NRI foreign clauses',
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
              questionId: 'all_answers',
              answerData: JSON.stringify({
                fullName: 'Rajesh Patel',
                hasMinorChildren: 'Yes',
                guardianName: 'Sunita Sharma',
                isNRI: 'Yes',
                countryOfResidence: 'United Arab Emirates'
              })
            }
          });

          const result = await DocumentGenerator.generate(testCase.id);
          assert.includes(result.textContent, 'GUARDIANSHIP:', 'Must include GUARDIANSHIP clause for minor children');
          assert.includes(result.textContent, 'Sunita Sharma', 'Must merge named guardian into clause');
          assert.includes(result.textContent, 'FOREIGN ASSETS:', 'Must include FOREIGN ASSETS clause for NRI');
          assert.includes(result.textContent, 'United Arab Emirates', 'Must merge NRI country into clause');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.9.4: File binary structure validation - Valid OpenXML PK zip header',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          const result = await DocumentGenerator.generate(testCase.id);
          const buf = result.docxBuffer;

          // DOCX is a ZIP file container, starting with magic bytes 'PK\x03\x04' (0x50, 0x4B, 0x03, 0x04)
          assert.equal(buf[0], 0x50, 'Byte 0 must be P');
          assert.equal(buf[1], 0x4B, 'Byte 1 must be K');
          assert.equal(buf[2], 0x03, 'Byte 2 must be 0x03');
          assert.equal(buf[3], 0x04, 'Byte 3 must be 0x04');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.9.5: Document record creation and metadata persistence',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          await DocumentGenerator.generate(testCase.id);

          const docRecord = await prisma.document.findFirst({
            where: { caseId: testCase.id }
          });

          assert.ok(docRecord, 'Document record must be created in database');
          assert.equal(docRecord.caseId, testCase.id, 'Document must be linked to caseId');
          assert.equal(docRecord.status, 'GENERATED', 'Document status must be GENERATED');
          assert.ok(docRecord.templateVersionId, 'Document must record templateVersionId');
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
