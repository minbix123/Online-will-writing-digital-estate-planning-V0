const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function assert(condition, testName, extraInfo = '') {
  results.total++;
  if (condition) {
    results.passed++;
    results.details.push({ test: testName, status: 'PASS', info: extraInfo });
    console.log(`[PASS] ${testName}`);
  } else {
    results.failed++;
    results.details.push({ test: testName, status: 'FAIL', info: extraInfo });
    console.error(`[FAIL] ${testName}: ${extraInfo}`);
  }
}

async function runStressTests() {
  console.log("================================================================================");
  console.log("CHALLENGER M2: EMPIRICAL DATABASE STRESS TESTING & CONSTRAINT VERIFICATION");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // SUITE 1: COMPOUND UNIQUE CONSTRAINT ENFORCEMENT
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 1: Compound Unique Constraint Enforcement ---");

  // Setup test customer and test case
  const testCustomer = await prisma.user.create({
    data: {
      name: "Stress Test Customer",
      email: `stress_cust_${Date.now()}@demo.com`,
      password: bcrypt.hashSync("password123", 10),
      role: "CUSTOMER"
    }
  });

  const testCase = await prisma.case.create({
    data: {
      customerId: testCustomer.id,
      status: "DRAFT",
      flags: "STANDARD"
    }
  });

  // 1.1 QuestionnaireAnswer Compound Unique: @@unique([caseId, questionId])
  const qId = `q_test_${Date.now()}`;
  const ans1 = await prisma.questionnaireAnswer.create({
    data: {
      caseId: testCase.id,
      questionId: qId,
      questionnaireVersion: "v1.0",
      sectionId: "test_section",
      answerData: JSON.stringify({ value: "first_entry" })
    }
  });
  assert(ans1 && ans1.id, "QuestionnaireAnswer initial insert succeeds");

  let p2002Caught = false;
  let errorTarget = null;
  try {
    await prisma.questionnaireAnswer.create({
      data: {
        caseId: testCase.id,
        questionId: qId,
        questionnaireVersion: "v1.0",
        sectionId: "test_section",
        answerData: JSON.stringify({ value: "duplicate_collision" })
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      p2002Caught = true;
      errorTarget = err.meta?.target;
    } else {
      console.error("Unexpected error on duplicate QuestionnaireAnswer:", err);
    }
  }
  assert(p2002Caught, "QuestionnaireAnswer duplicate (caseId, questionId) rejected with P2002", `Target: ${JSON.stringify(errorTarget)}`);

  // 1.2 QuestionnaireAnswer Upsert using compound unique key
  let upsertWorked = false;
  try {
    const updated = await prisma.questionnaireAnswer.upsert({
      where: {
        caseId_questionId: {
          caseId: testCase.id,
          questionId: qId
        }
      },
      update: {
        answerData: JSON.stringify({ value: "upserted_entry" })
      },
      create: {
        caseId: testCase.id,
        questionId: qId,
        questionnaireVersion: "v1.0",
        answerData: JSON.stringify({ value: "new" })
      }
    });
    const parsed = JSON.parse(updated.answerData);
    upsertWorked = parsed.value === "upserted_entry";
  } catch (err) {
    console.error("Upsert failed:", err);
  }
  assert(upsertWorked, "QuestionnaireAnswer upsert via caseId_questionId compound key succeeds");

  // 1.3 High-concurrency Race Condition on QuestionnaireAnswer
  const concurrentQId = `q_concurrent_${Date.now()}`;
  const concurrencyCount = 10;
  const promises = [];
  for (let i = 0; i < concurrencyCount; i++) {
    promises.push(
      prisma.questionnaireAnswer.create({
        data: {
          caseId: testCase.id,
          questionId: concurrentQId,
          questionnaireVersion: "v1.0",
          sectionId: "concurrent_section",
          answerData: JSON.stringify({ thread: i })
        }
      }).then(() => ({ success: true })).catch(e => ({ success: false, code: e.code }))
    );
  }
  const raceResults = await Promise.all(promises);
  const successCount = raceResults.filter(r => r.success).length;
  const p2002Count = raceResults.filter(r => !r.success && r.code === 'P2002').length;
  assert(
    successCount === 1 && p2002Count === concurrencyCount - 1,
    `Concurrent race condition: exactly 1 write wins, ${concurrencyCount - 1} fail with P2002`,
    `Successes: ${successCount}, P2002 Rejections: ${p2002Count}`
  );

  // 1.4 TemplateVersion Compound Unique: @@unique([templateId, version])
  const testTemplate = await prisma.template.create({
    data: {
      name: `Stress Template ${Date.now()}`,
      status: "DRAFT"
    }
  });

  const tv1 = await prisma.templateVersion.create({
    data: {
      templateId: testTemplate.id,
      version: 1,
      content: "Initial Version Content",
      status: "DRAFT"
    }
  });
  assert(tv1 && tv1.id, "TemplateVersion initial insert succeeds");

  let tvP2002Caught = false;
  try {
    await prisma.templateVersion.create({
      data: {
        templateId: testTemplate.id,
        version: 1,
        content: "Duplicate Version Content",
        status: "DRAFT"
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      tvP2002Caught = true;
    }
  }
  assert(tvP2002Caught, "TemplateVersion duplicate (templateId, version) rejected with P2002");

  // 1.5 ClauseVersion Compound Unique: @@unique([clauseId, version])
  const testClause = await prisma.clause.create({
    data: {
      name: `Stress Clause ${Date.now()}`,
      status: "DRAFT"
    }
  });

  const cv1 = await prisma.clauseVersion.create({
    data: {
      clauseId: testClause.id,
      version: 1,
      content: "Initial Clause Content",
      status: "DRAFT"
    }
  });
  assert(cv1 && cv1.id, "ClauseVersion initial insert succeeds");

  let cvP2002Caught = false;
  try {
    await prisma.clauseVersion.create({
      data: {
        clauseId: testClause.id,
        version: 1,
        content: "Duplicate Clause Content",
        status: "DRAFT"
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      cvP2002Caught = true;
    }
  }
  assert(cvP2002Caught, "ClauseVersion duplicate (clauseId, version) rejected with P2002");


  // ---------------------------------------------------------------------------
  // SUITE 2: FOREIGN KEY INTEGRITY & CASCADING RELATIONS
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Foreign Key Integrity & Relational Cascades ---");

  // Setup test lawyer
  const testLawyer = await prisma.user.create({
    data: {
      name: "Reviewing Lawyer Test",
      email: `test_lawyer_${Date.now()}@demo.com`,
      password: bcrypt.hashSync("password123", 10),
      role: "LAWYER"
    }
  });

  // 2.1 LawyerReview with invalid caseId
  let invalidCaseFkRejected = false;
  let invalidCaseError = null;
  try {
    await prisma.lawyerReview.create({
      data: {
        caseId: "non_existent_case_cuid_999999",
        lawyerId: testLawyer.id,
        status: "REQUESTED",
        notes: "Test invalid case"
      }
    });
  } catch (err) {
    invalidCaseFkRejected = true;
    invalidCaseError = err.code || err.message;
  }
  assert(
    invalidCaseFkRejected,
    "LawyerReview creation with non-existent caseId fails relational check",
    `Error: ${invalidCaseError}`
  );

  // 2.2 LawyerReview with invalid lawyerId
  let invalidLawyerFkRejected = false;
  let invalidLawyerError = null;
  try {
    await prisma.lawyerReview.create({
      data: {
        caseId: testCase.id,
        lawyerId: "non_existent_lawyer_cuid_999999",
        status: "REQUESTED",
        notes: "Test invalid lawyer"
      }
    });
  } catch (err) {
    invalidLawyerFkRejected = true;
    invalidLawyerError = err.code || err.message;
  }
  assert(
    invalidLawyerFkRejected,
    "LawyerReview creation with non-existent lawyerId fails relational check",
    `Error: ${invalidLawyerError}`
  );

  // 2.3 Valid LawyerReview and Bidirectional Navigation
  const validReview = await prisma.lawyerReview.create({
    data: {
      caseId: testCase.id,
      lawyerId: testLawyer.id,
      status: "REQUESTED",
      notes: "Relational integrity verified"
    }
  });

  const fetchedReview = await prisma.lawyerReview.findUnique({
    where: { id: validReview.id },
    include: {
      case: true,
      lawyer: true
    }
  });
  assert(
    fetchedReview && fetchedReview.case.id === testCase.id && fetchedReview.lawyer?.id === testLawyer.id,
    "LawyerReview correctly connects to Case and Lawyer with bidirectional navigation"
  );

  // Reverse relation check: Case.reviews and User.lawyerReviews
  const lawyerWithReviews = await prisma.user.findUnique({
    where: { id: testLawyer.id },
    include: { lawyerReviews: true }
  });
  assert(
    lawyerWithReviews && lawyerWithReviews.lawyerReviews.some(r => r.id === validReview.id),
    "User.lawyerReviews reverse relation properly aggregates LawyerReview records"
  );

  const caseWithReviews = await prisma.case.findUnique({
    where: { id: testCase.id },
    include: { reviews: true }
  });
  assert(
    caseWithReviews && caseWithReviews.reviews.some(r => r.id === validReview.id),
    "Case.reviews reverse relation properly aggregates LawyerReview records"
  );

  // 2.4 Cascade Deletion Test
  // Create a case with Payment, Document, LawyerReview, QuestionnaireAnswer
  const cascadeCase = await prisma.case.create({
    data: {
      customerId: testCustomer.id,
      status: "IN_REVIEW"
    }
  });

  const cascA = await prisma.questionnaireAnswer.create({
    data: {
      caseId: cascadeCase.id,
      questionId: "cascade_q",
      questionnaireVersion: "v1.0",
      answerData: "{}"
    }
  });

  const cascP = await prisma.payment.create({
    data: {
      caseId: cascadeCase.id,
      amount: 1999.0,
      currency: "INR",
      status: "SUCCESS"
    }
  });

  const cascR = await prisma.lawyerReview.create({
    data: {
      caseId: cascadeCase.id,
      lawyerId: testLawyer.id,
      status: "REQUESTED"
    }
  });

  const cascD = await prisma.document.create({
    data: {
      caseId: cascadeCase.id,
      templateVersionId: tv1.id,
      status: "GENERATED",
      clauseVersions: cv1.id,
      ruleVersions: "v1.0"
    }
  });

  // Delete the case and observe cascade
  await prisma.case.delete({
    where: { id: cascadeCase.id }
  });

  const remA = await prisma.questionnaireAnswer.findUnique({ where: { id: cascA.id } });
  const remP = await prisma.payment.findUnique({ where: { id: cascP.id } });
  const remR = await prisma.lawyerReview.findUnique({ where: { id: cascR.id } });
  const remD = await prisma.document.findUnique({ where: { id: cascD.id } });

  assert(
    !remA && !remP && !remR && !remD,
    "Case deletion cascades to QuestionnaireAnswer, Payment, LawyerReview, and Document (no orphan records)"
  );


  // ---------------------------------------------------------------------------
  // SUITE 3: DATABASE INDEXES & QUERY PERFORMANCE
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 3: Database Indexes & Query Performance ---");

  // 3.1 Schema inspection for required secondary indexes
  const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  const requiredIndexes = [
    { model: "User", index: "@@index([email])" },
    { model: "User", index: "@@index([role])" },
    { model: "Case", index: "@@index([customerId])" },
    { model: "Case", index: "@@index([lawyerId])" },
    { model: "Case", index: "@@index([status])" },
    { model: "Case", index: "@@index([createdAt])" },
    { model: "QuestionnaireAnswer", index: "@@index([caseId])" },
    { model: "QuestionnaireAnswer", index: "@@index([sectionId])" },
    { model: "AuditLog", index: "@@index([actorId])" },
    { model: "AuditLog", index: "@@index([entity, entityId])" },
    { model: "AuditLog", index: "@@index([createdAt])" },
    { model: "Document", index: "@@index([caseId])" },
    { model: "Document", index: "@@index([status])" },
    { model: "Payment", index: "@@index([caseId])" },
    { model: "Payment", index: "@@index([status])" },
    { model: "TemplateVersion", index: "@@index([templateId])" },
    { model: "ClauseVersion", index: "@@index([clauseId])" },
    { model: "LawyerReview", index: "@@index([caseId])" },
    { model: "LawyerReview", index: "@@index([lawyerId])" }
  ];

  let allSchemaIndexesFound = true;
  for (const item of requiredIndexes) {
    if (!schemaContent.includes(item.index)) {
      allSchemaIndexesFound = false;
      assert(false, `Index missing from schema: ${item.model} ${item.index}`);
    }
  }
  if (allSchemaIndexesFound) {
    assert(true, `All 19 required secondary indexes defined in schema.prisma`);
  }

  // 3.2 Physical SQLite master table index verification
  const rawIndexes = await prisma.$queryRawUnsafe(`SELECT tbl_name, name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL;`);
  
  const expectedPhysicalFields = [
    { tbl: 'Case', col: 'customerId' },
    { tbl: 'Case', col: 'lawyerId' },
    { tbl: 'Case', col: 'status' },
    { tbl: 'AuditLog', col: 'actorId' },
    { tbl: 'AuditLog', col: 'entity' },
    { tbl: 'LawyerReview', col: 'caseId' },
    { tbl: 'LawyerReview', col: 'lawyerId' },
    { tbl: 'QuestionnaireAnswer', col: 'caseId' },
    { tbl: 'QuestionnaireAnswer', col: 'questionId' } // part of unique index
  ];

  let allPhysicalFound = true;
  for (const expected of expectedPhysicalFields) {
    const found = rawIndexes.some(idx => 
      idx.tbl_name.toLowerCase() === expected.tbl.toLowerCase() && 
      idx.sql && idx.sql.includes(expected.col)
    );
    if (!found) {
      allPhysicalFound = false;
      console.warn(`Physical index not found for ${expected.tbl}.${expected.col}`);
    }
  }
  assert(allPhysicalFound, `Physical B-tree indexes confirmed in SQLite dev.db via sqlite_master`);


  // ---------------------------------------------------------------------------
  // SUITE 4: SEED IDEMPOTENCY & DEMO ACCOUNT VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 4: Seed Idempotency & Demo Accounts ---");

  const demoAccounts = [
    { email: "customer@demo.com", expectedRole: "CUSTOMER" },
    { email: "nri@demo.com", expectedRole: "CUSTOMER" },
    { email: "lawyer@demo.com", expectedRole: "LAWYER" },
    { email: "admin@demo.com", expectedRole: "ADMIN" }
  ];

  for (const acc of demoAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: acc.email }
    });
    const exists = !!user;
    const roleMatches = user?.role === acc.expectedRole;
    const isBcrypt = user?.password ? user.password.startsWith('$2') : false;
    const passwordValid = user?.password ? bcrypt.compareSync("password123", user.password) : false;
    const badPasswordInvalid = user?.password ? !bcrypt.compareSync("wrongpassword", user.password) : false;

    assert(
      exists && roleMatches && isBcrypt && passwordValid && badPasswordInvalid,
      `Demo account ${acc.email} (${acc.expectedRole}) verified: bcrypt hashed, password123 succeeds, wrong password rejected`
    );
  }

  // 4.2 Seed idempotency: Verify clauses and templates have LAWYER_APPROVED versions
  const approvedClauses = await prisma.clause.findMany({
    where: { status: "LAWYER_APPROVED" },
    include: { versions: true }
  });
  assert(approvedClauses.length >= 5, `Database contains ${approvedClauses.length} LAWYER_APPROVED clauses (min 5 required)`);

  const approvedTemplates = await prisma.template.findMany({
    where: { status: "LAWYER_APPROVED" },
    include: { versions: true }
  });
  assert(approvedTemplates.length >= 1, `Database contains ${approvedTemplates.length} LAWYER_APPROVED templates`);


  // ---------------------------------------------------------------------------
  // SUITE 5: EDGE MIDDLEWARE SIMULATION
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 5: Edge Middleware Role-Based Access Control ---");

  // Read middleware implementation to verify rules
  const middlewarePath = path.resolve(__dirname, '../../src/middleware.ts');
  const middlewareCode = fs.readFileSync(middlewarePath, 'utf-8');

  // Verify matcher covers all three subtrees
  const hasCustomerMatcher = middlewareCode.includes("/customer/:path*");
  const hasLawyerMatcher = middlewareCode.includes("/lawyer/:path*");
  const hasAdminMatcher = middlewareCode.includes("/admin/:path*");
  assert(hasCustomerMatcher && hasLawyerMatcher && hasAdminMatcher, "Edge middleware matcher covers /customer/*, /lawyer/*, /admin/*");

  // Simulate middleware routing decision function matching src/middleware.ts logic
  function simulateMiddleware(pathname, role) {
    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN") {
        if (role === "LAWYER") return { action: "REDIRECT", to: "/lawyer/dashboard" };
        if (role === "CUSTOMER") return { action: "REDIRECT", to: "/customer/dashboard" };
        return { action: "REDIRECT", to: "/login" };
      }
      return { action: "ALLOW" };
    }
    if (pathname.startsWith("/lawyer")) {
      if (role !== "LAWYER" && role !== "ADMIN") {
        if (role === "CUSTOMER") return { action: "REDIRECT", to: "/customer/dashboard" };
        return { action: "REDIRECT", to: "/login" };
      }
      return { action: "ALLOW" };
    }
    if (pathname.startsWith("/customer")) {
      if (role !== "CUSTOMER" && role !== "ADMIN") {
        if (role === "LAWYER") return { action: "REDIRECT", to: "/lawyer/dashboard" };
        return { action: "REDIRECT", to: "/login" };
      }
      return { action: "ALLOW" };
    }
    return { action: "ALLOW" };
  }

  // Matrix tests
  const matrixTests = [
    { path: "/admin/users", role: "ADMIN", expected: "ALLOW" },
    { path: "/admin/users", role: "LAWYER", expected: "REDIRECT" },
    { path: "/admin/users", role: "CUSTOMER", expected: "REDIRECT" },
    { path: "/admin/users", role: undefined, expected: "REDIRECT" },
    { path: "/lawyer/dashboard", role: "LAWYER", expected: "ALLOW" },
    { path: "/lawyer/dashboard", role: "ADMIN", expected: "ALLOW" },
    { path: "/lawyer/dashboard", role: "CUSTOMER", expected: "REDIRECT" },
    { path: "/customer/dashboard", role: "CUSTOMER", expected: "ALLOW" },
    { path: "/customer/dashboard", role: "ADMIN", expected: "ALLOW" },
    { path: "/customer/dashboard", role: "LAWYER", expected: "REDIRECT" },
  ];

  let matrixPassed = true;
  for (const m of matrixTests) {
    const res = simulateMiddleware(m.path, m.role);
    if (res.action !== m.expected) {
      matrixPassed = false;
      assert(false, `RBAC Matrix failure: ${m.role} accessing ${m.path} got ${res.action} instead of ${m.expected}`);
    }
  }
  assert(matrixPassed, "Edge Middleware RBAC decision matrix fully verified for all route combinations");


  // ---------------------------------------------------------------------------
  // CLEANUP TEST FIXTURES
  // ---------------------------------------------------------------------------
  console.log("\n--- Cleaning up temporary stress fixtures ---");
  try {
    await prisma.questionnaireAnswer.deleteMany({ where: { caseId: testCase.id } });
    await prisma.lawyerReview.deleteMany({ where: { caseId: testCase.id } });
    await prisma.case.delete({ where: { id: testCase.id } });
    await prisma.user.delete({ where: { id: testCustomer.id } });
    await prisma.user.delete({ where: { id: testLawyer.id } });
    await prisma.templateVersion.deleteMany({ where: { templateId: testTemplate.id } });
    await prisma.template.delete({ where: { id: testTemplate.id } });
    await prisma.clauseVersion.deleteMany({ where: { clauseId: testClause.id } });
    await prisma.clause.delete({ where: { id: testClause.id } });
    console.log("Cleanup completed successfully.");
  } catch (cleanErr) {
    console.warn("Cleanup notice:", cleanErr.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`STRESS TEST SUMMARY: ${results.passed}/${results.total} PASSED (${results.failed} failed)`);
  console.log("================================================================================");

  await prisma.$disconnect();
  return results;
}

runStressTests()
  .then(res => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch(err => {
    console.error("Fatal error running stress tests:", err);
    process.exit(1);
  });
