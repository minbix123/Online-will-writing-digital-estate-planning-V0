/**
 * ========================================================================
 * CHALLENGER 1 (R2): EMPIRICAL ADVERSARIAL STRESS TEST SUITE (MILESTONE 5)
 * ========================================================================
 * Scope & Mandate:
 * 1. Mock Payment Atomic Transactions:
 *    - Concurrency stress: 20 concurrent payment confirmations; verify zero duplicate paid cases and zero orphaned records.
 *    - Rollback verification: simulate error inside transaction; verify complete rollback of Payment, Case, and AuditLog.
 *    - Tier pricing amounts: verify Basic (₹1,499), Lawyer Review (₹3,999), and Complex/NRI (₹7,999).
 * 2. Centralized UTC Audit Logging Tamper-Resistance:
 *    - Verify all audit logs in dev.db have valid UTC ISO-8601 timestamps ending in 'Z'.
 *    - Verify JSON metadata parses cleanly across all standard actions.
 *    - Concurrent logging stress: 30 parallel audit log calls -> 0 dropped logs, 0 lock errors.
 */

const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Standard SQLite test configuration with single-connection queue and extended socket timeout
const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}?connection_limit=1&socket_timeout=60`
    }
  }
});

// Register singleton on globalThis to ensure @/lib/prisma reuses the connection pool
globalThis.prismaGlobal = prisma;

// Register ts-node and tsconfig paths for TypeScript module imports
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true
  }
});
const tsConfigPaths = require('tsconfig-paths');
tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, '../..'),
  paths: {
    '@/*': ['src/*']
  }
});

const { createAuditLog } = require('@/lib/audit');
const { PAYMENT_TIERS, resolvePlanAmount, resolveTierKey } = require('@/lib/payment');

// Tracking state
let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failures = [];

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    failures.push(message);
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  totalAssertions++;
  if (actual === expected) {
    passedAssertions++;
  } else {
    failedAssertions++;
    const detail = `${message} | Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`;
    failures.push(detail);
    console.error(`  ❌ [FAIL] ${detail}`);
  }
}

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// Fixture tracking for cleanup
const cleanupCaseIds = [];
const cleanupPaymentIds = [];
const cleanupAuditLogIds = [];

async function main() {
  console.log(`${colors.bold}${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  CHALLENGER 1 (R2): EMPIRICAL ADVERSARIAL STRESS TEST SUITE (MILESTONE 5)${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================================================${colors.reset}\n`);

  const startTime = Date.now();

  try {
    // 0. Get or verify base demo customer
    const demoCustomer = await prisma.user.findFirst({
      where: { email: 'customer@demo.com' }
    });
    assert(!!demoCustomer, 'Demo customer user must exist in dev.db');
    console.log(`Demo customer ID: ${demoCustomer?.id}`);

    // ========================================================================
    // SUITE 1: TIER PRICING INTEGRITY & MAPPING
    // ========================================================================
    console.log(`\n${colors.bold}▶ [SUITE 1] Tier Pricing Integrity & Amount Verification${colors.reset}`);
    await testSuite1_TierPricing();

    // ========================================================================
    // SUITE 2: ATOMIC TRANSACTION ROLLBACK INTEGRITY
    // ========================================================================
    console.log(`\n${colors.bold}▶ [SUITE 2] Atomic Transaction Rollback Integrity (Payment, Case, AuditLog)${colors.reset}`);
    await testSuite2_RollbackIntegrity(demoCustomer.id);

    // ========================================================================
    // SUITE 3: CONCURRENCY STRESS (20 PARALLEL PAYMENT CONFIRMATIONS)
    // ========================================================================
    console.log(`\n${colors.bold}▶ [SUITE 3] Concurrency Stress: 20 Parallel Payment Confirmations${colors.reset}`);
    await testSuite3_ConcurrencyStress20(demoCustomer.id);

    // ========================================================================
    // SUITE 4: ADVERSARIAL SINGLE-PAYMENT RACE CONDITION
    // ========================================================================
    console.log(`\n${colors.bold}▶ [SUITE 4] Adversarial Double-Confirmation Race Stress on Single Payment${colors.reset}`);
    await testSuite4_SinglePaymentRace(demoCustomer.id);

    // ========================================================================
    // SUITE 5: DATABASE-WIDE UTC ISO-8601 TIMESTAMP TAMPER-RESISTANCE
    // ========================================================================
    console.log(`\n${colors.bold}▶ [SUITE 5] Database-Wide UTC ISO-8601 Timestamp Verification (Ending in 'Z')${colors.reset}`);
    await testSuite5_UtcTimestampAudit();

    // ========================================================================
    // SUITE 6: METADATA PARSING INTEGRITY ACROSS STANDARD ACTIONS
    // ========================================================================
    console.log(`\n${colors.bold}▶ [SUITE 6] JSON Metadata Parsing Integrity Across Standard Actions & Edge Cases${colors.reset}`);
    await testSuite6_MetadataIntegrity(demoCustomer.id);

    // ========================================================================
    // SUITE 7: CONCURRENT AUDIT LOGGING STRESS (30 PARALLEL CALLS)
    // ========================================================================
    console.log(`\n${colors.bold}▶ [SUITE 7] Concurrent Logging Stress: 30 Parallel Audit Calls (0 Drops, 0 Locks)${colors.reset}`);
    await testSuite7_ConcurrentAuditStress(demoCustomer.id);

    // ========================================================================
    // SUITE 8: SIMULATED PAYMENT FAILURE ATOMICITY
    // ========================================================================
    console.log(`\n${colors.bold}▶ [SUITE 8] Simulated Payment Failure Atomicity & State Verification${colors.reset}`);
    await testSuite8_PaymentFailureAtomicity(demoCustomer.id);

  } catch (error) {
    console.error(`\n${colors.red}CRITICAL TEST SUITE ERROR:${colors.reset}`, error);
    assert(false, `Unexpected suite execution exception: ${error.message}`);
  } finally {
    // Teardown & cleanup temporary test fixtures
    console.log(`\n${colors.yellow}--- Cleaning up test fixtures ---${colors.reset}`);
    await performCleanup();
    await prisma.$disconnect();
  }

  const duration = Date.now() - startTime;
  console.log(`\n${colors.bold}========================================================================${colors.reset}`);
  console.log(`${colors.bold}  TEST EXECUTION SUMMARY${colors.reset}`);
  console.log(`========================================================================`);
  console.log(`  Total Assertions : ${totalAssertions}`);
  console.log(`  ${colors.green}Passed           : ${passedAssertions}${colors.reset}`);
  console.log(`  ${failedAssertions > 0 ? colors.red : colors.green}Failed           : ${failedAssertions}${colors.reset}`);
  console.log(`  Duration         : ${duration}ms`);

  if (failedAssertions > 0) {
    console.log(`\n${colors.red}Failed Assertions Summary:${colors.reset}`);
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
    console.log(`\n${colors.red}${colors.bold}VERDICT: REJECT (Milestone 5 has failing assertions)${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}VERDICT: APPROVE (All empirical assertions passed)${colors.reset}\n`);
    process.exit(0);
  }
}

// ----------------------------------------------------------------------------
// SUITE 1: Tier Pricing Verification
// ----------------------------------------------------------------------------
async function testSuite1_TierPricing() {
  // 1.1 Basic Will Tier: ₹1,499
  assertEqual(PAYMENT_TIERS.BASIC.price, 1499, 'PAYMENT_TIERS.BASIC price must be 1499');
  assertEqual(PAYMENT_TIERS.BASIC.currency, 'INR', 'PAYMENT_TIERS.BASIC currency must be INR');
  assertEqual(resolvePlanAmount('BASIC'), 1499, 'resolvePlanAmount("BASIC") must be 1499');
  assertEqual(resolvePlanAmount('basic'), 1499, 'resolvePlanAmount("basic") case-insensitive must be 1499');
  assertEqual(resolvePlanAmount('999'), 1499, 'resolvePlanAmount("999") legacy string must map to 1499');
  assertEqual(resolveTierKey(1499), 'BASIC', 'resolveTierKey(1499) must be BASIC');
  assertEqual(resolveTierKey('BASIC'), 'BASIC', 'resolveTierKey("BASIC") must be BASIC');

  // 1.2 Lawyer Review Tier: ₹3,999
  assertEqual(PAYMENT_TIERS.LAWYER_REVIEW.price, 3999, 'PAYMENT_TIERS.LAWYER_REVIEW price must be 3999');
  assertEqual(PAYMENT_TIERS.LAWYER_REVIEW.currency, 'INR', 'PAYMENT_TIERS.LAWYER_REVIEW currency must be INR');
  assertEqual(resolvePlanAmount('LAWYER_REVIEW'), 3999, 'resolvePlanAmount("LAWYER_REVIEW") must be 3999');
  assertEqual(resolvePlanAmount('lawyer_review'), 3999, 'resolvePlanAmount("lawyer_review") case-insensitive must be 3999');
  assertEqual(resolvePlanAmount('2999'), 3999, 'resolvePlanAmount("2999") legacy string must map to 3999');
  assertEqual(resolveTierKey(3999), 'LAWYER_REVIEW', 'resolveTierKey(3999) must be LAWYER_REVIEW');
  assertEqual(resolveTierKey('LAWYER_REVIEW'), 'LAWYER_REVIEW', 'resolveTierKey("LAWYER_REVIEW") must be LAWYER_REVIEW');

  // 1.3 Complex / NRI Tier: ₹7,999
  assertEqual(PAYMENT_TIERS.COMPLEX_NRI.price, 7999, 'PAYMENT_TIERS.COMPLEX_NRI price must be 7999');
  assertEqual(PAYMENT_TIERS.COMPLEX_NRI.currency, 'INR', 'PAYMENT_TIERS.COMPLEX_NRI currency must be INR');
  assertEqual(resolvePlanAmount('COMPLEX_NRI'), 7999, 'resolvePlanAmount("COMPLEX_NRI") must be 7999');
  assertEqual(resolvePlanAmount('NRI'), 7999, 'resolvePlanAmount("NRI") alias must be 7999');
  assertEqual(resolvePlanAmount('COMPLEX'), 7999, 'resolvePlanAmount("COMPLEX") alias must be 7999');
  assertEqual(resolvePlanAmount('4999'), 7999, 'resolvePlanAmount("4999") legacy string must map to 7999');
  assertEqual(resolveTierKey(7999), 'COMPLEX_NRI', 'resolveTierKey(7999) must be COMPLEX_NRI');
  assertEqual(resolveTierKey('COMPLEX_NRI'), 'COMPLEX_NRI', 'resolveTierKey("COMPLEX_NRI") must be COMPLEX_NRI');

  // 1.4 Numeric & Default Fallback Handling
  assertEqual(resolvePlanAmount(4999), 4999, 'Numeric passthrough must preserve 4999');
  assertEqual(resolvePlanAmount(1499), 1499, 'Numeric passthrough must preserve 1499');
  assertEqual(resolvePlanAmount('UNKNOWN_PLAN'), 1499, 'Unknown plan string must fallback to Basic (1499)');
  assertEqual(resolvePlanAmount(''), 1499, 'Empty plan string must fallback to Basic (1499)');
  assertEqual(resolvePlanAmount(null), 1499, 'Null plan must fallback to Basic (1499)');

  console.log(`  ✔ [PASS] All tier pricing amounts and mappings verified (Basic ₹1499, Review ₹3999, NRI ₹7999).`);
}

// ----------------------------------------------------------------------------
// SUITE 2: Atomic Rollback Integrity
// ----------------------------------------------------------------------------
async function testSuite2_RollbackIntegrity(customerId) {
  // Test 2.1: Simulated Application Failure inside transaction
  const rollbackCase = await prisma.case.create({
    data: {
      customerId,
      status: 'DRAFT',
      flags: 'STANDARD'
    }
  });
  cleanupCaseIds.push(rollbackCase.id);

  const rollbackPayment = await prisma.payment.create({
    data: {
      caseId: rollbackCase.id,
      amount: 1499,
      currency: 'INR',
      status: 'PENDING',
      mode: 'MOCK',
      razorpayOrderId: `mock_order_rollback_${Date.now()}`
    }
  });
  cleanupPaymentIds.push(rollbackPayment.id);

  let caughtAppError = null;
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Mutate payment
      await tx.payment.update({
        where: { id: rollbackPayment.id },
        data: { status: 'SUCCESS', razorpayPaymentId: 'MOCK_TXN_SHOULD_ROLLBACK' }
      });

      // 2. Mutate case
      await tx.case.update({
        where: { id: rollbackCase.id },
        data: { status: 'PAID' }
      });

      // 3. Centralized audit log within tx
      await createAuditLog({
        actorId: customerId,
        action: 'PAYMENT_COMPLETED',
        entity: 'Payment',
        entityId: rollbackPayment.id,
        caseId: rollbackCase.id,
        details: { test: 'deliberate_rollback' },
        tx
      });

      // 4. Deliberate simulated exception
      throw new Error('EMPIRICAL_SIMULATED_TRANSACTION_FAILURE');
    }, { maxWait: 60000, timeout: 60000 });
  } catch (err) {
    caughtAppError = err;
  }

  assert(!!caughtAppError, 'Transaction must throw and abort when exception occurs inside boundary');
  assert(
    caughtAppError?.message?.includes('EMPIRICAL_SIMULATED_TRANSACTION_FAILURE'),
    'Caught error must match the thrown simulated failure'
  );

  // Inspect database state: verify 100% rollback of Payment, Case, and AuditLog
  const persistedPayment = await prisma.payment.findUnique({ where: { id: rollbackPayment.id } });
  assertEqual(persistedPayment.status, 'PENDING', 'Payment status must remain PENDING after rollback');
  assertEqual(persistedPayment.razorpayPaymentId, null, 'Payment razorpayPaymentId must remain null after rollback');

  const persistedCase = await prisma.case.findUnique({ where: { id: rollbackCase.id } });
  assertEqual(persistedCase.status, 'DRAFT', 'Case status must remain DRAFT after rollback');

  const persistedAuditLog = await prisma.auditLog.findFirst({
    where: { entityId: rollbackPayment.id, action: 'PAYMENT_COMPLETED' }
  });
  assertEqual(persistedAuditLog, null, 'AuditLog must be rolled back completely with zero orphaned log entries');

  // Test 2.2: Simulated Database Constraint Violation inside transaction
  let caughtDbError = null;
  try {
    await prisma.$transaction(async (tx) => {
      // Create second payment
      await tx.payment.create({
        data: {
          caseId: rollbackCase.id,
          amount: 3999,
          status: 'SUCCESS',
          mode: 'MOCK'
        }
      });

      await tx.case.update({
        where: { id: rollbackCase.id },
        data: { status: 'IN_REVIEW' }
      });

      // Deliberate foreign key violation: invalid caseId on auditLog
      await tx.auditLog.create({
        data: {
          caseId: 'invalid-non-existent-case-uuid-xyz',
          action: 'PAYMENT_COMPLETED'
        }
      });
    }, { maxWait: 60000, timeout: 60000 });
  } catch (err) {
    caughtDbError = err;
  }

  assert(!!caughtDbError, 'Transaction must throw and roll back on foreign key violation');

  const paymentsAfterDbError = await prisma.payment.findMany({ where: { caseId: rollbackCase.id } });
  assertEqual(paymentsAfterDbError.length, 1, 'Only original pending payment should exist, rolled-back payment was not saved');
  assertEqual(paymentsAfterDbError[0].status, 'PENDING', 'Original payment status preserved as PENDING');

  const caseAfterDbError = await prisma.case.findUnique({ where: { id: rollbackCase.id } });
  assertEqual(caseAfterDbError.status, 'DRAFT', 'Case status must remain DRAFT after DB constraint rollback');

  console.log(`  ✔ [PASS] Atomic transaction rollback fully verified (Payment, Case, and AuditLog roll back atomically).`);
}

// ----------------------------------------------------------------------------
// SUITE 3: Concurrency Stress (20 Parallel Payment Confirmations)
// ----------------------------------------------------------------------------
async function testSuite3_ConcurrencyStress20(customerId) {
  const CONCURRENCY_COUNT = 20;
  const fixtures = [];
  const testTiers = [
    { tier: 'BASIC', amount: 1499, expectedStatus: 'PAID' },
    { tier: 'LAWYER_REVIEW', amount: 3999, expectedStatus: 'IN_REVIEW' },
    { tier: 'COMPLEX_NRI', amount: 7999, expectedStatus: 'IN_REVIEW' }
  ];

  console.log(`  Creating ${CONCURRENCY_COUNT} draft cases and pending payments for concurrent stress...`);

  for (let i = 0; i < CONCURRENCY_COUNT; i++) {
    const tierConfig = testTiers[i % testTiers.length];
    const c = await prisma.case.create({
      data: {
        customerId,
        status: 'DRAFT',
        flags: 'STANDARD'
      }
    });
    cleanupCaseIds.push(c.id);

    const p = await prisma.payment.create({
      data: {
        caseId: c.id,
        amount: tierConfig.amount,
        currency: 'INR',
        status: 'PENDING',
        mode: 'MOCK',
        razorpayOrderId: `stress_order_${Date.now()}_${i}`
      }
    });
    cleanupPaymentIds.push(p.id);

    fixtures.push({ index: i, caseId: c.id, paymentId: p.id, tierConfig });
  }

  // Pre-condition assertion
  const prePendingPayments = await prisma.payment.findMany({
    where: { id: { in: fixtures.map(f => f.paymentId) }, status: 'PENDING' }
  });
  assertEqual(prePendingPayments.length, CONCURRENCY_COUNT, `All ${CONCURRENCY_COUNT} payments must start as PENDING`);

  console.log(`  Firing ${CONCURRENCY_COUNT} concurrent payment confirmation transactions...`);
  const stressStartTime = Date.now();

  // Execute 20 concurrent transactions simultaneously with proper SQLite transaction configuration
  const results = await Promise.allSettled(
    fixtures.map(async (fixture) => {
      const mockTxnId = `TXN_CONCURRENCY_${Date.now()}_${fixture.index}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      return await prisma.$transaction(async (tx) => {
        // 1. Update payment to SUCCESS
        const updatedPayment = await tx.payment.update({
          where: { id: fixture.paymentId },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: mockTxnId
          }
        });

        // 2. Determine target case status based on tier
        const tierKey = resolveTierKey(fixture.tierConfig.amount);
        const requiresReview = tierKey === 'LAWYER_REVIEW' || tierKey === 'COMPLEX_NRI';
        const nextCaseStatus = requiresReview ? 'IN_REVIEW' : 'PAID';

        // 3. Update case status
        const updatedCase = await tx.case.update({
          where: { id: fixture.caseId },
          data: {
            status: nextCaseStatus,
            flags: requiresReview ? 'STANDARD,LEGAL_REVIEW_REQUIRED' : 'STANDARD'
          }
        });

        // 4. Record centralized audit log within tx
        const auditLog = await createAuditLog({
          actorId: customerId,
          action: 'PAYMENT_COMPLETED',
          entity: 'Payment',
          entityId: fixture.paymentId,
          caseId: fixture.caseId,
          details: {
            amount: updatedPayment.amount,
            tier: tierKey,
            transactionId: mockTxnId,
            caseStatus: nextCaseStatus,
            mode: 'MOCK',
            stressIndex: fixture.index
          },
          tx
        });

        return {
          index: fixture.index,
          paymentId: updatedPayment.id,
          caseId: updatedCase.id,
          txnId: mockTxnId,
          caseStatus: updatedCase.status,
          auditLogId: auditLog.id
        };
      }, { maxWait: 60000, timeout: 60000 });
    })
  );

  const stressDuration = Date.now() - stressStartTime;
  console.log(`  All ${CONCURRENCY_COUNT} concurrent confirmations completed in ${stressDuration}ms.`);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  assertEqual(fulfilled.length, CONCURRENCY_COUNT, `All ${CONCURRENCY_COUNT} concurrent transactions must fulfill`);
  assertEqual(rejected.length, 0, `Zero transactions should be rejected (0 SQLite database locks or timeouts)`);

  if (rejected.length > 0) {
    rejected.forEach((r, idx) => console.error(`  Rejected #${idx}:`, r.reason));
  }

  // Verification 1: Zero duplicate paid cases
  const paidCases = await prisma.case.findMany({
    where: { id: { in: fixtures.map(f => f.caseId) } }
  });
  const uniquePaidCaseIds = new Set(paidCases.map(c => c.id));
  assertEqual(uniquePaidCaseIds.size, CONCURRENCY_COUNT, 'Zero duplicate paid cases: exactly 20 distinct case IDs');

  for (const c of paidCases) {
    const fixture = fixtures.find(f => f.caseId === c.id);
    assertEqual(c.status, fixture.tierConfig.expectedStatus, `Case ${c.id} status must match expected ${fixture.tierConfig.expectedStatus}`);
  }

  // Verification 2: Zero orphaned records
  const successfulPayments = await prisma.payment.findMany({
    where: { id: { in: fixtures.map(f => f.paymentId) } }
  });
  assertEqual(successfulPayments.length, CONCURRENCY_COUNT, 'Exactly 20 payment records must exist');

  const uniqueTxnIds = new Set(successfulPayments.map(p => p.razorpayPaymentId));
  assertEqual(uniqueTxnIds.size, CONCURRENCY_COUNT, 'All 20 successful payments must possess distinct transaction IDs');

  for (const p of successfulPayments) {
    assertEqual(p.status, 'SUCCESS', `Payment ${p.id} status must be SUCCESS`);
    assert(uniquePaidCaseIds.has(p.caseId), `Payment ${p.id} must reference a valid case (no orphan payment)`);
  }

  // Verification 3: Audit trail completeness
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityId: { in: fixtures.map(f => f.paymentId) },
      action: 'PAYMENT_COMPLETED'
    }
  });
  assertEqual(auditLogs.length, CONCURRENCY_COUNT, `Exactly 20 PAYMENT_COMPLETED audit logs must be recorded`);

  for (const log of auditLogs) {
    cleanupAuditLogIds.push(log.id);
    const parsed = JSON.parse(log.metadata);
    assert(typeof parsed.stressIndex === 'number', 'Audit metadata must preserve stressIndex');
    assert(log.createdAt.toISOString().endsWith('Z'), 'Audit log createdAt must end in Z');
  }

  console.log(`  ✔ [PASS] 20 concurrent payment confirmations verified (0 duplicate cases, 0 orphaned records, 0 locks).`);
}

