const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function testUpsert() {
  const demoCase = await p.case.findFirst();
  if (!demoCase) throw new Error('No case found');

  // Insert initial
  const ans1 = await p.questionnaireAnswer.upsert({
    where: {
      caseId_questionId: {
        caseId: demoCase.id,
        questionId: 'test_upsert_check'
      }
    },
    update: { answerData: JSON.stringify({ count: 1 }) },
    create: {
      caseId: demoCase.id,
      questionId: 'test_upsert_check',
      questionnaireVersion: 'v1.0',
      answerData: JSON.stringify({ count: 1 })
    }
  });

  // Update existing
  const ans2 = await p.questionnaireAnswer.upsert({
    where: {
      caseId_questionId: {
        caseId: demoCase.id,
        questionId: 'test_upsert_check'
      }
    },
    update: { answerData: JSON.stringify({ count: 2 }) },
    create: {
      caseId: demoCase.id,
      questionId: 'test_upsert_check',
      questionnaireVersion: 'v1.0',
      answerData: JSON.stringify({ count: 2 })
    }
  });

  console.log('Upsert verified! Same ID:', ans1.id === ans2.id, 'Updated content:', ans2.answerData);

  // Clean up
  await p.questionnaireAnswer.delete({
    where: { id: ans1.id }
  });

  await p.$disconnect();
}

testUpsert().catch(e => {
  console.error(e);
  p.$disconnect();
  process.exit(1);
});
