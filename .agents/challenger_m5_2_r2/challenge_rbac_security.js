/**
 * Independent Empirical Challenge Test Harness for Milestone 5
 * 
 * Target:
 * 1. Lawyer Portal RBAC & IDOR Matrix
 * 2. Admin Portal RBAC & Privilege Escalation
 * 3. Template & Clause Lifecycle State Machine Transitions & Fuzzing
 *
 * Author: Challenger 2 (Milestone 5 Replacement)
 */

const assert = require("assert");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

// Register ts-node and tsconfig-paths for importing Next.js TypeScript modules
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    moduleResolution: "node",
    esModuleInterop: true,
  },
});

const tsConfigPaths = require("tsconfig-paths");
tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, "../../"),
  paths: {
    "@/*": ["src/*"],
  },
});

// Dynamic session mock for NextAuth getServerSession
const nextAuth = require("next-auth");
const nextAuthNext = require("next-auth/next");
let activeSession = null;
nextAuth.getServerSession = async () => activeSession;
nextAuthNext.getServerSession = async () => activeSession;

// Import route handlers and access controllers
const assignRoute = require("../../src/app/api/lawyer/cases/assign/route.ts");
const reviewRoute = require("../../src/app/api/lawyer/cases/review/route.ts");
const downloadRoute = require("../../src/app/api/document/download/route.ts");
const adminRoleRoute = require("../../src/app/api/admin/users/role/route.ts");
const adminTemplateRoute = require("../../src/app/api/admin/templates/status/route.ts");
const adminCasesAssignRoute = require("../../src/app/api/admin/cases/assign/route.ts");
const { canAccessCase } = require("../../src/lib/case-access.ts");

// Edge Middleware and NextRequest imports
const { NextRequest } = require("next/server");
const nextAuthJwt = require("next-auth/jwt");
let activeJwtToken = null;
nextAuthJwt.getToken = async () => activeJwtToken;
const edgeMiddleware = require("../../src/middleware.ts").default;

const prisma = new PrismaClient();