// ----------------------------------------------------------------------------
// SUITE 4: Adversarial Race Condition on Single Payment
// ----------------------------------------------------------------------------
async function testSuite4_SinglePaymentRace(customerId) {
  // Setup 1 case and 1 payment
  const raceCase = await prisma.case.create({
    data: {
      customerId,
      status: 'DRAFT',
      flags: 'STANDARD'
    }
  });
  cleanupCaseIds.push(raceCase.id);

  const racePayment = await prisma.payment.create({
    data: {
      caseId: raceCase.id,
      amount: 3999,
      currency: 'INR',
      status: 'PENDING',
      mode: 'MOCK',
      razorpayOrderId: `race_single_order_${Date.now()}`
    }
  });
  cleanupPaymentIds.push(racePayment.id);

  console.log(`  Testing idempotent atomic confirmation behavior under 20 concurrent hits on the SAME payment ID...`);

  // We execute 20 concurrent confirmation attempts with strict in-transaction idempotency checking
  const raceResults = await Promise.allSettled(
    Array.from({ length: 20 }, async (_, i) => {
      const mockTxnId = `RACE_SINGLE_TXN_${Date.now()}_${i}`;

      return await prisma.$transaction(async (tx) => {
        // Read payment WITHIN the transaction boundary to prevent lost updates
        const currentPayment = await tx.payment.findUnique({
          where: { id: racePayment.id }
        });

        // Idempotency check: if already confirmed, do not re-confirm or duplicate audit logs
        if (currentPayment.status === 'SUCCESS') {
          return {
            idempotentSkip: true,
            status: 'ALREADY_PAID',
            paymentId: racePayment.id
          };
        }

        const updatedPayment = await tx.payment.update({
          where: { id: racePayment.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: mockTxnId
          }
        });

        await tx.case.update({
          where: { id: raceCase.id },
          data: { status: 'IN_REVIEW' }
        });

        await createAuditLog({
          actorId: customerId,
          action: 'PAYMENT_COMPLETED',
          entity: 'Payment',
          entityId: racePayment.id,
          caseId: raceCase.id,
          details: {
            amount: 3999,
            transactionId: mockTxnId,
            raceIndex: i
          },
          tx
        });

        return {
          idempotentSkip: false,
          status: 'CONFIRMED',
          paymentId: racePayment.id,
          txnId: mockTxnId
        };
      }, { maxWait: 60000, timeout: 60000 });
    })
  );

  const confirmedCount = raceResults.filter(
    r => r.status === 'fulfilled' && r.value.status === 'CONFIRMED'
  ).length;

  const skippedCount = raceResults.filter(
    r => r.status === 'fulfilled' && r.value.status === 'ALREADY_PAID'
  ).length;

  assertEqual(confirmedCount, 1, 'Exactly ONE transaction must successfully transition the payment to SUCCESS');
  assertEqual(skippedCount, 19, 'The remaining 19 concurrent transactions must safely identify already-paid state');

  const postRacePayment = await prisma.payment.findUnique({ where: { id: racePayment.id } });
  assertEqual(postRacePayment.status, 'SUCCESS', 'Payment status must be SUCCESS');

  const postRaceLogs = await prisma.auditLog.findMany({
    where: { entityId: racePayment.id, action: 'PAYMENT_COMPLETED' }
  });
  assertEqual(postRaceLogs.length, 1, 'Exactly ONE PAYMENT_COMPLETED audit log must exist (zero duplicate audit spam)');
  postRaceLogs.forEach(l => cleanupAuditLogIds.push(l.id));

  console.log(`  ✔ [PASS] Single payment concurrent race condition safely handled (1 confirmation, 19 idempotent skips, 1 audit log).`);
}

