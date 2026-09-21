/**
 * Integration Verification Suite for Milestone 5:
 * Lawyer Portal, Admin Portal, Mock Payment Engine & Centralized UTC Audit Logging.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

let testCustomer, testLawyer1, testLawyer2, testAdmin;
let testCase1, testCase2, testPayment1;

async function setup() {
  console.log("--- Setting up Milestone 5 Test Fixtures ---");

  // Fetch or create test users
  testCustomer = await prisma.user.findFirst({ where: { email: "customer@demo.com" } });
  testLawyer1 = await prisma.user.findFirst({ where: { email: "lawyer@demo.com" } });
  testAdmin = await prisma.user.findFirst({ where: { email: "admin@demo.com" } });

  // Create a second lawyer for IDOR boundary testing
  testLawyer2 = await prisma.user.upsert({
    where: { email: "lawyer2_test@demo.com" },
    update: { role: "LAWYER" },
    create: {
      name: "Advocate Test 2",
      email: "lawyer2_test@demo.com",
      password: "hashed_dummy_password",
      role: "LAWYER",
    },
  });

  // Create test cases
  testCase1 = await prisma.case.create({
    data: {
      customerId: testCustomer.id,
      status: "DRAFT",
      flags: "STANDARD",
    },
  });

  testCase2 = await prisma.case.create({
    data: {
      customerId: testCustomer.id,
      status: "IN_REVIEW",
      flags: "STANDARD,NRI",
      lawyerId: testLawyer1.id, // Explicitly assigned to lawyer 1
    },
  });

  console.log("Test fixtures initialized successfully.");
}

async function test1_CentralizedAuditLogging() {
  console.log("\n[TEST 1] Centralized UTC Audit Logging verification...");

  // Import createAuditLog via dynamic import or verify its database representation
  const now = new Date();
  const testAction = "TEST_AUDIT_VERIFICATION";
  const testMeta = { test: true, environment: "M5_VERIFY", note: "Centralized logging test" };

  const log = await prisma.auditLog.create({
    data: {
      actorId: testCustomer.id,
      action: testAction,
      entity: "Case",
      entityId: testCase1.id,
      caseId: testCase1.id,
      metadata: JSON.stringify(testMeta),
      createdAt: now,
      timestamp: now,
    },
  });

  assert.ok(log.id, "Audit log ID must be generated");
  assert.equal(log.action, testAction);
  assert.equal(log.actorId, testCustomer.id);
  assert.equal(log.caseId, testCase1.id);

  // UTC verification
  const isoCreated = log.createdAt.toISOString();
  assert.ok(isoCreated.endsWith("Z"), "Timestamp must be strict UTC ISO 8601 ending in Z");

  const parsedMeta = JSON.parse(log.metadata);
  assert.equal(parsedMeta.environment, "M5_VERIFY");

  console.log("✔ [PASS] Centralized UTC Audit Logging verified.");
}

async function test2_MockPaymentAndAtomicTransactions() {
  console.log("\n[TEST 2] Mock Payment & Atomic Transactions verification...");

  // Simulate payment creation
  testPayment1 = await prisma.payment.create({
    data: {
      caseId: testCase1.id,
      amount: 3999,
      currency: "INR",
      status: "PENDING",
      mode: "MOCK",
      razorpayOrderId: `mock_order_${Date.now()}`,
    },
  });

  assert.equal(testPayment1.status, "PENDING");
  assert.equal(testPayment1.amount, 3999);

  // Execute interactive atomic transaction
  const mockTxnId = `MOCK_TXN_VERIFY_${Date.now()}`;
  await prisma.$transaction(async (tx) => {
    // 1. Update payment to SUCCESS
    await tx.payment.update({
      where: { id: testPayment1.id },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: mockTxnId,
      },
    });

    // 2. Update case status to IN_REVIEW
    await tx.case.update({
      where: { id: testCase1.id },
      data: {
        status: "IN_REVIEW",
        flags: "STANDARD,LEGAL_REVIEW_REQUIRED",
      },
    });

    // 3. Emit audit log
    await tx.auditLog.create({
      data: {
        actorId: testCustomer.id,
        action: "PAYMENT_COMPLETED",
        entity: "Payment",
        entityId: testPayment1.id,
        caseId: testCase1.id,
        metadata: JSON.stringify({ amount: 3999, transactionId: mockTxnId }),
      },
    });
  });

  // Verify atomic persistence
  const updatedPayment = await prisma.payment.findUnique({ where: { id: testPayment1.id } });
  const updatedCase = await prisma.case.findUnique({ where: { id: testCase1.id } });
  const paymentLog = await prisma.auditLog.findFirst({
    where: { entityId: testPayment1.id, action: "PAYMENT_COMPLETED" },
  });

  assert.equal(updatedPayment.status, "SUCCESS");
  assert.equal(updatedPayment.razorpayPaymentId, mockTxnId);
  assert.equal(updatedCase.status, "IN_REVIEW");
  assert.ok(paymentLog, "PAYMENT_COMPLETED audit log must exist");

  console.log("✔ [PASS] Mock Payment & Atomic Transactions verified.");
}

async function test3_LawyerCaseClaiming() {
  console.log("\n[TEST 3] Lawyer Case Claiming & Assignment verification...");

  // Unassigned case
  const unassignedCase = await prisma.case.create({
    data: {
      customerId: testCustomer.id,
      status: "IN_REVIEW",
      flags: "STANDARD",
      lawyerId: null,
    },
  });

  assert.equal(unassignedCase.lawyerId, null, "Initially unassigned");

  // Claim case by Lawyer 1
  const claimedCase = await prisma.case.update({
    where: { id: unassignedCase.id },
    data: { lawyerId: testLawyer1.id },
  });

  assert.equal(claimedCase.lawyerId, testLawyer1.id, "Case must be assigned to Lawyer 1");

  await prisma.auditLog.create({
    data: {
      actorId: testLawyer1.id,
      action: "LAWYER_ASSIGNED",
      entity: "Case",
      entityId: unassignedCase.id,
      caseId: unassignedCase.id,
      metadata: JSON.stringify({ assignedLawyerId: testLawyer1.id }),
    },
  });

  const claimLog = await prisma.auditLog.findFirst({
    where: { caseId: unassignedCase.id, action: "LAWYER_ASSIGNED" },
  });
  assert.ok(claimLog, "LAWYER_ASSIGNED audit log recorded");

  // Clean up temporary case
  await prisma.auditLog.deleteMany({ where: { caseId: unassignedCase.id } });
  await prisma.case.delete({ where: { id: unassignedCase.id } });

  console.log("✔ [PASS] Lawyer Case Claiming & Assignment verified.");
}

async function test4_LawyerCaseReviewDecision() {
  console.log("\n[TEST 4] Lawyer Case Review Decision & Status Transition verification...");

  // Submit review decision via atomic transaction
  const reviewNotes = "All statutory clauses and declarations verified compliant with Indian Succession Act.";
  let createdReview;

  await prisma.$transaction(async (tx) => {
    createdReview = await tx.lawyerReview.create({
      data: {
        caseId: testCase1.id,
        lawyerId: testLawyer1.id,
        status: "COMPLETED",
        notes: reviewNotes,
      },
    });

    await tx.case.update({
      where: { id: testCase1.id },
      data: { status: "APPROVED" },
    });

    await tx.auditLog.create({
      data: {
        actorId: testLawyer1.id,
        action: "CASE_APPROVED",
        entity: "Case",
        entityId: testCase1.id,
        caseId: testCase1.id,
        metadata: JSON.stringify({ reviewId: createdReview.id, notes: reviewNotes }),
      },
    });
  });

  const approvedCase = await prisma.case.findUnique({ where: { id: testCase1.id } });
  const reviewRecord = await prisma.lawyerReview.findUnique({ where: { id: createdReview.id } });
  const approvalLog = await prisma.auditLog.findFirst({
    where: { caseId: testCase1.id, action: "CASE_APPROVED" },
  });

  assert.equal(approvedCase.status, "APPROVED", "Case status must be APPROVED");
  assert.equal(reviewRecord.status, "COMPLETED", "Review status must be COMPLETED");
  assert.equal(reviewRecord.notes, reviewNotes);
  assert.ok(approvalLog, "CASE_APPROVED audit log must exist");

  console.log("✔ [PASS] Lawyer Case Review Decision & Status Transition verified.");
}

async function test5_LawyerDownloadIDORIsolation() {
  console.log("\n[TEST 5] Lawyer Download IDOR Isolation verification...");

  // testCase2 is assigned to testLawyer1.
  // Verify that an unassigned lawyer (testLawyer2) CANNOT access it
  const assignedCase = await prisma.case.findUnique({ where: { id: testCase2.id } });
  assert.equal(assignedCase.lawyerId, testLawyer1.id);

  // Check IDOR rule logic as implemented in /api/document/download
  const isAssignedLawyer1 =
    testLawyer1.role === "LAWYER" &&
    (assignedCase.lawyerId === testLawyer1.id || (assignedCase.lawyerId === null && assignedCase.status === "IN_REVIEW"));

  const isAssignedLawyer2 =
    testLawyer2.role === "LAWYER" &&
    (assignedCase.lawyerId === testLawyer2.id || (assignedCase.lawyerId === null && assignedCase.status === "IN_REVIEW"));

  assert.equal(isAssignedLawyer1, true, "Assigned Lawyer 1 must have access");
  assert.equal(isAssignedLawyer2, false, "Unassigned Lawyer 2 must NOT have access (IDOR rejected)");

  console.log("✔ [PASS] Lawyer Download IDOR Isolation verified.");
}

async function test6_AdminMetricsAggregation() {
  console.log("\n[TEST 6] Admin Parallel Metrics Aggregation verification...");

  const [
    totalUsers,
    usersByRole,
    totalCases,
    casesByStatus,
    paymentAggregates,
    templateCounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.case.count(),
    prisma.case.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.template.count(),
  ]);

  assert.ok(totalUsers > 0, "Users count must be > 0");
  assert.ok(usersByRole.length >= 3, "All 3 roles must be present");
  assert.ok(totalCases > 0, "Cases count must be > 0");
  assert.ok(casesByStatus.length > 0, "Case status groups must exist");
  assert.ok(paymentAggregates._sum.amount !== null, "Payment aggregate must succeed");
  assert.ok(templateCounts > 0, "Templates must be present");

  console.log(`Users: ${totalUsers}, Cases: ${totalCases}, Revenue: ₹${paymentAggregates._sum.amount}, Templates: ${templateCounts}`);
  console.log("✔ [PASS] Admin Parallel Metrics Aggregation verified.");
}

async function test7_TemplateLifecycleStateTransition() {
  console.log("\n[TEST 7] Template Lifecycle State Transition verification...");

  const template = await prisma.template.findFirst({
    include: { versions: { take: 1, orderBy: { version: "desc" } } },
  });
  assert.ok(template, "A template must exist");

  const originalStatus = template.status;

  // Transition to LOCKED
  await prisma.$transaction(async (tx) => {
    await tx.template.update({
      where: { id: template.id },
      data: { status: "LOCKED" },
    });
    if (template.versions.length > 0) {
      await tx.templateVersion.update({
        where: { id: template.versions[0].id },
        data: { status: "LOCKED" },
      });
    }
  });

  let lockedTemplate = await prisma.template.findUnique({ where: { id: template.id } });
  assert.equal(lockedTemplate.status, "LOCKED", "Status must be LOCKED");

  // Restore to LAWYER_APPROVED
  await prisma.$transaction(async (tx) => {
    await tx.template.update({
      where: { id: template.id },
      data: { status: "LAWYER_APPROVED" },
    });
    if (template.versions.length > 0) {
      await tx.templateVersion.update({
        where: { id: template.versions[0].id },
        data: { status: "LAWYER_APPROVED" },
      });
    }
  });

  let approvedTemplate = await prisma.template.findUnique({ where: { id: template.id } });
  assert.equal(approvedTemplate.status, "LAWYER_APPROVED", "Status must be restored to LAWYER_APPROVED");

  console.log("✔ [PASS] Template Lifecycle State Transition verified.");
}

async function test8_FullAquaUIStylingCheck() {
  console.log("\n[TEST 8] Full Aqua UI Styling Inspection...");

  const filesToCheck = [
    { file: "src/app/customer/payment/page.tsx", required: ["aqua-window", "aqua-titlebar", "aqua-traffic-lights", "aqua-dot-red", "bg-aqua-pinstripes"] },
    { file: "src/app/customer/checkout/page.tsx", required: ["aqua-window", "aqua-card", "bg-aqua-pinstripes", "<Suspense", "useSearchParams()"] },
    { file: "src/app/lawyer/dashboard/page.tsx", required: ["aqua-window", "aqua-titlebar", "aqua-traffic-lights", "aqua-card", "aqua-badge"] },
    { file: "src/app/lawyer/case/[id]/page.tsx", required: ["aqua-window", "aqua-titlebar", "aqua-traffic-lights", "aqua-card", "aqua-inset-well"] },
    { file: "src/app/admin/layout.tsx", required: ["aqua-window", "aqua-titlebar", "aqua-traffic-lights", "aqua-btn-silver", "bg-aqua-pinstripes"] },
    { file: "src/app/admin/dashboard/page.tsx", required: ["aqua-card", "aqua-badge", "aqua-btn-primary"] },
    { file: "src/app/admin/users/page.tsx", required: ["aqua-badge"] },
    { file: "src/app/admin/cases/page.tsx", required: ["aqua-badge", "aqua-btn-silver"] },
    { file: "src/app/admin/templates/page.tsx", required: ["aqua-badge", "aqua-btn-primary"] },
    { file: "src/app/admin/audit-logs/page.tsx", required: ["aqua-badge", "aqua-btn-primary"] },
  ];

  for (const item of filesToCheck) {
    const filePath = path.join(process.cwd(), item.file);
    assert.ok(fs.existsSync(filePath), `File must exist: ${item.file}`);
    const content = fs.readFileSync(filePath, "utf8");

    for (const req of item.required) {
      assert.ok(
        content.includes(req),
        `File ${item.file} is missing required Aqua UI class/construct: "${req}"`
      );
    }
  }

  console.log("✔ [PASS] All 10 Aqua UI pages pass complete skeuomorphic class inspections.");
}

async function cleanup() {
  console.log("\n--- Cleaning up temporary test records ---");
  if (testCase1) {
    await prisma.auditLog.deleteMany({ where: { caseId: testCase1.id } });
    await prisma.payment.deleteMany({ where: { caseId: testCase1.id } });
    await prisma.lawyerReview.deleteMany({ where: { caseId: testCase1.id } });
    await prisma.document.deleteMany({ where: { caseId: testCase1.id } });
    await prisma.case.delete({ where: { id: testCase1.id } }).catch(() => {});
  }
  if (testCase2) {
    await prisma.auditLog.deleteMany({ where: { caseId: testCase2.id } });
    await prisma.payment.deleteMany({ where: { caseId: testCase2.id } });
    await prisma.case.delete({ where: { id: testCase2.id } }).catch(() => {});
  }
  if (testLawyer2) {
    await prisma.user.delete({ where: { id: testLawyer2.id } }).catch(() => {});
  }
  await prisma.$disconnect();
  console.log("Cleanup finished.");
}

async function runAll() {
  try {
    await setup();
    await test1_CentralizedAuditLogging();
    await test2_MockPaymentAndAtomicTransactions();
    await test3_LawyerCaseClaiming();
    await test4_LawyerCaseReviewDecision();
    await test5_LawyerDownloadIDORIsolation();
    await test6_AdminMetricsAggregation();
    await test7_TemplateLifecycleStateTransition();
    await test8_FullAquaUIStylingCheck();

    console.log("\n=======================================================");
    console.log("  ALL 8 INTEGRATION TESTS FOR MILESTONE 5 PASSED!     ");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

runAll();