// Helper to construct native Web standard Request instances
function makeRequest(url, method = "POST", body = null) {
  const init = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== null && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

let assertionCount = 0;
function challengeAssert(condition, message) {
  assertionCount++;
  assert.ok(condition, message);
}

function challengeAssertEqual(actual, expected, message) {
  assertionCount++;
  assert.strictEqual(actual, expected, `${message} (Expected: ${expected}, Got: ${actual})`);
}

// Global fixtures
let customerA, customerB;
let lawyerA, lawyerB;
let adminUser;
let caseOwnedByA;
let caseClaimedByA;
let unassignedCase;
let testTemplate, testClause;
const createdCaseIds = [];
const createdUserIds = [];
const createdTemplateIds = [];
const createdClauseIds = [];

async function setupFixtures() {
  console.log("\n=======================================================");
  console.log("  SETTING UP CHALLENGER EMPIRICAL TEST FIXTURES        ");
  console.log("=======================================================");

  // Find or create primary demo users
  customerA = await prisma.user.findFirst({ where: { email: "customer@demo.com" } });
  lawyerA = await prisma.user.findFirst({ where: { email: "lawyer@demo.com" } });
  adminUser = await prisma.user.findFirst({ where: { email: "admin@demo.com" } });

  challengeAssert(customerA, "customerA must exist");
  challengeAssert(lawyerA, "lawyerA must exist");
  challengeAssert(adminUser, "adminUser must exist");

  // Create isolated secondary adversary accounts
  const ts = Date.now();
  customerB = await prisma.user.create({
    data: {
      email: `adversary_cust_${ts}@challenge.test`,
      name: "Adversary Customer B",
      password: "hashed_dummy_password",
      role: "CUSTOMER",
    },
  });
  createdUserIds.push(customerB.id);

  lawyerB = await prisma.user.create({
    data: {
      email: `adversary_lawyer_${ts}@challenge.test`,
      name: "Advocate Adversary B",
      password: "hashed_dummy_password",
      role: "LAWYER",
    },
  });
  createdUserIds.push(lawyerB.id);

  // Case 1: Owned by Customer A, unassigned
  caseOwnedByA = await prisma.case.create({
    data: {
      customerId: customerA.id,
      status: "IN_REVIEW",
      flags: "STANDARD",
      lawyerId: null,
    },
  });
  createdCaseIds.push(caseOwnedByA.id);

  // Case 2: Owned by Customer A, claimed by Lawyer A
  caseClaimedByA = await prisma.case.create({
    data: {
      customerId: customerA.id,
      status: "IN_REVIEW",
      flags: "STANDARD,NRI",
      lawyerId: lawyerA.id,
    },
  });
  createdCaseIds.push(caseClaimedByA.id);

  // Case 3: Fresh unassigned case
  unassignedCase = await prisma.case.create({
    data: {
      customerId: customerA.id,
      status: "IN_REVIEW",
      flags: "STANDARD",
      lawyerId: null,
    },
  });
  createdCaseIds.push(unassignedCase.id);

  console.log(`Fixtures initialized:
  Customer A: ${customerA.id} (${customerA.email})
  Customer B (Adversary): ${customerB.id} (${customerB.email})
  Lawyer A: ${lawyerA.id} (${lawyerA.email})
  Lawyer B (Adversary): ${lawyerB.id} (${lawyerB.email})
  Admin: ${adminUser.id} (${adminUser.email})
  Case 1 (Unassigned): ${caseOwnedByA.id}
  Case 2 (Claimed by Lawyer A): ${caseClaimedByA.id}
  Case 3 (Fresh Unassigned): ${unassignedCase.id}`);
}

// -------------------------------------------------------------
// SUITE 1: Lawyer Portal RBAC & IDOR Matrix
// -------------------------------------------------------------
async function runSuite1_LawyerRBACAndIDOR() {
  console.log("\n-------------------------------------------------------");
  console.log("SUITE 1: Lawyer Portal RBAC & IDOR Matrix");
  console.log("-------------------------------------------------------");

  // 1.1: Unauthenticated request to /api/lawyer/cases/assign -> 401
  {
    activeSession = null;
    const req = makeRequest("http://localhost:3000/api/lawyer/cases/assign", "POST", {
      caseId: unassignedCase.id,
    });
    const res = await assignRoute.POST(req);
    challengeAssertEqual(res.status, 401, "1.1: Unauthenticated case assign must return 401 Unauthorized");
    const json = await res.json();
    challengeAssert(json.error && json.error.includes("Unauthorized"), "1.1: Error message indicates unauthorized");
    console.log("  ✔ [PASS] 1.1: Unauthenticated request to /api/lawyer/cases/assign rejected with 401");
  }

  // 1.2: Customer attempting to call /api/lawyer/cases/assign -> 403 Forbidden
  {
    activeSession = { user: { id: customerA.id, email: customerA.email, role: "CUSTOMER" } };
    const req = makeRequest("http://localhost:3000/api/lawyer/cases/assign", "POST", {
      caseId: unassignedCase.id,
    });
    const res = await assignRoute.POST(req);
    challengeAssertEqual(res.status, 403, "1.2: Customer attempting lawyer case assign must return 403 Forbidden");
    const json = await res.json();
    challengeAssert(json.error && json.error.includes("Forbidden"), "1.2: Error message indicates forbidden");
    console.log("  ✔ [PASS] 1.2: Customer attempting /api/lawyer/cases/assign rejected with 403 Forbidden");
  }

  // 1.3: Unauthenticated request to /api/lawyer/cases/review -> 401 Unauthorized
  {
    activeSession = null;
    const req = makeRequest("http://localhost:3000/api/lawyer/cases/review", "POST", {
      caseId: caseClaimedByA.id,
      decision: "APPROVE",
    });
    const res = await reviewRoute.POST(req);
    challengeAssertEqual(res.status, 401, "1.3: Unauthenticated case review must return 401 Unauthorized");
    console.log("  ✔ [PASS] 1.3: Unauthenticated request to /api/lawyer/cases/review rejected with 401");
  }

  // 1.4: Customer attempting to call /api/lawyer/cases/review -> 403 Forbidden
  {
    activeSession = { user: { id: customerA.id, email: customerA.email, role: "CUSTOMER" } };
    const req = makeRequest("http://localhost:3000/api/lawyer/cases/review", "POST", {
      caseId: caseClaimedByA.id,
      decision: "APPROVE",
    });
    const res = await reviewRoute.POST(req);
    challengeAssertEqual(res.status, 403, "1.4: Customer attempting lawyer case review must return 403 Forbidden");
    console.log("  ✔ [PASS] 1.4: Customer attempting /api/lawyer/cases/review rejected with 403 Forbidden");
  }

  // 1.5: Unauthenticated request to /api/document/download -> 401 Unauthorized
  {
    activeSession = null;
    const req = makeRequest(`http://localhost:3000/api/document/download?caseId=${caseClaimedByA.id}`, "GET");
    const res = await downloadRoute.GET(req);
    challengeAssertEqual(res.status, 401, "1.5: Unauthenticated document download must return 401 Unauthorized");
    console.log("  ✔ [PASS] 1.5: Unauthenticated request to /api/document/download rejected with 401");
  }

  // 1.6: Customer B attempting to download Customer A's case document -> 403 Forbidden
  {
    activeSession = { user: { id: customerB.id, email: customerB.email, role: "CUSTOMER" } };
    const req = makeRequest(`http://localhost:3000/api/document/download?caseId=${caseClaimedByA.id}`, "GET");
    const res = await downloadRoute.GET(req);
    challengeAssertEqual(res.status, 403, "1.6: Customer B downloading Customer A's document must return 403 Forbidden");
    console.log("  ✔ [PASS] 1.6: Customer B downloading Customer A's document rejected with 403 Forbidden");
  }

  // 1.7: Lawyer A claiming an unassigned case -> 200 OK
  {
    activeSession = { user: { id: lawyerA.id, email: lawyerA.email, role: "LAWYER" } };
    const req = makeRequest("http://localhost:3000/api/lawyer/cases/assign", "POST", {
      caseId: unassignedCase.id,
    });
    const res = await assignRoute.POST(req);
    challengeAssertEqual(res.status, 200, "1.7: Lawyer A claiming unassigned case must succeed with 200 OK");
    const json = await res.json();
    challengeAssertEqual(json.success, true, "1.7: Success flag true");
    challengeAssertEqual(json.case.lawyerId, lawyerA.id, "1.7: Case lawyerId set to Lawyer A");

    // Verify audit log emitted
    const audit = await prisma.auditLog.findFirst({
      where: { caseId: unassignedCase.id, action: "LAWYER_ASSIGNED" },
    });
    challengeAssert(audit, "1.7: LAWYER_ASSIGNED audit record persisted");
    challengeAssertEqual(audit.actorId, lawyerA.id, "1.7: Audit actor is Lawyer A");
    console.log("  ✔ [PASS] 1.7: Lawyer A claiming unassigned case succeeds with 200 OK & audit log");
  }

  // 1.8: Lawyer claiming an already assigned case -> 409 Conflict
  {
    // caseClaimedByA is already claimed by lawyerA. Lawyer B tries to claim it.
    activeSession = { user: { id: lawyerB.id, email: lawyerB.email, role: "LAWYER" } };
    const req = makeRequest("http://localhost:3000/api/lawyer/cases/assign", "POST", {
      caseId: caseClaimedByA.id,
    });
    const res = await assignRoute.POST(req);
    challengeAssertEqual(res.status, 409, "1.8: Lawyer claiming already assigned case must return 409 Conflict");
    const json = await res.json();
    challengeAssert(json.error && json.error.includes("Conflict"), "1.8: Error specifies conflict message");
    console.log("  ✔ [PASS] 1.8: Lawyer claiming already assigned case rejected with 409 Conflict");
  }

  // 1.9: Lawyer B attempting to review Lawyer A's assigned case -> 403 Forbidden
  {
    activeSession = { user: { id: lawyerB.id, email: lawyerB.email, role: "LAWYER" } };
    const req = makeRequest("http://localhost:3000/api/lawyer/cases/review", "POST", {
      caseId: caseClaimedByA.id,
      decision: "APPROVE",
    });
    const res = await reviewRoute.POST(req);
    challengeAssertEqual(res.status, 403, "1.9: Lawyer B reviewing Lawyer A's case must return 403 Forbidden");
    const json = await res.json();
    challengeAssert(json.error && json.error.includes("Forbidden"), "1.9: Error specifies forbidden message");
    console.log("  ✔ [PASS] 1.9: Lawyer B attempting to review Lawyer A's case rejected with 403 Forbidden");
  }

  // 1.10: Lawyer B attempting to download draft DOCX of Lawyer A's assigned case -> 403 Forbidden
  {
    activeSession = { user: { id: lawyerB.id, email: lawyerB.email, role: "LAWYER" } };
    const req = makeRequest(`http://localhost:3000/api/document/download?caseId=${caseClaimedByA.id}`, "GET");
    const res = await downloadRoute.GET(req);
    challengeAssertEqual(res.status, 403, "1.10: Lawyer B downloading Lawyer A's draft DOCX must return 403 Forbidden");
    console.log("  ✔ [PASS] 1.10: Lawyer B downloading Lawyer A's draft DOCX rejected with 403 Forbidden");
  }

  // 1.11: Assigned Lawyer A reviewing and approving their own case -> 200 OK
  {
    activeSession = { user: { id: lawyerA.id, email: lawyerA.email, role: "LAWYER" } };
    const req = makeRequest("http://localhost:3000/api/lawyer/cases/review", "POST", {
      caseId: caseClaimedByA.id,
      decision: "APPROVE",
      notes: "Testamentary declarations compliant with Indian Succession Act.",
    });
    const res = await reviewRoute.POST(req);
    challengeAssertEqual(res.status, 200, "1.11: Assigned Lawyer A approving case must return 200 OK");
    const json = await res.json();
    challengeAssertEqual(json.success, true, "1.11: Review submission success flag");
    challengeAssertEqual(json.status, "APPROVED", "1.11: Case status transitioned to APPROVED");

    const updatedCase = await prisma.case.findUnique({ where: { id: caseClaimedByA.id } });
    challengeAssertEqual(updatedCase.status, "APPROVED", "1.11: Database confirms status is APPROVED");

    const approvalAudit = await prisma.auditLog.findFirst({
      where: { caseId: caseClaimedByA.id, action: "CASE_APPROVED" },
    });
    challengeAssert(approvalAudit, "1.11: CASE_APPROVED audit log exists");
    console.log("  ✔ [PASS] 1.11: Assigned Lawyer A reviewing and approving case succeeds with 200 OK");
  }

  // 1.12: Assigned Lawyer A downloading draft DOCX of their own assigned case -> 200 OK
  {
    activeSession = { user: { id: lawyerA.id, email: lawyerA.email, role: "LAWYER" } };
    const req = makeRequest(`http://localhost:3000/api/document/download?caseId=${caseClaimedByA.id}`, "GET");
    const res = await downloadRoute.GET(req);
    challengeAssertEqual(res.status, 200, "1.12: Assigned Lawyer A downloading document must return 200 OK");
    challengeAssert(res.headers.get("Content-Disposition")?.includes("attachment"), "1.12: Attachment header present");
    console.log("  ✔ [PASS] 1.12: Assigned Lawyer A downloading document succeeds with 200 OK");
  }

  // 1.13: canAccessCase predicate exhaustive authorization matrix verification
  {
    const testCaseAssignedA = { customerId: customerA.id, lawyerId: lawyerA.id, status: "IN_REVIEW" };
    const testCaseUnassignedInReview = { customerId: customerA.id, lawyerId: null, status: "IN_REVIEW" };
    const testCaseUnassignedDraft = { customerId: customerA.id, lawyerId: null, status: "DRAFT" };

    // Null session
    challengeAssertEqual(canAccessCase(null, testCaseAssignedA), false, "canAccessCase: null session denied");

    // Customer
    challengeAssertEqual(canAccessCase({ user: { id: customerA.id, role: "CUSTOMER" } }, testCaseAssignedA), true, "canAccessCase: owner customer allowed");
    challengeAssertEqual(canAccessCase({ user: { id: customerB.id, role: "CUSTOMER" } }, testCaseAssignedA), false, "canAccessCase: foreign customer denied");

    // Lawyer
    challengeAssertEqual(canAccessCase({ user: { id: lawyerA.id, role: "LAWYER" } }, testCaseAssignedA), true, "canAccessCase: assigned lawyer allowed");
    challengeAssertEqual(canAccessCase({ user: { id: lawyerB.id, role: "LAWYER" } }, testCaseAssignedA), false, "canAccessCase: unassigned lawyer denied on claimed case");
    challengeAssertEqual(canAccessCase({ user: { id: lawyerB.id, role: "LAWYER" } }, testCaseUnassignedInReview), true, "canAccessCase: lawyer allowed on unassigned IN_REVIEW case");
    challengeAssertEqual(canAccessCase({ user: { id: lawyerB.id, role: "LAWYER" } }, testCaseUnassignedDraft), false, "canAccessCase: lawyer denied on unassigned DRAFT case");

    // Admin
    challengeAssertEqual(canAccessCase({ user: { id: adminUser.id, role: "ADMIN" } }, testCaseAssignedA), true, "canAccessCase: admin always allowed");
    console.log("  ✔ [PASS] 1.13: canAccessCase access predicate evaluated across complete role/assignment matrix");
  }
}

// -------------------------------------------------------------
// SUITE 2: Admin Portal RBAC & Privilege Escalation
// -------------------------------------------------------------
async function runSuite2_AdminRBACAndPrivilegeEscalation() {
  console.log("\n-------------------------------------------------------");
  console.log("SUITE 2: Admin Portal RBAC & Privilege Escalation");
  console.log("-------------------------------------------------------");

  // Create an arbitrary target user to test privilege mutation
  const ts = Date.now();
  const targetUser = await prisma.user.create({
    data: {
      email: `target_user_${ts}@challenge.test`,
      name: "Target User For Escalation Test",
      password: "hashed_dummy_password",
      role: "CUSTOMER",
    },
  });
  createdUserIds.push(targetUser.id);

  // 2.1: Unauthenticated request to /api/admin/users/role -> 403
  {
    activeSession = null;
    const req = makeRequest("http://localhost:3000/api/admin/users/role", "POST", {
      userId: targetUser.id,
      role: "ADMIN",
    });
    const res = await adminRoleRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.1: Unauthenticated role change must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.1: Unauthenticated call to /api/admin/users/role rejected with 403");
  }

  // 2.2: Customer attempting to call /api/admin/users/role -> 403 Forbidden
  {
    activeSession = { user: { id: customerA.id, email: customerA.email, role: "CUSTOMER" } };
    const req = makeRequest("http://localhost:3000/api/admin/users/role", "POST", {
      userId: targetUser.id,
      role: "ADMIN",
    });
    const res = await adminRoleRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.2: Customer attempting role change must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.2: Customer calling /api/admin/users/role rejected with 403 Forbidden");
  }

  // 2.3: Lawyer attempting to call /api/admin/users/role -> 403 Forbidden
  {
    activeSession = { user: { id: lawyerA.id, email: lawyerA.email, role: "LAWYER" } };
    const req = makeRequest("http://localhost:3000/api/admin/users/role", "POST", {
      userId: targetUser.id,
      role: "ADMIN",
    });
    const res = await adminRoleRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.3: Lawyer attempting role change must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.3: Lawyer calling /api/admin/users/role rejected with 403 Forbidden");
  }

  // 2.4: Privilege Escalation Attempt: Non-admin promoting themselves to ADMIN -> 403 Forbidden
  {
    activeSession = { user: { id: customerB.id, email: customerB.email, role: "CUSTOMER" } };
    const req = makeRequest("http://localhost:3000/api/admin/users/role", "POST", {
      userId: customerB.id,
      role: "ADMIN",
    });
    const res = await adminRoleRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.4: Self-promotion privilege escalation attempt must return 403 Forbidden");

    const checkCustB = await prisma.user.findUnique({ where: { id: customerB.id } });
    challengeAssertEqual(checkCustB.role, "CUSTOMER", "2.4: Customer B role remains CUSTOMER");
    console.log("  ✔ [PASS] 2.4: Self-promotion privilege escalation blocked with 403 Forbidden");
  }

  // 2.5: Admin promoting user to LAWYER -> 200 OK
  {
    activeSession = { user: { id: adminUser.id, email: adminUser.email, role: "ADMIN" } };
    const req = makeRequest("http://localhost:3000/api/admin/users/role", "POST", {
      userId: targetUser.id,
      role: "LAWYER",
    });
    const res = await adminRoleRoute.POST(req);
    challengeAssertEqual(res.status, 200, "2.5: Admin promoting user to LAWYER must return 200 OK");
    const json = await res.json();
    challengeAssertEqual(json.success, true, "2.5: Success true");
    challengeAssertEqual(json.user.role, "LAWYER", "2.5: Returned role is LAWYER");

    const dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } });
    challengeAssertEqual(dbUser.role, "LAWYER", "2.5: Database persisted role is LAWYER");

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: targetUser.id, action: "USER_ROLE_UPDATED" },
    });
    challengeAssert(audit, "2.5: USER_ROLE_UPDATED audit log exists");
    challengeAssertEqual(audit.actorId, adminUser.id, "2.5: Audit actor is admin");
    console.log("  ✔ [PASS] 2.5: Admin legitimately promotes user to LAWYER with audit logging");
  }

  // 2.6: Self-demotion guard: Admin attempting to remove their own admin role -> 400 Bad Request
  {
    activeSession = { user: { id: adminUser.id, email: adminUser.email, role: "ADMIN" } };
    const reqDemoteToCust = makeRequest("http://localhost:3000/api/admin/users/role", "POST", {
      userId: adminUser.id,
      role: "CUSTOMER",
    });
    const resDemoteToCust = await adminRoleRoute.POST(reqDemoteToCust);
    challengeAssertEqual(resDemoteToCust.status, 400, "2.6: Admin demoting self to CUSTOMER must return 400 Bad Request");
    const jsonCust = await resDemoteToCust.json();
    challengeAssert(
      jsonCust.error && jsonCust.error.includes("demote your own administrator account"),
      "2.6: Specific self-demotion lockout message returned"
    );

    const reqDemoteToLawyer = makeRequest("http://localhost:3000/api/admin/users/role", "POST", {
      userId: adminUser.id,
      role: "LAWYER",
    });
    const resDemoteToLawyer = await adminRoleRoute.POST(reqDemoteToLawyer);
    challengeAssertEqual(resDemoteToLawyer.status, 400, "2.6: Admin demoting self to LAWYER must return 400 Bad Request");

    const checkAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
    challengeAssertEqual(checkAdmin.role, "ADMIN", "2.6: Admin role preserved in database");
    console.log("  ✔ [PASS] 2.6: Admin self-demotion guard verified (lockout prevented with 400 Bad Request)");
  }

  // 2.7: Invalid role input validation in /api/admin/users/role -> 400 Bad Request
  {
    activeSession = { user: { id: adminUser.id, email: adminUser.email, role: "ADMIN" } };
    const req = makeRequest("http://localhost:3000/api/admin/users/role", "POST", {
      userId: targetUser.id,
      role: "SUPERUSER_ROOT",
    });
    const res = await adminRoleRoute.POST(req);
    challengeAssertEqual(res.status, 400, "2.7: Invalid role value must return 400 Bad Request");
    console.log("  ✔ [PASS] 2.7: Invalid role string rejected with 400 Bad Request");
  }

  // 2.8: Unauthenticated request to /api/admin/templates/status -> 403 Forbidden
  {
    activeSession = null;
    const req = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      status: "DRAFT",
    });
    const res = await adminTemplateRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.8: Unauthenticated template status update must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.8: Unauthenticated request to /api/admin/templates/status rejected with 403");
  }

  // 2.9: Customer attempting to call /api/admin/templates/status -> 403 Forbidden
  {
    activeSession = { user: { id: customerA.id, email: customerA.email, role: "CUSTOMER" } };
    const req = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      status: "DRAFT",
    });
    const res = await adminTemplateRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.9: Customer calling /api/admin/templates/status must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.9: Customer calling /api/admin/templates/status rejected with 403 Forbidden");
  }

  // 2.10: Lawyer attempting to call /api/admin/templates/status -> 403 Forbidden
  {
    activeSession = { user: { id: lawyerA.id, email: lawyerA.email, role: "LAWYER" } };
    const req = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      status: "DRAFT",
    });
    const res = await adminTemplateRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.10: Lawyer calling /api/admin/templates/status must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.10: Lawyer calling /api/admin/templates/status rejected with 403 Forbidden");
  }

  // 2.11: Unauthenticated request to /api/admin/cases/assign -> 403 Forbidden
  {
    activeSession = null;
    const req = makeRequest("http://localhost:3000/api/admin/cases/assign", "POST", {
      caseId: unassignedCase.id,
      lawyerId: lawyerA.id,
    });
    const res = await adminCasesAssignRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.11: Unauthenticated call to /api/admin/cases/assign must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.11: Unauthenticated call to /api/admin/cases/assign rejected with 403");
  }

  // 2.12: Customer attempting to call /api/admin/cases/assign -> 403 Forbidden
  {
    activeSession = { user: { id: customerA.id, email: customerA.email, role: "CUSTOMER" } };
    const req = makeRequest("http://localhost:3000/api/admin/cases/assign", "POST", {
      caseId: unassignedCase.id,
      lawyerId: lawyerA.id,
    });
    const res = await adminCasesAssignRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.12: Customer calling /api/admin/cases/assign must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.12: Customer calling /api/admin/cases/assign rejected with 403 Forbidden");
  }

  // 2.13: Lawyer attempting to call /api/admin/cases/assign -> 403 Forbidden
  {
    activeSession = { user: { id: lawyerA.id, email: lawyerA.email, role: "LAWYER" } };
    const req = makeRequest("http://localhost:3000/api/admin/cases/assign", "POST", {
      caseId: unassignedCase.id,
      lawyerId: lawyerB.id,
    });
    const res = await adminCasesAssignRoute.POST(req);
    challengeAssertEqual(res.status, 403, "2.13: Lawyer calling /api/admin/cases/assign must return 403 Forbidden");
    console.log("  ✔ [PASS] 2.13: Lawyer calling /api/admin/cases/assign rejected with 403 Forbidden");
  }

  // 2.14: Admin legitimately assigning case to lawyer -> 200 OK + Audit Log
  {
    activeSession = { user: { id: adminUser.id, email: adminUser.email, role: "ADMIN" } };
    const req = makeRequest("http://localhost:3000/api/admin/cases/assign", "POST", {
      caseId: unassignedCase.id,
      lawyerId: lawyerB.id,
    });
    const res = await adminCasesAssignRoute.POST(req);
    challengeAssertEqual(res.status, 200, "2.14: Admin assigning case to lawyer must return 200 OK");
    const json = await res.json();
    challengeAssertEqual(json.success, true, "2.14: Success flag true");
    challengeAssertEqual(json.case.lawyerId, lawyerB.id, "2.14: Case assigned to Lawyer B");

    const audit = await prisma.auditLog.findFirst({
      where: { caseId: unassignedCase.id, action: "ADMIN_CASE_ASSIGNED" },
    });
    challengeAssert(audit, "2.14: ADMIN_CASE_ASSIGNED audit log recorded");
    challengeAssertEqual(audit.actorId, adminUser.id, "2.14: Audit actor is Admin");
    console.log("  ✔ [PASS] 2.14: Admin legitimately assigns case with ADMIN_CASE_ASSIGNED audit log");
  }
}