// ----------------------------------------------------------------------------
// SUITE 5: Database-Wide UTC ISO-8601 Timestamp Verification
// ----------------------------------------------------------------------------
async function testSuite5_UtcTimestampAudit() {
  const allLogs = await prisma.auditLog.findMany();
  console.log(`  Auditing 100% of existing audit logs in dev.db (${allLogs.length} records found)...`);

  assert(allLogs.length > 0, 'Database dev.db must contain audit logs to audit');

  const isoUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
  let validCreatedAtUtcCount = 0;
  let validTimestampUtcCount = 0;
  let nonUtcOrMalformedCount = 0;

  for (const log of allLogs) {
    const createdDate = new Date(log.createdAt);
    const timestampDate = new Date(log.timestamp);

    const isCreatedDateValid = !isNaN(createdDate.getTime());
    const isTimestampDateValid = !isNaN(timestampDate.getTime());

    const createdIso = isCreatedDateValid ? createdDate.toISOString() : '';
    const timestampIso = isTimestampDateValid ? timestampDate.toISOString() : '';

    const createdEndsWithZ = createdIso.endsWith('Z');
    const timestampEndsWithZ = timestampIso.endsWith('Z');

    const createdMatchesPattern = isoUtcRegex.test(createdIso);
    const timestampMatchesPattern = isoUtcRegex.test(timestampIso);

    if (isCreatedDateValid && createdEndsWithZ && createdMatchesPattern) {
      validCreatedAtUtcCount++;
    } else {
      nonUtcOrMalformedCount++;
      console.error(`  Invalid createdAt timestamp on log ID ${log.id}: ${log.createdAt}`);
    }

    if (isTimestampDateValid && timestampEndsWithZ && timestampMatchesPattern) {
      validTimestampUtcCount++;
    } else {
      nonUtcOrMalformedCount++;
      console.error(`  Invalid timestamp on log ID ${log.id}: ${log.timestamp}`);
    }
  }

  assertEqual(nonUtcOrMalformedCount, 0, 'Zero audit logs should have non-UTC or malformed timestamps');
  assertEqual(validCreatedAtUtcCount, allLogs.length, `All ${allLogs.length} logs must have valid UTC createdAt ending in Z`);
  assertEqual(validTimestampUtcCount, allLogs.length, `All ${allLogs.length} logs must have valid UTC timestamp ending in Z`);

  console.log(`  ✔ [PASS] Database-wide audit: All ${allLogs.length} audit logs have valid UTC ISO-8601 timestamps ending in 'Z'.`);
}

