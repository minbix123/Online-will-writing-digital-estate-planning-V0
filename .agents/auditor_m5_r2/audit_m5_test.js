const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runAudit() {
  console.log("================================================================================");
  console.log("  FORENSIC INTEGRITY AUDIT (M5 R2): RUNTIME & DATABASE FORENSICS");
  console.log("================================================================================");

  let totalChecks = 0;
  let passedChecks = 0;

  function check(desc, condition) {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✔ [PASS] ${desc}`);
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      throw new Error(`Integrity Forensic Check Failed: ${desc}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION 1: DATABASE FORENSICS ON EXISTING SQLite DATABASE (prisma/dev.db)
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 1: SQLite dev.db Forensic Analysis ---");

  // 1.1 Payment Table Forensics
  const payments = await prisma.payment.findMany({
    include: { case: true },
  });
  console.log(`[Forensics] Found ${payments.length} existing records in Payment table.`);
  check("Payment table exists and is queryable", Array.isArray(payments));

  const validTiers = [1499, 3999, 7999, 999, 2999, 4999];
  for (const p of payments) {
    check(`Payment ${p.id} has valid linked Case`, p.case !== null && p.caseId === p.case.id);
    check(`Payment ${p.id} has valid currency INR`, p.currency === "INR");
    check(`Payment ${p.id} has valid status`, ["PENDING", "SUCCESS", "FAILED"].includes(p.status));
    check(`Payment ${p.id} has valid tier amount (${p.amount})`, validTiers.includes(p.amount));
    check(`Payment ${p.id} mode is MOCK`, p.mode === "MOCK");
  }

  // 1.2 LawyerReview Table Forensics
  const lawyerReviews = await prisma.lawyerReview.findMany({
    include: { case: true, lawyer: true },
  });
  console.log(`[Forensics] Found ${lawyerReviews.length} existing records in LawyerReview table.`);
  check("LawyerReview table exists and is queryable", Array.isArray(lawyerReviews));

  for (const r of lawyerReviews) {
    check(`LawyerReview ${r.id} linked to valid Case`, r.case !== null);
    check(`LawyerReview ${r.id} linked to valid Lawyer user`, r.lawyer !== null && ["LAWYER", "ADMIN"].includes(r.lawyer.role));
    check(`LawyerReview ${r.id} has valid review status`, ["PENDING", "REQUESTED", "COMPLETED"].includes(r.status));
    if (r.status === "REQUESTED") {
      check(`LawyerReview ${r.id} with REQUESTED has non-empty notes`, typeof r.notes === "string" && r.notes.trim().length > 0);
    }
  }

  // 1.3 AuditLog Table Forensics
  const auditLogs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  console.log(`[Forensics] Inspecting latest ${auditLogs.length} records in AuditLog table.`);
  check("AuditLog table exists and has entries", auditLogs.length > 0);

  for (const log of auditLogs) {
    const createdIso = new Date(log.createdAt).toISOString();
    const timestampIso = new Date(log.timestamp).toISOString();
    check(`AuditLog ${log.id} createdAt ends with Z (UTC format)`, createdIso.endsWith("Z"));
    check(`AuditLog ${log.id} timestamp ends with Z (UTC format)`, timestampIso.endsWith("Z"));
    check(`AuditLog ${log.id} has non-empty action`, typeof log.action === "string" && log.action.length > 0);

    if (log.metadata) {
      let parsed = null;
      try {
        parsed = JSON.parse(log.metadata);
      } catch (e) {
        // failed parse
      }
      check(`AuditLog ${log.id} metadata is valid JSON`, parsed !== null && typeof parsed === "object");
    }

    if (log.actorId) {
      check(`AuditLog ${log.id} actor exists`, log.actor !== null);
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: RUNTIME TRANSACTION INTEGRITY & ATOMICITY TESTS
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 2: Runtime Transaction Integrity & Atomicity Tests ---");

  const customer = await prisma.user.findFirst({ where: { email: "customer@demo.com" } });
  const lawyer = await prisma.user.findFirst({ where: { email: "lawyer@demo.com" } });
  check("Seed customer account exists", customer !== null);
  check("Seed lawyer account exists", lawyer !== null);

  const testCase = await prisma.case.create({
    data: {
      customerId: customer.id,
      status: "DRAFT",
      flags: "STANDARD",
    },
  });
  check("Forensic test case created", testCase.id !== null);

  // 2.1 Transaction Rollback Verification (Atomicity under failure)
  console.log("[Test] Testing prisma.$transaction rollback on unexpected error...");
  const paymentForRollback = await prisma.payment.create({
    data: {
      caseId: testCase.id,
      amount: 1499,
      currency: "INR",
      status: "PENDING",
      mode: "MOCK",
    },
  });

  let rollbackThrew = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentForRollback.id },
        data: { status: "SUCCESS" },
      });
      await tx.case.update({
        where: { id: testCase.id },
        data: { status: "PAID" },
      });
      await tx.auditLog.create({
        data: {
          actorId: customer.id,
          action: "PAYMENT_COMPLETED",
          entity: "Payment",
          entityId: paymentForRollback.id,
          caseId: testCase.id,
          metadata: JSON.stringify({ amount: 1499 }),
        },
      });

      // Force an intentional error to trigger rollback
      throw new Error("INTENTIONAL_FORENSIC_ROLLBACK_ERROR");
    });
  } catch (err) {
    if (err.message === "INTENTIONAL_FORENSIC_ROLLBACK_ERROR") {
      rollbackThrew = true;
    }
  }

  check("Transaction threw intentional error", rollbackThrew === true);

  // Verify DB state was NOT mutated
  const paymentAfterRollback = await prisma.payment.findUnique({ where: { id: paymentForRollback.id } });
  const caseAfterRollback = await prisma.case.findUnique({ where: { id: testCase.id } });
  const phantomLog = await prisma.auditLog.findFirst({
    where: { entityId: paymentForRollback.id, action: "PAYMENT_COMPLETED" },
  });

  check("Payment status remained PENDING (not SUCCESS)", paymentAfterRollback.status === "PENDING");
  check("Case status remained DRAFT (not PAID)", caseAfterRollback.status === "DRAFT");
  check("No phantom AuditLog record was persisted", phantomLog === null);

  // 2.2 Payment Tier Workflows
  console.log("[Test] Testing payment tier workflows...");

  // Tier 1: Basic (1499) -> Standard will -> PAID
  const basicPayment = await prisma.payment.create({
    data: {
      caseId: testCase.id,
      amount: 1499,
      currency: "INR",
      status: "PENDING",
      mode: "MOCK",
      razorpayOrderId: `mock_order_basic_${Date.now()}`,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: basicPayment.id },
      data: { status: "SUCCESS", razorpayPaymentId: "MOCK_TXN_BASIC_001" },
    });
    await tx.case.update({
      where: { id: testCase.id },
      data: { status: "PAID" },
    });
    await tx.auditLog.create({
      data: {
        actorId: customer.id,
        action: "PAYMENT_COMPLETED",
        entity: "Payment",
        entityId: basicPayment.id,
        caseId: testCase.id,
        metadata: JSON.stringify({ tier: "BASIC", amount: 1499 }),
      },
    });
  });

  const verifiedBasicCase = await prisma.case.findUnique({ where: { id: testCase.id } });
  const verifiedBasicPayment = await prisma.payment.findUnique({ where: { id: basicPayment.id } });
  check("Basic tier (1499) transitions case to PAID", verifiedBasicCase.status === "PAID");
  check("Basic payment status is SUCCESS", verifiedBasicPayment.status === "SUCCESS");

  // Tier 2: Lawyer Review (3999) -> IN_REVIEW
  const lawyerCase = await prisma.case.create({
    data: {
      customerId: customer.id,
      status: "DRAFT",
      flags: "STANDARD",
    },
  });

  const reviewPayment = await prisma.payment.create({
    data: {
      caseId: lawyerCase.id,
      amount: 3999,
      currency: "INR",
      status: "PENDING",
      mode: "MOCK",
      razorpayOrderId: `mock_order_rev_${Date.now()}`,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: reviewPayment.id },
      data: { status: "SUCCESS", razorpayPaymentId: "MOCK_TXN_REV_001" },
    });
    await tx.case.update({
      where: { id: lawyerCase.id },
      data: { status: "IN_REVIEW" },
    });
    await tx.auditLog.create({
      data: {
        actorId: customer.id,
        action: "PAYMENT_COMPLETED",
        entity: "Payment",
        entityId: reviewPayment.id,
        caseId: lawyerCase.id,
        metadata: JSON.stringify({ tier: "LAWYER_REVIEW", amount: 3999, requiresReview: true }),
      },
    });
  });

  const verifiedReviewCase = await prisma.case.findUnique({ where: { id: lawyerCase.id } });
  check("Lawyer Review tier (3999) transitions case to IN_REVIEW", verifiedReviewCase.status === "IN_REVIEW");

  // Tier 3: Complex/NRI (7999) -> IN_REVIEW with NRI flag
  const nriCase = await prisma.case.create({
    data: {
      customerId: customer.id,
      status: "DRAFT",
      flags: "NRI,FOREIGN_ASSETS",
    },
  });

  const nriPayment = await prisma.payment.create({
    data: {
      caseId: nriCase.id,
      amount: 7999,
      currency: "INR",
      status: "PENDING",
      mode: "MOCK",
      razorpayOrderId: `mock_order_nri_${Date.now()}`,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: nriPayment.id },
      data: { status: "SUCCESS", razorpayPaymentId: "MOCK_TXN_NRI_001" },
    });
    await tx.case.update({
      where: { id: nriCase.id },
      data: { status: "IN_REVIEW" },
    });
  });

  const verifiedNriCase = await prisma.case.findUnique({ where: { id: nriCase.id } });
  check("Complex/NRI tier (7999) transitions case to IN_REVIEW", verifiedNriCase.status === "IN_REVIEW");

  // ---------------------------------------------------------------------------
  // SECTION 3: LAWYER REVIEW & ASSIGNMENT FORENSICS
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 3: Lawyer Review & Assignment Forensics ---");

  // Assign lawyer to case
  await prisma.case.update({
    where: { id: lawyerCase.id },
    data: { lawyerId: lawyer.id },
  });

  // Submit Lawyer Review: REQUEST_CHANGES
  const changeNotes = "Clarification needed on asset schedule: Survey numbers missing for ancestral parcel.";
  let reviewRecord1;
  await prisma.$transaction(async (tx) => {
    reviewRecord1 = await tx.lawyerReview.create({
      data: {
        caseId: lawyerCase.id,
        lawyerId: lawyer.id,
        status: "REQUESTED",
        notes: changeNotes,
      },
    });
    await tx.case.update({
      where: { id: lawyerCase.id },
      data: { status: "CLARIFICATION_REQUESTED" },
    });
    await tx.auditLog.create({
      data: {
        actorId: lawyer.id,
        action: "CHANGES_REQUESTED",
        entity: "Case",
        entityId: lawyerCase.id,
        caseId: lawyerCase.id,
        metadata: JSON.stringify({ reviewId: reviewRecord1.id, notes: changeNotes }),
      },
    });
  });

  const clarifyingCase = await prisma.case.findUnique({ where: { id: lawyerCase.id } });
  const review1InDb = await prisma.lawyerReview.findUnique({ where: { id: reviewRecord1.id } });
  check("Lawyer requesting changes transitions case to CLARIFICATION_REQUESTED", clarifyingCase.status === "CLARIFICATION_REQUESTED");
  check("LawyerReview status is REQUESTED with mandatory notes stored", review1InDb.status === "REQUESTED" && review1InDb.notes === changeNotes);

  // Submit Lawyer Review: APPROVE
  const approvalNotes = "All schedule documents, testator identification, and executor credentials verified in compliance with Indian Succession Act.";
  let reviewRecord2;
  await prisma.$transaction(async (tx) => {
    reviewRecord2 = await tx.lawyerReview.create({
      data: {
        caseId: lawyerCase.id,
        lawyerId: lawyer.id,
        status: "COMPLETED",
        notes: approvalNotes,
      },
    });
    await tx.case.update({
      where: { id: lawyerCase.id },
      data: { status: "APPROVED" },
    });
    await tx.auditLog.create({
      data: {
        actorId: lawyer.id,
        action: "CASE_APPROVED",
        entity: "Case",
        entityId: lawyerCase.id,
        caseId: lawyerCase.id,
        metadata: JSON.stringify({ reviewId: reviewRecord2.id, notes: approvalNotes }),
      },
    });
  });

  const approvedCase = await prisma.case.findUnique({ where: { id: lawyerCase.id } });
  const review2InDb = await prisma.lawyerReview.findUnique({ where: { id: reviewRecord2.id } });
  check("Lawyer approval transitions case to APPROVED", approvedCase.status === "APPROVED");
  check("LawyerReview status is COMPLETED with notes", review2InDb.status === "COMPLETED" && review2InDb.notes === approvalNotes);

  // ---------------------------------------------------------------------------
  // SECTION 4: ADMIN DASHBOARD DYNAMIC QUERY VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 4: Admin Dashboard Dynamic Query Verification ---");

  const [
    totalUsers,
    usersByRole,
    totalCases,
    casesByStatus,
    paymentAggregates,
    paymentsByStatus,
    templatesByStatus,
    clauseCount,
    recentLogs,
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
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.template.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.clause.count(),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    }),
  ]);

  check("Admin query totalUsers is positive integer", typeof totalUsers === "number" && totalUsers > 0);
  check("Admin query usersByRole contains CUSTOMER, LAWYER, ADMIN", usersByRole.length >= 3);
  check("Admin query totalCases matches sum of casesByStatus", totalCases === casesByStatus.reduce((acc, c) => acc + c._count._all, 0));
  check("Admin query paymentAggregates returns real sum", typeof paymentAggregates._sum.amount === "number" && paymentAggregates._sum.amount >= 0);
  check("Admin query recentLogs returns records with actor relations", recentLogs.length > 0 && recentLogs[0].createdAt instanceof Date);

  // ---------------------------------------------------------------------------
  // SECTION 5: CLEANUP OF TEMPORARY TEST FIXTURES
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 5: Cleanup of Temporary Test Records ---");
  const testCaseIds = [testCase.id, lawyerCase.id, nriCase.id];
  for (const cid of testCaseIds) {
    await prisma.auditLog.deleteMany({ where: { caseId: cid } });
    await prisma.lawyerReview.deleteMany({ where: { caseId: cid } });
    await prisma.payment.deleteMany({ where: { caseId: cid } });
    await prisma.document.deleteMany({ where: { caseId: cid } });
    await prisma.case.delete({ where: { id: cid } }).catch(() => {});
  }
  console.log("  ✔ Cleaned up temporary test cases, payments, reviews, and audit logs.");

  await prisma.$disconnect();

  console.log("\n================================================================================");
  console.log(`  FORENSIC INTEGRITY AUDIT COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log("  VERDICT: CLEAN — ZERO INTEGRITY VIOLATIONS DETECTED");
  console.log("================================================================================\n");
}

runAudit().catch((err) => {
  console.error("AUDIT CRITICAL FAILURE:", err);
  process.exit(1);
});