// -------------------------------------------------------------
// SUITE 3: Template Lifecycle State Transitions & Fuzzing
// -------------------------------------------------------------
async function runSuite3_TemplateLifecycleAndFuzzing() {
  console.log("\n-------------------------------------------------------");
  console.log("SUITE 3: Template & Clause Lifecycle Transitions & Fuzzing");
  console.log("-------------------------------------------------------");

  // Create isolated template and clause in DRAFT
  const ts = Date.now();
  testTemplate = await prisma.template.create({
    data: {
      name: `Lifecycle Test Will Template ${ts}`,
      description: "Ephemeral template for state machine challenge",
      status: "DRAFT",
      versions: {
        create: {
          version: 1,
          content: "Challenge Will v1 Content",
          status: "DRAFT",
        },
      },
    },
    include: { versions: true },
  });
  createdTemplateIds.push(testTemplate.id);

  testClause = await prisma.clause.create({
    data: {
      name: `Lifecycle Test Clause ${ts}`,
      description: "Ephemeral clause for state machine challenge",
      status: "DRAFT",
      versions: {
        create: {
          version: 1,
          content: "Challenge Clause v1 Text",
          status: "DRAFT",
        },
      },
    },
    include: { versions: true },
  });
  createdClauseIds.push(testClause.id);

  activeSession = { user: { id: adminUser.id, email: adminUser.email, role: "ADMIN" } };

  // 3.1: Valid Template Lifecycle State Sequence:
  // DRAFT -> UNDER_REVIEW -> LAWYER_APPROVED -> LOCKED -> ARCHIVED
  const templateTransitions = ["UNDER_REVIEW", "LAWYER_APPROVED", "LOCKED", "ARCHIVED"];

  for (const nextStatus of templateTransitions) {
    const req = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      templateId: testTemplate.id,
      status: nextStatus,
    });
    const res = await adminTemplateRoute.POST(req);
    challengeAssertEqual(res.status, 200, `3.1: Transition template to ${nextStatus} returns 200 OK`);
    const json = await res.json();
    challengeAssertEqual(json.status, nextStatus, `3.1: Returned status is ${nextStatus}`);

    const dbTemplate = await prisma.template.findUnique({
      where: { id: testTemplate.id },
      include: { versions: true },
    });
    challengeAssertEqual(dbTemplate.status, nextStatus, `3.1: Database template status is ${nextStatus}`);
    challengeAssertEqual(dbTemplate.versions[0].status, nextStatus, `3.1: Database templateVersion status is ${nextStatus}`);

    console.log(`  ✔ [PASS] 3.1: Template transitioned successfully to ${nextStatus}`);
  }

  // 3.2: Valid Clause Lifecycle State Sequence:
  // DRAFT -> UNDER_REVIEW -> LAWYER_APPROVED -> LOCKED -> ARCHIVED
  const clauseTransitions = ["UNDER_REVIEW", "LAWYER_APPROVED", "LOCKED", "ARCHIVED"];

  for (const nextStatus of clauseTransitions) {
    const req = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      clauseId: testClause.id,
      status: nextStatus,
    });
    const res = await adminTemplateRoute.POST(req);
    challengeAssertEqual(res.status, 200, `3.2: Transition clause to ${nextStatus} returns 200 OK`);
    const json = await res.json();
    challengeAssertEqual(json.status, nextStatus, `3.2: Returned clause status is ${nextStatus}`);

    const dbClause = await prisma.clause.findUnique({
      where: { id: testClause.id },
      include: { versions: true },
    });
    challengeAssertEqual(dbClause.status, nextStatus, `3.2: Database clause status is ${nextStatus}`);
    challengeAssertEqual(dbClause.versions[0].status, nextStatus, `3.2: Database clauseVersion status is ${nextStatus}`);

    console.log(`  ✔ [PASS] 3.2: Clause transitioned successfully to ${nextStatus}`);
  }

  // 3.3: Fuzzing invalid status values -> rejected with 400 Bad Request
  const fuzzStatuses = [
    "APPROVED",
    "ACTIVE",
    "PENDING",
    "REJECTED",
    "PUBLISHED",
    "DELETED",
    "DRAFT; DROP TABLE User;",
    "undefined",
    "null",
    " ",
    "",
  ];

  for (const badStatus of fuzzStatuses) {
    const req = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      templateId: testTemplate.id,
      status: badStatus,
    });
    const res = await adminTemplateRoute.POST(req);
    challengeAssertEqual(res.status, 400, `3.3: Fuzz status "${badStatus}" must be rejected with 400 Bad Request`);
    const json = await res.json();
    challengeAssert(
      json.error && (json.error.includes("Invalid status") || json.error.includes("Missing required parameters")),
      `3.3: Fuzz status "${badStatus}" returns 400 error message (${json.error})`
    );
  }
  console.log(`  ✔ [PASS] 3.3: Fuzzed ${fuzzStatuses.length} invalid status inputs — all cleanly rejected with 400 Bad Request`);

  // 3.4: Missing required parameters -> 400 Bad Request
  {
    // Neither templateId nor clauseId provided
    const req = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      status: "LAWYER_APPROVED",
    });
    const res = await adminTemplateRoute.POST(req);
    challengeAssertEqual(res.status, 400, "3.4: Missing target ID must return 400 Bad Request");
    console.log("  ✔ [PASS] 3.4: Missing target ID parameter rejected with 400 Bad Request");
  }

  // 3.5: Non-existent target entity IDs -> 404 Not Found
  {
    const reqBadTemplate = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      templateId: "non-existent-template-id-9999",
      status: "LAWYER_APPROVED",
    });
    const resBadTemplate = await adminTemplateRoute.POST(reqBadTemplate);
    challengeAssertEqual(resBadTemplate.status, 404, "3.5: Non-existent template ID must return 404 Not Found");

    const reqBadClause = makeRequest("http://localhost:3000/api/admin/templates/status", "POST", {
      clauseId: "non-existent-clause-id-9999",
      status: "LAWYER_APPROVED",
    });
    const resBadClause = await adminTemplateRoute.POST(reqBadClause);
    challengeAssertEqual(resBadClause.status, 404, "3.5: Non-existent clause ID must return 404 Not Found");
    console.log("  ✔ [PASS] 3.5: Non-existent entity queries rejected gracefully with 404 Not Found");
  }

  // 3.6: Audit logging verification on template & clause status modifications
  {
    const templateApprovedLog = await prisma.auditLog.findFirst({
      where: { entityId: testTemplate.id, action: "TEMPLATE_APPROVED" },
    });
    challengeAssert(templateApprovedLog, "3.6: TEMPLATE_APPROVED audit log recorded");
    challengeAssertEqual(templateApprovedLog.actorId, adminUser.id, "3.6: Actor is admin");

    const templateLockedLog = await prisma.auditLog.findFirst({
      where: { entityId: testTemplate.id, action: "TEMPLATE_LOCKED" },
    });
    challengeAssert(templateLockedLog, "3.6: TEMPLATE_LOCKED audit log recorded");

    const clauseApprovedLog = await prisma.auditLog.findFirst({
      where: { entityId: testClause.id, action: "CLAUSE_APPROVED" },
    });
    challengeAssert(clauseApprovedLog, "3.6: CLAUSE_APPROVED audit log recorded");
    console.log("  ✔ [PASS] 3.6: Immutable audit logs verified for TEMPLATE_APPROVED, TEMPLATE_LOCKED, and CLAUSE_APPROVED");
  }
}