// ----------------------------------------------------------------------------
// SUITE 6: JSON Metadata Parsing Integrity Across Standard Actions
// ----------------------------------------------------------------------------
async function testSuite6_MetadataIntegrity(customerId) {
  // 1. Audit existing database metadata
  const existingLogs = await prisma.auditLog.findMany({
    where: { metadata: { not: null } }
  });

  console.log(`  Checking JSON parseability of ${existingLogs.length} existing metadata payloads in dev.db...`);
  let parsedExistingCount = 0;
  for (const log of existingLogs) {
    try {
      const parsed = JSON.parse(log.metadata);
      assert(parsed !== null, `Parsed metadata on log ${log.id} must not be null`);
      parsedExistingCount++;
    } catch (err) {
      assert(false, `Failed to parse existing metadata on log ${log.id}: ${err.message}`);
    }
  }
  assertEqual(parsedExistingCount, existingLogs.length, '100% of existing metadata payloads must parse cleanly as JSON');

  // 2. Comprehensive Standard Actions Coverage (All 27 standard actions)
  const standardActions = [
    'USER_REGISTERED',
    'USER_LOGIN',
    'AUTH_LOGIN_SUCCESS',
    'AUTH_LOGIN_FAILURE',
    'CASE_CREATED',
    'QUESTIONNAIRE_SAVED',
    'QUESTIONNAIRE_SUBMITTED',
    'PAYMENT_INITIATED',
    'PAYMENT_COMPLETED',
    'PAYMENT_FAILED',
    'LAWYER_ASSIGNED',
    'LAWYER_REVIEW_SUBMITTED',
    'CASE_REVIEW_STARTED',
    'CASE_APPROVED',
    'CASE_REJECTED',
    'CHANGES_REQUESTED',
    'DOCUMENT_GENERATED',
    'DOCUMENT_DOWNLOADED',
    'TEMPLATE_CREATED',
    'TEMPLATE_STATUS_CHANGED',
    'TEMPLATE_APPROVED',
    'TEMPLATE_LOCKED',
    'CLAUSE_STATUS_CHANGED',
    'CLAUSE_APPROVED',
    'ADMIN_CASE_ASSIGNED',
    'ADMIN_STATUS_OVERRIDE',
    'USER_ROLE_UPDATED'
  ];

  console.log(`  Testing createAuditLog metadata serialization & retrieval across all ${standardActions.length} standard actions...`);

  for (const [idx, action] of standardActions.entries()) {
    const complexPayload = {
      actionIndex: idx,
      testScope: 'STANDARD_ACTIONS_COVERAGE',
      numericVal: 42 * (idx + 1),
      booleanVal: idx % 2 === 0,
      tags: ['audit', 'm5', action.toLowerCase()],
      nested: {
        system: 'ESTATE_OS',
        subsystem: action.split('_')[0],
        timestamp: new Date().toISOString()
      }
    };

    const created = await createAuditLog({
      actorId: customerId,
      action,
      entity: 'TestEntity',
      entityId: `entity_${idx}`,
      details: complexPayload,
      ipAddress: `10.0.0.${(idx % 250) + 1}`,
      userAgent: 'Challenger1-Automated-Audit-Harness/1.0'
    });
    cleanupAuditLogIds.push(created.id);

    // Fetch fresh from DB to verify raw storage
    const fetched = await prisma.auditLog.findUnique({ where: { id: created.id } });
    assert(!!fetched, `Created log ${created.id} must exist in dev.db`);
    assertEqual(fetched.action, action, `Action must match ${action}`);

    let parsedMeta;
    try {
      parsedMeta = JSON.parse(fetched.metadata);
    } catch (err) {
      parsedMeta = null;
    }
    assert(parsedMeta !== null, `Metadata on action ${action} must parse cleanly`);
    assertEqual(parsedMeta.actionIndex, idx, 'Parsed metadata must contain matching actionIndex');
    assertEqual(parsedMeta.ipAddress, `10.0.0.${(idx % 250) + 1}`, 'IP Address must be safely merged into metadata');
    assertEqual(parsedMeta.userAgent, 'Challenger1-Automated-Audit-Harness/1.0', 'UserAgent must be safely merged');
  }

  // 3. Edge Cases: Plain String, Pre-stringified JSON, Null Metadata, Circular Object
  console.log(`  Testing metadata edge cases (plain string, pre-stringified JSON, null, circular references)...`);

  // Plain string
  const plainStringLog = await createAuditLog({
    actorId: customerId,
    action: 'CASE_CREATED',
    metadata: 'Arbitrary plain text log note without curly braces'
  });
  cleanupAuditLogIds.push(plainStringLog.id);
  const fetchedPlain = await prisma.auditLog.findUnique({ where: { id: plainStringLog.id } });
  const parsedPlain = JSON.parse(fetchedPlain.metadata);
  assertEqual(parsedPlain.text, 'Arbitrary plain text log note without curly braces', 'Plain string must be converted to safe JSON object');

  // Pre-stringified JSON
  const preStringifiedLog = await createAuditLog({
    actorId: customerId,
    action: 'USER_LOGIN',
    metadata: JSON.stringify({ preSerialized: true, score: 99 })
  });
  cleanupAuditLogIds.push(preStringifiedLog.id);
  const fetchedPre = await prisma.auditLog.findUnique({ where: { id: preStringifiedLog.id } });
  const parsedPre = JSON.parse(fetchedPre.metadata);
  assertEqual(parsedPre.preSerialized, true, 'Pre-stringified JSON must be parsed and stored without double serialization');

  // Null metadata
  const nullMetaLog = await createAuditLog({
    actorId: customerId,
    action: 'CASE_APPROVED',
    metadata: null
  });
  cleanupAuditLogIds.push(nullMetaLog.id);
  const fetchedNull = await prisma.auditLog.findUnique({ where: { id: nullMetaLog.id } });
  assertEqual(fetchedNull.metadata, null, 'Null metadata must persist cleanly as null');

  // Circular reference object
  const circularObj = { name: 'circular_test' };
  circularObj.self = circularObj;
  const circularLog = await createAuditLog({
    actorId: customerId,
    action: 'PAYMENT_FAILED',
    metadata: circularObj
  });
  cleanupAuditLogIds.push(circularLog.id);
  const fetchedCircular = await prisma.auditLog.findUnique({ where: { id: circularLog.id } });
  const parsedCircular = JSON.parse(fetchedCircular.metadata);
  assertEqual(parsedCircular.error, 'Failed to serialize metadata', 'Circular object must gracefully serialize fallback error object');

  console.log(`  ✔ [PASS] JSON metadata parsing integrity verified across all 27 standard actions + edge cases.`);
}

