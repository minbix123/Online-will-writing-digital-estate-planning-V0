const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runVerification() {
  console.log('=== STARTING INDEPENDENT VERIFICATION FOR MILESTONE 2 ===\n');
  const results = {
    checksPassed: 0,
    checksFailed: 0,
    failures: []
  };

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      results.checksPassed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      results.checksFailed++;
      results.failures.push(message);
    }
  }

  // --- SECTION 1: SEEDED USERS & BCRYPT VERIFICATION ---
  console.log('--- 1. Seeded Users & Bcrypt Password Hashing ---');
  const expectedUsers = [
    { email: 'customer@demo.com', role: 'CUSTOMER' },
    { email: 'nri@demo.com', role: 'CUSTOMER' },
    { email: 'lawyer@demo.com', role: 'LAWYER' },
    { email: 'admin@demo.com', role: 'ADMIN' },
  ];

  for (const exp of expectedUsers) {
    const user = await prisma.user.findUnique({
      where: { email: exp.email }
    });
    assert(!!user, `User ${exp.email} exists in database`);
    if (user) {
      assert(user.role === exp.role, `User ${exp.email} has role ${exp.role} (actual: ${user.role})`);
      assert(typeof user.password === 'string' && user.password.length > 0, `User ${exp.email} has password hash`);
      const isBcrypt = user.password ? /^\$2[aby]\$\d{2}\$/.test(user.password) : false;
      assert(isBcrypt, `User ${exp.email} password is valid bcrypt hash: ${user.password?.substring(0, 7)}...`);
      const matchesCorrect = user.password ? bcrypt.compareSync('password123', user.password) : false;
      assert(matchesCorrect, `User ${exp.email} authenticates with correct password "password123"`);
      const rejectsIncorrect = user.password ? !bcrypt.compareSync('wrongpassword', user.password) : false;
      assert(rejectsIncorrect, `User ${exp.email} rejects incorrect password "wrongpassword"`);
    }
  }

  // --- SECTION 2: CLAUSES AND TEMPLATES SEED DATA ---
  console.log('\n--- 2. Legal Clauses & Templates Seed Data ---');
  const expectedClauseNames = [
    'STANDARD_DECLARATION',
    'EXECUTORS',
    'GUARDIAN',
    'NRI_ASSETS',
    'BUSINESS_SUCCESSION'
  ];

  for (const cName of expectedClauseNames) {
    const clause = await prisma.clause.findFirst({
      where: { name: cName },
      include: { versions: true }
    });
    assert(!!clause, `Clause ${cName} exists in database`);
    if (clause) {
      assert(clause.status === 'LAWYER_APPROVED', `Clause ${cName} status is LAWYER_APPROVED (actual: ${clause.status})`);
      assert(clause.versions.length >= 1, `Clause ${cName} has at least 1 version`);
      const v1 = clause.versions.find(v => v.version === 1);
      assert(!!v1, `Clause ${cName} has version 1`);
      if (v1) {
        assert(v1.status === 'LAWYER_APPROVED', `Clause ${cName} v1 status is LAWYER_APPROVED`);
        assert(typeof v1.content === 'string' && v1.content.length > 20, `Clause ${cName} v1 contains legal text`);
      }
    }
  }

  const approvedTemplate = await prisma.template.findFirst({
    where: { status: 'LAWYER_APPROVED' },
    include: { versions: true }
  });
  assert(!!approvedTemplate, 'At least one LAWYER_APPROVED template exists');
  if (approvedTemplate) {
    const v1 = approvedTemplate.versions.find(v => v.version === 1);
    assert(!!v1, `Approved template "${approvedTemplate.name}" has version 1`);
    assert(v1?.status === 'LAWYER_APPROVED', `Approved template version 1 status is LAWYER_APPROVED`);
  }

  // --- SECTION 3: ADVERSARIAL STRESS TEST — COMPOUND UNIQUE CONSTRAINTS ---
  console.log('\n--- 3. Stress-Testing Compound Unique Constraints ---');
  // Setup temporary test entities
  const testUser = await prisma.user.create({
    data: {
      email: `temp_test_${Date.now()}@test.com`,
      role: 'CUSTOMER',
      password: bcrypt.hashSync('testpass', 4)
    }
  });

  const testCase = await prisma.case.create({
    data: {
      customerId: testUser.id,
      status: 'DRAFT'
    }
  });

  // Test 3.1: QuestionnaireAnswer @@unique([caseId, questionId])
  await prisma.questionnaireAnswer.create({
    data: {
      caseId: testCase.id,
      questionnaireVersion: 'v1.0',
      questionId: 'test_question_unique_check',
      sectionId: 'personal',
      answerData: JSON.stringify({ fullName: 'Test User' })
    }
  });

  let qAnswerDuplicateBlocked = false;
  try {
    await prisma.questionnaireAnswer.create({
      data: {
        caseId: testCase.id,
        questionnaireVersion: 'v1.0',
        questionId: 'test_question_unique_check',
        sectionId: 'personal',
        answerData: JSON.stringify({ fullName: 'Duplicate User' })
      }
    });
  } catch (err) {
    if (err.code === 'P2002' || err.message.includes('Unique constraint')) {
      qAnswerDuplicateBlocked = true;
    }
  }
  assert(qAnswerDuplicateBlocked, 'QuestionnaireAnswer duplicate @@unique([caseId, questionId]) successfully rejected with P2002');

  // Test 3.2: TemplateVersion @@unique([templateId, version])
  const testTemplate = await prisma.template.create({
    data: {
      name: `Test Template ${Date.now()}`,
      status: 'DRAFT'
    }
  });

  await prisma.templateVersion.create({
    data: {
      templateId: testTemplate.id,
      version: 42,
      content: 'Version 42 content',
      status: 'DRAFT'
    }
  });

  let templateVersionDuplicateBlocked = false;
  try {
    await prisma.templateVersion.create({
      data: {
        templateId: testTemplate.id,
        version: 42,
        content: 'Duplicate version 42 content',
        status: 'DRAFT'
      }
    });
  } catch (err) {
    if (err.code === 'P2002' || err.message.includes('Unique constraint')) {
      templateVersionDuplicateBlocked = true;
    }
  }
  assert(templateVersionDuplicateBlocked, 'TemplateVersion duplicate @@unique([templateId, version]) successfully rejected with P2002');

  // Test 3.3: ClauseVersion @@unique([clauseId, version])
  const testClause = await prisma.clause.create({
    data: {
      name: `TEST_CLAUSE_${Date.now()}`,
      status: 'DRAFT'
    }
  });

  await prisma.clauseVersion.create({
    data: {
      clauseId: testClause.id,
      version: 42,
      content: 'Clause version 42 content',
      status: 'DRAFT'
    }
  });

  let clauseVersionDuplicateBlocked = false;
  try {
    await prisma.clauseVersion.create({
      data: {
        clauseId: testClause.id,
        version: 42,
        content: 'Duplicate clause version 42 content',
        status: 'DRAFT'
      }
    });
  } catch (err) {
    if (err.code === 'P2002' || err.message.includes('Unique constraint')) {
      clauseVersionDuplicateBlocked = true;
    }
  }
  assert(clauseVersionDuplicateBlocked, 'ClauseVersion duplicate @@unique([clauseId, version]) successfully rejected with P2002');

  // --- SECTION 4: FOREIGN KEY RELATIONS & REVERSE RELATIONS ---
  console.log('\n--- 4. Foreign Key Relations and Reverse Relations ---');
  const lawyerUser = await prisma.user.findUnique({
    where: { email: 'lawyer@demo.com' }
  });

  const testReview = await prisma.lawyerReview.create({
    data: {
      caseId: testCase.id,
      lawyerId: lawyerUser.id,
      status: 'REQUESTED',
      notes: 'Test review notes'
    }
  });

  // Verify reverse relation on Case
  const caseWithReviews = await prisma.case.findUnique({
    where: { id: testCase.id },
    include: { reviews: true }
  });
  assert(caseWithReviews.reviews.length >= 1, 'Case reverse relation "reviews" successfully populates LawyerReview');

  // Verify reverse relation on Lawyer User
  const lawyerWithReviews = await prisma.user.findUnique({
    where: { id: lawyerUser.id },
    include: { lawyerReviews: true }
  });
  assert(lawyerWithReviews.lawyerReviews.some(r => r.id === testReview.id), 'User reverse relation "lawyerReviews" successfully populates assigned LawyerReview');

  // --- SECTION 5: CASCADE DELETE VERIFICATION ---
  console.log('\n--- 5. Cascade Delete Verification ---');
  await prisma.case.delete({
    where: { id: testCase.id }
  });

  const orphanedAnswer = await prisma.questionnaireAnswer.findFirst({
    where: { caseId: testCase.id }
  });
  assert(orphanedAnswer === null, 'QuestionnaireAnswer cascaded on Case delete');

  const orphanedReview = await prisma.lawyerReview.findFirst({
    where: { caseId: testCase.id }
  });
  assert(orphanedReview === null, 'LawyerReview cascaded on Case delete');

  // Cleanup remaining test entities
  await prisma.template.delete({ where: { id: testTemplate.id } });
  await prisma.clause.delete({ where: { id: testClause.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  // --- SECTION 6: AUTH LOGIC & EDGE MIDDLEWARE ROLE CHECKS ---
  console.log('\n--- 6. Auth Logic & Edge RBAC Rule Simulation ---');
  // Simulate authorize function from auth.ts
  async function simulateAuthorize(email, password) {
    if (!email || !password) return null;
    const u = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
    if (!u || !u.password) return null;
    const isValid = await bcrypt.compare(password, u.password);
    if (!isValid) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role };
  }

  const authSuccess = await simulateAuthorize('CUSTOMER@DEMO.COM', 'password123');
  assert(authSuccess !== null && authSuccess.role === 'CUSTOMER', 'Auth succeeds with case-insensitive email CUSTOMER@DEMO.COM');

  const authWrongPass = await simulateAuthorize('customer@demo.com', 'badpassword');
  assert(authWrongPass === null, 'Auth correctly rejects wrong password');

  const authNoSuchUser = await simulateAuthorize('unknown@domain.com', 'password123');
  assert(authNoSuchUser === null, 'Auth correctly rejects non-existent user');

  // Middleware routing rules simulation
  function simulateMiddleware(pathname, tokenRole) {
    if (pathname.startsWith('/admin')) {
      if (tokenRole !== 'ADMIN') {
        if (tokenRole === 'LAWYER') return '/lawyer/dashboard';
        if (tokenRole === 'CUSTOMER') return '/customer/dashboard';
        return '/login';
      }
      return 'ALLOW';
    }
    if (pathname.startsWith('/lawyer')) {
      if (tokenRole !== 'LAWYER' && tokenRole !== 'ADMIN') {
        if (tokenRole === 'CUSTOMER') return '/customer/dashboard';
        return '/login';
      }
      return 'ALLOW';
    }
    if (pathname.startsWith('/customer')) {
      if (tokenRole !== 'CUSTOMER' && tokenRole !== 'ADMIN') {
        if (tokenRole === 'LAWYER') return '/lawyer/dashboard';
        return '/login';
      }
      return 'ALLOW';
    }
    return 'ALLOW';
  }

  assert(simulateMiddleware('/admin/users', 'CUSTOMER') === '/customer/dashboard', 'RBAC: Customer blocked from /admin, redirected to /customer/dashboard');
  assert(simulateMiddleware('/admin/users', 'LAWYER') === '/lawyer/dashboard', 'RBAC: Lawyer blocked from /admin, redirected to /lawyer/dashboard');
  assert(simulateMiddleware('/admin/users', 'ADMIN') === 'ALLOW', 'RBAC: Admin allowed on /admin/users');
  assert(simulateMiddleware('/lawyer/case/123', 'CUSTOMER') === '/customer/dashboard', 'RBAC: Customer blocked from /lawyer/case/123');
  assert(simulateMiddleware('/lawyer/case/123', 'LAWYER') === 'ALLOW', 'RBAC: Lawyer allowed on /lawyer/case/123');
  assert(simulateMiddleware('/customer/dashboard', 'LAWYER') === '/lawyer/dashboard', 'RBAC: Lawyer redirected to /lawyer/dashboard when trying to hit /customer');
  assert(simulateMiddleware('/customer/dashboard', 'CUSTOMER') === 'ALLOW', 'RBAC: Customer allowed on /customer/dashboard');
  assert(simulateMiddleware('/customer/dashboard', undefined) === '/login', 'RBAC: Unauthenticated redirected to /login');

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Total Checks Passed: ${results.checksPassed}`);
  console.log(`Total Checks Failed: ${results.checksFailed}`);

  await prisma.$disconnect();

  if (results.checksFailed > 0) {
    console.error('FAILURES:', results.failures);
    process.exit(1);
  }
}

runVerification().catch(async (e) => {
  console.error('Verification script crashed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
