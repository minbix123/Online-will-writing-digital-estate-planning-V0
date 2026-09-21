const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runForensics() {
  const results = {
    timestamp: new Date().toISOString(),
    users: [],
    clauses: [],
    templates: [],
    cases: [],
    uniqueConstraintTests: {},
    bcryptVerification: {},
    tableList: [],
    indexList: []
  };

  console.log("=== RUNNING FORENSIC DATABASE CHECKS ===");

  // 1. Raw SQLite table list and indexes
  const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`);
  results.tableList = tables.map(t => t.name);
  console.log("Tables found:", results.tableList);

  const indexes = await prisma.$queryRawUnsafe(`SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' ORDER BY tbl_name, name;`);
  results.indexList = indexes.map(i => ({ name: i.name, table: i.tbl_name, sql: i.sql }));
  console.log(`Indexes found: ${results.indexList.length}`);

  // 2. Inspect Users and bcrypt hashes
  const users = await prisma.user.findMany();
  for (const u of users) {
    const isBcrypt = u.password ? (u.password.startsWith('$2a$') || u.password.startsWith('$2b$')) : false;
    const validPass = u.password ? bcrypt.compareSync('password123', u.password) : false;
    const invalidPass = u.password ? bcrypt.compareSync('wrongpassword', u.password) : false;
    results.users.push({
      id: u.id,
      email: u.email,
      role: u.role,
      isBcrypt,
      validPassCorrect: validPass === true,
      invalidPassRejected: invalidPass === false,
      hashPrefix: u.password ? u.password.substring(0, 7) : null,
      hashLength: u.password ? u.password.length : 0
    });
  }

  // 3. Inspect seeded Clauses and Templates
  results.clauses = await prisma.clause.findMany({
    include: { versions: true }
  });
  results.templates = await prisma.template.findMany({
    include: { versions: true }
  });
  results.cases = await prisma.case.findMany();

  // 4. Test Compound Unique Constraints
  // Test 4.1: QuestionnaireAnswer @@unique([caseId, questionId])
  if (results.cases.length > 0) {
    const testCaseId = results.cases[0].id;
    const qId = "forensic_q_test";
    
    // Clean up if exists
    await prisma.questionnaireAnswer.deleteMany({
      where: { caseId: testCaseId, questionId: qId }
    });

    // First insert
    await prisma.questionnaireAnswer.create({
      data: {
        caseId: testCaseId,
        questionnaireVersion: "v1.0",
        questionId: qId,
        sectionId: "test_section",
        answerData: JSON.stringify({ answer: "first" })
      }
    });

    // Second insert should fail with unique constraint violation
    try {
      await prisma.questionnaireAnswer.create({
        data: {
          caseId: testCaseId,
          questionnaireVersion: "v1.0",
          questionId: qId,
          sectionId: "test_section",
          answerData: JSON.stringify({ answer: "second" })
        }
      });
      results.uniqueConstraintTests.QuestionnaireAnswer_Duplicate = "FAIL_NOT_ENFORCED";
    } catch (e) {
      results.uniqueConstraintTests.QuestionnaireAnswer_Duplicate = "PASS_ENFORCED (" + e.code + ")";
    }

    // Clean up test answer
    await prisma.questionnaireAnswer.deleteMany({
      where: { caseId: testCaseId, questionId: qId }
    });
  }

  // Test 4.2: TemplateVersion @@unique([templateId, version])
  if (results.templates.length > 0) {
    const testTemplateId = results.templates[0].id;
    try {
      await prisma.templateVersion.create({
        data: {
          templateId: testTemplateId,
          version: 1, // Already exists!
          content: "Duplicate version test",
          status: "DRAFT"
        }
      });
      results.uniqueConstraintTests.TemplateVersion_Duplicate = "FAIL_NOT_ENFORCED";
    } catch (e) {
      results.uniqueConstraintTests.TemplateVersion_Duplicate = "PASS_ENFORCED (" + e.code + ")";
    }
  }

  // Test 4.3: ClauseVersion @@unique([clauseId, version])
  if (results.clauses.length > 0) {
    const testClauseId = results.clauses[0].id;
    try {
      await prisma.clauseVersion.create({
        data: {
          clauseId: testClauseId,
          version: 1, // Already exists!
          content: "Duplicate clause version test",
          status: "DRAFT"
        }
      });
      results.uniqueConstraintTests.ClauseVersion_Duplicate = "FAIL_NOT_ENFORCED";
    } catch (e) {
      results.uniqueConstraintTests.ClauseVersion_Duplicate = "PASS_ENFORCED (" + e.code + ")";
    }
  }

  console.log("=== RESULTS ===");
  console.log(JSON.stringify(results, null, 2));

  await prisma.$disconnect();
}

runForensics().catch(err => {
  console.error("Forensic test failed:", err);
  process.exit(1);
});