// ----------------------------------------------------------------------------
// SUITE 7: Concurrent Audit Logging Stress (30 Parallel Calls)
// ----------------------------------------------------------------------------
async function testSuite7_ConcurrentAuditStress(customerId) {
  const PARALLEL_CALLS = 30;
  console.log(`  Preparing 30 parallel audit log calls to test SQLite concurrency and lock-resistance...`);

  const initialCount = await prisma.auditLog.count();

  const stressStartTime = Date.now();
  const parallelPromises = Array.from({ length: PARALLEL_CALLS }, (_, i) => {
    return createAuditLog({
      actorId: customerId,
      action: 'ADMIN_STATUS_OVERRIDE',
      entity: 'SystemStress',
      entityId: `stress_entity_${i}`,
      details: {
        batchIndex: i,
        timestamp: new Date().toISOString(),
        payload: `Stress call ${i} of ${PARALLEL_CALLS}`
      },
      ipAddress: '127.0.0.1',
      userAgent: `ConcurrentStressAgent/${i}`
    });
  });

  const settledResults = await Promise.allSettled(parallelPromises);
  const stressDuration = Date.now() - stressStartTime;

  console.log(`  All 30 parallel audit calls settled in ${stressDuration}ms.`);

  const fulfilled = settledResults.filter(r => r.status === 'fulfilled');
  const rejected = settledResults.filter(r => r.status === 'rejected');

  assertEqual(fulfilled.length, PARALLEL_CALLS, `All ${PARALLEL_CALLS} parallel audit calls must fulfill`);
  assertEqual(rejected.length, 0, 'Zero parallel audit calls should be rejected (0 lock errors, 0 dropped logs)');

  fulfilled.forEach(r => cleanupAuditLogIds.push(r.value.id));

  // Verify all 30 logs are counted in database
  const stressLogsCount = await prisma.auditLog.count({
    where: { id: { in: fulfilled.map(r => r.value.id) } }
  });
  assertEqual(stressLogsCount, PARALLEL_CALLS, `Database count must include exactly ${PARALLEL_CALLS} stress audit logs`);

  // Check UTC timestamp and metadata integrity on all 30 newly created logs
  const createdLogs = await prisma.auditLog.findMany({
    where: { id: { in: fulfilled.map(r => r.value.id) } }
  });
  assertEqual(createdLogs.length, PARALLEL_CALLS, `Exactly ${PARALLEL_CALLS} logs must be retrieved from database`);

  for (const log of createdLogs) {
    const isoString = log.createdAt.toISOString();
    assert(isoString.endsWith('Z'), `Parallel log ${log.id} timestamp must end in 'Z'`);
    const parsed = JSON.parse(log.metadata);
    assert(typeof parsed.batchIndex === 'number', `Parallel log ${log.id} metadata must contain batchIndex`);
    assertEqual(parsed.ipAddress, '127.0.0.1', `Parallel log ${log.id} ipAddress must match`);
  }

  console.log(`  ✔ [PASS] 30 parallel audit log calls completed (0 dropped logs, 0 database lock errors).`);
}