// -------------------------------------------------------------
// SUITE 4: Edge Middleware RBAC & Route Protection Matrix
// -------------------------------------------------------------
async function runSuite4_EdgeMiddlewareRBAC() {
  console.log("\n-------------------------------------------------------");
  console.log("SUITE 4: Edge Middleware RBAC & Route Protection Matrix");
  console.log("-------------------------------------------------------");

  // Helper to run middleware with simulated token
  async function testMiddleware(urlPath, role) {
    activeJwtToken = role ? { role } : null;
    const req = new NextRequest(`http://localhost:3000${urlPath}`);
    const res = await edgeMiddleware(req);
    return {
      status: res?.status || 200,
      location: res?.headers.get("location") || null,
    };
  }

  // 4.1: Unauthenticated request to /admin/dashboard -> redirect to /login
  {
    const res = await testMiddleware("/admin/dashboard", null);
    challengeAssertEqual(res.status, 307, "4.1: Unauth access to /admin/dashboard must 307 redirect");
    challengeAssert(res.location && res.location.includes("/login"), "4.1: Redirects to /login");
    console.log("  ✔ [PASS] 4.1: Unauthenticated request to /admin/dashboard redirects to /login");
  }

  // 4.2: Customer accessing /admin/dashboard -> redirect to /customer/dashboard
  {
    const res = await testMiddleware("/admin/dashboard", "CUSTOMER");
    challengeAssertEqual(res.status, 307, "4.2: Customer accessing /admin/dashboard must 307 redirect");
    challengeAssert(res.location && res.location.includes("/customer/dashboard"), "4.2: Redirects to /customer/dashboard");
    console.log("  ✔ [PASS] 4.2: Customer accessing /admin/dashboard redirects to /customer/dashboard");
  }

  // 4.3: Lawyer accessing /admin/dashboard -> redirect to /lawyer/dashboard
  {
    const res = await testMiddleware("/admin/dashboard", "LAWYER");
    challengeAssertEqual(res.status, 307, "4.3: Lawyer accessing /admin/dashboard must 307 redirect");
    challengeAssert(res.location && res.location.includes("/lawyer/dashboard"), "4.3: Redirects to /lawyer/dashboard");
    console.log("  ✔ [PASS] 4.3: Lawyer accessing /admin/dashboard redirects to /lawyer/dashboard");
  }

  // 4.4: Complete Admin Sub-route protection for Customer
  const adminRoutes = ["/admin/users", "/admin/cases", "/admin/templates", "/admin/audit-logs"];
  for (const route of adminRoutes) {
    const res = await testMiddleware(route, "CUSTOMER");
    challengeAssertEqual(res.status, 307, `4.4: Customer accessing ${route} must 307 redirect`);
    challengeAssert(res.location && res.location.includes("/customer/dashboard"), `4.4: ${route} redirects to /customer/dashboard`);
  }
  console.log(`  ✔ [PASS] 4.4: Customer access to all ${adminRoutes.length} admin sub-routes cleanly redirected to /customer/dashboard`);

  // 4.5: Complete Admin Sub-route protection for Lawyer
  for (const route of adminRoutes) {
    const res = await testMiddleware(route, "LAWYER");
    challengeAssertEqual(res.status, 307, `4.5: Lawyer accessing ${route} must 307 redirect`);
    challengeAssert(res.location && res.location.includes("/lawyer/dashboard"), `4.5: ${route} redirects to /lawyer/dashboard`);
  }
  console.log(`  ✔ [PASS] 4.5: Lawyer access to all ${adminRoutes.length} admin sub-routes cleanly redirected to /lawyer/dashboard`);

  // 4.6: Unauthenticated request to /lawyer/dashboard -> redirect to /login
  {
    const res = await testMiddleware("/lawyer/dashboard", null);
    challengeAssertEqual(res.status, 307, "4.6: Unauth access to /lawyer/dashboard must 307 redirect");
    challengeAssert(res.location && res.location.includes("/login"), "4.6: Redirects to /login");
    console.log("  ✔ [PASS] 4.6: Unauthenticated request to /lawyer/dashboard redirects to /login");
  }

  // 4.7: Customer accessing /lawyer/dashboard -> redirect to /customer/dashboard
  {
    const res = await testMiddleware("/lawyer/dashboard", "CUSTOMER");
    challengeAssertEqual(res.status, 307, "4.7: Customer accessing /lawyer/dashboard must 307 redirect");
    challengeAssert(res.location && res.location.includes("/customer/dashboard"), "4.7: Redirects to /customer/dashboard");
    console.log("  ✔ [PASS] 4.7: Customer accessing /lawyer/dashboard redirects to /customer/dashboard");
  }

  // 4.8: Lawyer accessing /lawyer/dashboard -> pass through (status 200, no redirect)
  {
    const res = await testMiddleware("/lawyer/dashboard", "LAWYER");
    challengeAssertEqual(res.status, 200, "4.8: Lawyer accessing /lawyer/dashboard allowed");
    challengeAssertEqual(res.location, null, "4.8: No redirect location");
    console.log("  ✔ [PASS] 4.8: Lawyer accessing /lawyer/dashboard permitted without redirect");
  }

  // 4.9: Admin accessing /admin/dashboard and /lawyer/dashboard -> pass through (status 200, no redirect)
  {
    const resAdmin = await testMiddleware("/admin/dashboard", "ADMIN");
    challengeAssertEqual(resAdmin.status, 200, "4.9: Admin accessing /admin/dashboard allowed");
    challengeAssertEqual(resAdmin.location, null, "4.9: No redirect location");

    const resLawyer = await testMiddleware("/lawyer/dashboard", "ADMIN");
    challengeAssertEqual(resLawyer.status, 200, "4.9: Admin accessing /lawyer/dashboard allowed");
    challengeAssertEqual(resLawyer.location, null, "4.9: No redirect location");
    console.log("  ✔ [PASS] 4.9: Admin permitted to access /admin/dashboard and /lawyer/dashboard without redirect");
  }

  // 4.10: Lawyer accessing /customer/dashboard -> redirect to /lawyer/dashboard
  {
    const res = await testMiddleware("/customer/dashboard", "LAWYER");
    challengeAssertEqual(res.status, 307, "4.10: Lawyer accessing /customer/dashboard must 307 redirect");
    challengeAssert(res.location && res.location.includes("/lawyer/dashboard"), "4.10: Redirects to /lawyer/dashboard");
    console.log("  ✔ [PASS] 4.10: Lawyer accessing /customer/dashboard redirects to /lawyer/dashboard");
  }
}

