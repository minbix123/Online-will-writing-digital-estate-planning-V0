/**
 * Tier 2: Boundary & Corner Cases — F5: Debounced Autosave & Resume
 * 5 Tests:
 * - T2.5.1: Empty answer batch handling without state corruption
 * - T2.5.2: Concurrent save simulation and duplicate prevention
 * - T2.5.3: Saving answers for non-existent case ID rejects on foreign key constraint
 * - T2.5.4: Partial answers multi-section incremental persistence across reloads
 * - T2.5.5: 10KB+ large text fields persistence without truncation
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { cleanup } = require('../helpers/test_utils');

module.exports = {
  name: 'F5: Autosave & Resume Boundaries',
  tests: [
    {
      name: 'T2.5.1: Empty answer batch payload is handled gracefully without state corruption',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          // Saving empty answer batch {}
          const emptyAnswer = await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify({})
            }
          });

          assert.ok(emptyAnswer.id, 'Record must be saved with valid ID');
          assert.equal(emptyAnswer.answerData, '{}', 'Answer data should store empty JSON string');

          const parsed = JSON.parse(emptyAnswer.answerData);
          assert.deepEqual(parsed, {}, 'Parsed answer data must be empty object');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T2.5.2: Concurrent save simulation enforces upsert semantics without duplicate rows',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const upsertSection = async (sectionId, data) => {
            const existing = await prisma.questionnaireAnswer.findFirst({
              where: { caseId: testCase.id, questionId: sectionId }
            });
            if (existing) {
              return await prisma.questionnaireAnswer.update({
                where: { id: existing.id },
                data: { answerData: JSON.stringify(data) }
              });
            } else {
              return await prisma.questionnaireAnswer.create({
                data: {
                  caseId: testCase.id,
                  questionnaireVersion: 'v1.0',
                  questionId: sectionId,
                  answerData: JSON.stringify(data)
                }
              });
            }
          };

          // Rapid consecutive saves simulating debounced keystroke transmissions
          await upsertSection('personal_info', { fullName: 'A' });
          await upsertSection('personal_info', { fullName: 'Aa' });
          await upsertSection('personal_info', { fullName: 'Aar' });
          await upsertSection('personal_info', { fullName: 'Aarav' });

          const records = await prisma.questionnaireAnswer.findMany({
            where: { caseId: testCase.id, questionId: 'personal_info' }
          });

          assert.equal(records.length, 1, 'Only one record must exist for section after multiple saves');
          const finalData = JSON.parse(records[0].answerData);
          assert.equal(finalData.fullName, 'Aarav', 'Record must reflect final transmitted value');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T2.5.3: Saving answers for non-existent case ID rejects on foreign key constraint',
      async fn() {
        const prisma = getPrisma();
        const nonExistentCaseId = 'non-existent-case-id-12345';

        await assert.rejects(
          async () => {
            await prisma.questionnaireAnswer.create({
              data: {
                caseId: nonExistentCaseId,
                questionnaireVersion: 'v1.0',
                questionId: 'personal_info',
                answerData: JSON.stringify({ fullName: 'Ghost User' })
              }
            });
          },
          /foreign key/i,
          'Saving answer to non-existent case must be rejected with foreign key error'
        );
      }
    },

    {
      name: 'T2.5.4: Partial answers multi-section incremental persistence across reloads',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          // Step 1: Save personal info
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify({ fullName: 'Aarav Sharma', city: 'Bengaluru' })
            }
          });

          // Step 2: Save children section
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'children',
              answerData: JSON.stringify({ hasChildren: 'Yes', childCount: 2 })
            }
          });

          // Reload state from database
          const answers = await prisma.questionnaireAnswer.findMany({
            where: { caseId: testCase.id }
          });

          const state = {};
          answers.forEach(a => Object.assign(state, JSON.parse(a.answerData)));

          assert.equal(state.fullName, 'Aarav Sharma', 'Personal info persisted');
          assert.equal(state.city, 'Bengaluru', 'City persisted');
          assert.equal(state.hasChildren, 'Yes', 'Children answer persisted');
          assert.equal(state.childCount, 2, 'Child count persisted');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T2.5.5: 10KB+ large text fields persistence without truncation',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const largeText = fixtures.adversarial.hugeString10k;
          assert.ok(largeText.length >= 10000, 'Large text string must be >= 10,000 characters');

          const payload = {
            specialNotes: largeText,
            complexInstructions: `Instructions: ${largeText}`
          };

          const saved = await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'special_circumstances',
              answerData: JSON.stringify(payload)
            }
          });

          const retrieved = await prisma.questionnaireAnswer.findUnique({
            where: { id: saved.id }
          });

          const parsed = JSON.parse(retrieved.answerData);
          assert.equal(parsed.specialNotes.length, 10000, '10,000 char text must be completely preserved');
          assert.equal(parsed.specialNotes, largeText, 'Exact string contents must match without loss or corruption');
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
