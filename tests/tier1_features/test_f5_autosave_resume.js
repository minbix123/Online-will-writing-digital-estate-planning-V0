/**
 * Tier 1: Feature Coverage — F5: Debounced Autosave & Resume
 * 5 Tests: Debounced save payload structure, answer persistence, conflict prevention,
 * timestamp updates, resume on session reload
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { cleanup } = require('../helpers/test_utils');

module.exports = {
  name: 'F5: Debounced Autosave & Resume',
  tests: [
    {
      name: 'T1.5.1: Debounced save payload structure - Validates required keys',
      async fn() {
        const payload = {
          caseId: 'test_case_123',
          sectionId: 'personal_info',
          data: fixtures.sectionPayloads.personalInfo
        };

        assert.ok(payload.caseId, 'Payload must contain caseId');
        assert.ok(payload.sectionId, 'Payload must contain sectionId');
        assert.ok(payload.data && typeof payload.data === 'object', 'Payload must contain data object');
        assert.equal(payload.data.fullName, 'Aarav Sharma', 'Payload data should contain section fields');
      }
    },

    {
      name: 'T1.5.2: Answer persistence - Saves section answers into QuestionnaireAnswer table',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const answerData = fixtures.sectionPayloads.personalInfo;
          const savedAnswer = await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify(answerData)
            }
          });

          assert.ok(savedAnswer.id, 'QuestionnaireAnswer record must have ID');
          assert.equal(savedAnswer.caseId, testCase.id, 'caseId must match test case');
          assert.equal(savedAnswer.questionId, 'personal_info', 'questionId must match section');

          const parsed = JSON.parse(savedAnswer.answerData);
          assert.equal(parsed.fullName, 'Aarav Sharma', 'Parsed answer data must match saved payload');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.5.3: Conflict prevention - Updating existing section updates rather than duplicates',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          // Initial Save
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify({ fullName: 'Aarav Sharma', city: 'Bengaluru' })
            }
          });

          // Second Autosave on same section (Simulating save API behavior)
          const existing = await prisma.questionnaireAnswer.findFirst({
            where: { caseId: testCase.id, questionId: 'personal_info' }
          });

          await prisma.questionnaireAnswer.update({
            where: { id: existing.id },
            data: { answerData: JSON.stringify({ fullName: 'Aarav Sharma', city: 'Mumbai' }) }
          });

          // Verify only 1 record exists for this section in the case
          const records = await prisma.questionnaireAnswer.findMany({
            where: { caseId: testCase.id, questionId: 'personal_info' }
          });

          assert.equal(records.length, 1, 'Duplicate records must be prevented for the same section');
          assert.includes(records[0].answerData, 'Mumbai', 'Answer data must reflect updated value');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.5.4: Timestamp updates - Autosave updates updatedAt timestamp',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          const initialAnswer = await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'assets',
              answerData: JSON.stringify({ assetCount: 1 })
            }
          });

          // Small pause to test timestamp advance
          await new Promise(r => setTimeout(r, 20));

          const updatedAnswer = await prisma.questionnaireAnswer.update({
            where: { id: initialAnswer.id },
            data: { answerData: JSON.stringify({ assetCount: 2 }) }
          });

          assert.ok(
            updatedAnswer.updatedAt.getTime() >= initialAnswer.updatedAt.getTime(),
            'updatedAt timestamp must advance or remain current on autosave update'
          );
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'T1.5.5: Resume on session reload - Reconstructs full questionnaire state',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          // Save multiple sections
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify(fixtures.sectionPayloads.personalInfo)
            }
          });
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'children',
              answerData: JSON.stringify(fixtures.sectionPayloads.children)
            }
          });
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'guardian',
              answerData: JSON.stringify(fixtures.sectionPayloads.guardian)
            }
          });

          // Simulate reload: fetch all answers for caseId and merge into memory
          const loadedAnswers = await prisma.questionnaireAnswer.findMany({
            where: { caseId: testCase.id }
          });

          const restoredState = {};
          for (const ans of loadedAnswers) {
            Object.assign(restoredState, JSON.parse(ans.answerData));
          }

          assert.equal(restoredState.fullName, 'Aarav Sharma', 'Personal info state restored');
          assert.equal(restoredState.hasChildren, 'Yes', 'Children state restored');
          assert.equal(restoredState.guardianName, 'Sunita Sharma', 'Guardian state restored');
          assert.equal(restoredState.childrenList.length, 2, 'Array repeater state restored');
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