// -------------------------------------------------------------
// CLEANUP & TEARDOWN
// -------------------------------------------------------------
async function cleanupFixtures() {
  console.log("\n-------------------------------------------------------");
  console.log("CLEANING UP TEST FIXTURES");
  console.log("-------------------------------------------------------");

  if (createdCaseIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.document.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.lawyerReview.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.payment.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.questionnaireAnswer.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.case.deleteMany({ where: { id: { in: createdCaseIds } } });
  }

  if (createdTemplateIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdTemplateIds } } });
    await prisma.templateVersion.deleteMany({ where: { templateId: { in: createdTemplateIds } } });
    await prisma.template.deleteMany({ where: { id: { in: createdTemplateIds } } });
  }

  if (createdClauseIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdClauseIds } } });
    await prisma.clauseVersion.deleteMany({ where: { clauseId: { in: createdClauseIds } } });
    await prisma.clause.deleteMany({ where: { id: { in: createdClauseIds } } });
  }

  if (createdUserIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: createdUserIds } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }

  await prisma.$disconnect();
  console.log("Cleanup completed successfully.");
}

async function main() {
  const startTime = Date.now();
  try {
    await setupFixtures();
    await runSuite1_LawyerRBACAndIDOR();
    await runSuite2_AdminRBACAndPrivilegeEscalation();
    await runSuite3_TemplateLifecycleAndFuzzing();
    await runSuite4_EdgeMiddlewareRBAC();

    const elapsed = Date.now() - startTime;
    console.log("\n=======================================================");
    console.log(`  ALL CHALLENGE TESTS PASSED (${assertionCount} assertions verified in ${elapsed}ms)`);
    console.log("  VERDICT: APPROVE");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("\n❌ CHALLENGE TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    await cleanupFixtures().catch((e) => console.error("Cleanup error:", e));
  }
}

main();