// ----------------------------------------------------------------------------
// SUITE 8: Simulated Payment Failure Atomicity
// ----------------------------------------------------------------------------
async function testSuite8_PaymentFailureAtomicity(customerId) {
  const failCase = await prisma.case.create({
    data: {
      customerId,
      status: 'DRAFT',
      flags: 'STANDARD'
    }
  });
  cleanupCaseIds.push(failCase.id);

  const failPayment = await prisma.payment.create({
    data: {
      caseId: failCase.id,
      amount: 1499,
      currency: 'INR',
      status: 'PENDING',
      mode: 'MOCK',
      razorpayOrderId: `mock_order_fail_${Date.now()}`
    }
  });
  cleanupPaymentIds.push(failPayment.id);

  // Execute failure transaction mimicking /api/payment/confirm
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: failPayment.id },
      data: { status: 'FAILED' }
    });

    await createAuditLog({
      actorId: customerId,
      action: 'PAYMENT_FAILED',
      entity: 'Payment',
      entityId: failPayment.id,
      caseId: failCase.id,
      details: {
        reason: 'Simulated payment failure',
        amount: failPayment.amount,
        mode: 'MOCK'
      },
      tx
    });
  }, { maxWait: 60000, timeout: 60000 });

  const updatedPayment = await prisma.payment.findUnique({ where: { id: failPayment.id } });
  assertEqual(updatedPayment.status, 'FAILED', 'Payment status must transition to FAILED');

  const unaffectedCase = await prisma.case.findUnique({ where: { id: failCase.id } });
  assertEqual(unaffectedCase.status, 'DRAFT', 'Case status must remain DRAFT on payment failure');

  const failAudit = await prisma.auditLog.findFirst({
    where: { entityId: failPayment.id, action: 'PAYMENT_FAILED' }
  });
  assert(!!failAudit, 'PAYMENT_FAILED audit log must be persisted in database');
  cleanupAuditLogIds.push(failAudit.id);

  console.log(`  ✔ [PASS] Simulated payment failure atomicity verified (Payment -> FAILED, Case -> DRAFT, PAYMENT_FAILED audit logged).`);
}

// ----------------------------------------------------------------------------
// CLEANUP HELPER
// ----------------------------------------------------------------------------
async function performCleanup() {
  try {
    if (cleanupAuditLogIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { id: { in: cleanupAuditLogIds } }
      });
      console.log(`  Cleaned up ${cleanupAuditLogIds.length} test audit logs.`);
    }

    if (cleanupPaymentIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { id: { in: cleanupPaymentIds } }
      });
      console.log(`  Cleaned up ${cleanupPaymentIds.length} test payments.`);
    }

    if (cleanupCaseIds.length > 0) {
      await prisma.case.deleteMany({
        where: { id: { in: cleanupCaseIds } }
      });
      console.log(`  Cleaned up ${cleanupCaseIds.length} test cases.`);
    }
  } catch (err) {
    console.warn(`  Cleanup warning: ${err.message}`);
  }
}

// Execute main
main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
