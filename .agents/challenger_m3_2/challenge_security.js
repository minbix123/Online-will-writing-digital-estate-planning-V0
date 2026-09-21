/**
 * Empirical Security & Workflow Adversarial Challenge Suite (Milestone 3)
 * Author: Empirical Challenger 2 (challenger_m3_2)
 *
 * Mandate:
 * 1. IDOR vulnerability fuzzing:
 *    - User A attempting to POST / save to User B's case -> MUST reject with 403 Forbidden.
 *    - Unauthenticated client attempting to POST to /api/questionnaire/save -> MUST reject with 401 Unauthorized.
 *    - Unauthenticated client attempting to POST or GET /api/cases -> MUST reject with 401 Unauthorized.
 * 2. Registration security fuzzing:
 *    - Duplicate email registration attempt -> MUST reject with 409 Conflict.
 *    - Short password (<6 chars) -> MUST reject with 400 Bad Request.
 *    - Verify passwords stored in database are valid bcrypt hashes ($2a$10$...) and NEVER plaintext.
 *    - Verify newly registered user can authenticate and create a case.
 * 3. Conditional Branching & Downstream Rule Engine stress test:
 *    - hasChildren = "No" -> guardian hidden.
 *    - hasChildren = "Yes" & hasMinorChildren = "No" -> guardian hidden.
 *    - hasChildren = "Yes" & hasMinorChildren = "Yes" -> guardian active; LegalWorkflowEngine generates GUARDIAN_REQUIRED flag.
 */

const path = require("path");

// Register ts-node and tsconfig-paths for TypeScript module resolution
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
  baseUrl: path.resolve(__dirname, "../.."),
  paths: {
    "@/*": ["src/*"],
  },
});

const assert = require("assert");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

// Intercept next-auth/next getServerSession for simulated server sessions
const nextAuthNext = require("next-auth/next");
const nextAuth = require("next-auth");

let currentSession = null;
nextAuthNext.getServerSession = async () => currentSession;
nextAuth.getServerSession = async () => currentSession;

// Import application routes and modules
const registerRoute = require("../../src/app/api/auth/register/route.ts");
const casesRoute = require("../../src/app/api/cases/route.ts");
const saveRoute = require("../../src/app/api/questionnaire/save/route.ts");
const { authOptions } = require("../../src/lib/auth.ts");
const { questionnaireConfig } = require("../../src/lib/questionnaire.ts");
const { LegalWorkflowEngine } = require("../../src/server/legal-workflows/index.ts");

const credsProvider = authOptions.providers.find(
  (p) => p.id === "credentials" || p.name === "Credentials"
);
const authorize = credsProvider.options?.authorize || credsProvider.authorize;

const prisma = new PrismaClient();

// Test reporting harness
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
};

function recordTest(name, category, passed, expected, actual, details) {
  stats.total++;
  if (passed) {
    stats.passed++;
    console.log(`  ✔ [PASS] [${category}] ${name}`);
  } else {
    stats.failed++;
    const failInfo = { name, category, expected, actual, details };
    stats.failures.push(failInfo);
    console.error(`  ✖ [FAIL] [${category}] ${name}`);
    console.error(`         Expected: ${JSON.stringify(expected)}`);
    console.error(`         Actual:   ${JSON.stringify(actual)}`);
    if (details) console.error(`         Details:  ${details}`);
  }
}

// Evaluation helper matching client QuestionnaireEngine logic
function evaluateCondition(condition, answers) {
  if (!condition || !condition.field) return true;
  const actualVal = answers[condition.field];
  const expectedVal = condition.value;

  switch (condition.operator) {
    case "equals":
      return actualVal === expectedVal;
    case "not_equals":
      return actualVal !== expectedVal;
    case "includes":
      return Array.isArray(actualVal) && actualVal.includes(expectedVal);
    default:
      return actualVal === expectedVal;
  }
}

function evaluateConditions(conditions, answers) {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, answers));
}

function isSectionActive(sectionId, answers) {
  const section = questionnaireConfig.sections.find((s) => s.id === sectionId);
  if (!section) return false;
  return evaluateConditions(section.conditions, answers);
}

function isQuestionActive(sectionId, questionId, answers) {
  const section = questionnaireConfig.sections.find((s) => s.id === sectionId);
  if (!section) return false;
  if (!evaluateConditions(section.conditions, answers)) return false;
  const q = (section.questions || []).find((quest) => quest.id === questionId);
  if (!q) return false;
  return evaluateConditions(q.conditions, answers);
}

async function runEmpiricalChallenge() {
  console.log("========================================================================");
  console.log("CHALLENGER 2: EMPIRICAL SECURITY & WORKFLOW ADVERSARIAL SUITE");
  console.log("Milestone 3 — Customer Portal, Case Lifecycle & Debounced Questionnaire Engine");
  console.log("========================================================================\n");

  const cleanupUserIds = [];
  const cleanupCaseIds = [];

  const timestamp = Date.now();

  try {
    // ========================================================================
    // SUITE 1: REGISTRATION SECURITY FUZZING & PASSWORD HASHING INTEGRITY
    // ========================================================================
    console.log("========================================================================");
    console.log("SUITE 1: REGISTRATION SECURITY FUZZING & PASSWORD HASHING INTEGRITY");
    console.log("========================================================================");

    const primaryEmail = `fuzz_reg_${timestamp}@challenger-test.com`;
    const primaryPassword = "ComplexPassword@2026";
    let registeredUser = null;

    // 1.1 Valid Registration creates user and returns sanitized payload
    {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Challenger Test Subject",
          email: primaryEmail,
          password: primaryPassword,
        }),
      });
      const res = await registerRoute.POST(req);
      const data = await res.json();

      recordTest(
        "Valid registration returns HTTP 201 Created",
        "Registration Security",
        res.status === 201,
        201,
        res.status
      );

      recordTest(
        "Registration response returns sanitized user object without password or hash",
        "Registration Security",
        !!data.user && data.user.email === primaryEmail && data.user.password === undefined,
        { email: primaryEmail, password: undefined },
        { email: data.user?.email, password: data.user?.password }
      );

      registeredUser = data.user;
      if (registeredUser?.id) cleanupUserIds.push(registeredUser.id);
    }

    // 1.2 Bcrypt Hash Verification in SQLite Database
    {
      const userInDb = await prisma.user.findUnique({ where: { email: primaryEmail } });
      const isBcryptHash = typeof userInDb?.password === "string" &&
        /^\$2[ab]\$\d{2}\$[A-Za-z0-9./]{53}$/.test(userInDb.password);

      recordTest(
        "Database stores valid bcrypt hash ($2a$10$ / $2b$10, 60 chars)",
        "Bcrypt & DB Security",
        isBcryptHash,
        true,
        isBcryptHash,
        `Prefix: ${userInDb?.password?.substring(0, 7)}... len: ${userInDb?.password?.length}`
      );

      recordTest(
        "Plaintext password is NEVER stored in database",
        "Bcrypt & DB Security",
        userInDb?.password !== primaryPassword,
        true,
        userInDb?.password !== primaryPassword
      );

      const compareSuccess = await bcrypt.compare(primaryPassword, userInDb?.password || "");
      recordTest(
        "bcrypt.compare verifies plaintext password against stored hash",
        "Bcrypt & DB Security",
        compareSuccess === true,
        true,
        compareSuccess
      );

      const compareFail = await bcrypt.compare("WrongPassword123!", userInDb?.password || "");
      recordTest(
        "bcrypt.compare rejects incorrect password",
        "Bcrypt & DB Security",
        compareFail === false,
        false,
        compareFail
      );
    }

    // 1.3 Audit Log creation on registration
    {
      const regAudit = await prisma.auditLog.findFirst({
        where: {
          action: "USER_REGISTERED",
          entityId: registeredUser?.id,
        },
      });

      recordTest(
        "USER_REGISTERED audit log record created with correct entityId and actorId",
        "Audit Logging",
        !!regAudit && regAudit.actorId === registeredUser?.id,
        true,
        !!regAudit
      );
    }

    // 1.4 Duplicate Email Registration Fuzzing (MUST reject with 409 Conflict)
    {
      // A: Exact match duplicate
      const reqExact = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Imposter User",
          email: primaryEmail,
          password: "AnotherPassword123",
        }),
      });
      const resExact = await registerRoute.POST(reqExact);
      recordTest(
        "Duplicate email registration rejected with HTTP 409 Conflict (Exact match)",
        "Registration Fuzzing",
        resExact.status === 409,
        409,
        resExact.status
      );

      // B: Case-insensitive duplicate (e.g. UPPERCASE)
      const reqUpper = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Imposter User Uppercase",
          email: primaryEmail.toUpperCase(),
          password: "AnotherPassword123",
        }),
      });
      const resUpper = await registerRoute.POST(reqUpper);
      recordTest(
        "Duplicate email registration rejected with HTTP 409 Conflict (Uppercase variant)",
        "Registration Fuzzing",
        resUpper.status === 409,
        409,
        resUpper.status
      );

      // C: Whitespace-padded duplicate
      const reqWhitespace = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Imposter User Spaced",
          email: `   ${primaryEmail}   `,
          password: "AnotherPassword123",
        }),
      });
      const resWhitespace = await registerRoute.POST(reqWhitespace);
      recordTest(
        "Duplicate email registration rejected with HTTP 409 Conflict (Whitespace padded)",
        "Registration Fuzzing",
        resWhitespace.status === 409,
        409,
        resWhitespace.status
      );
    }

    // 1.5 Short Password (<6 chars) Fuzzing (MUST reject with 400 Bad Request)
    {
      const shortPasswords = [
        { pw: "", desc: "0 chars (empty string)" },
        { pw: "a", desc: "1 char ('a')" },
        { pw: "1234", desc: "4 chars ('1234')" },
        { pw: "abcde", desc: "5 chars ('abcde')" },
      ];

      for (const item of shortPasswords) {
        const req = new Request("http://localhost:3000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Short Pw Test",
            email: `short_pw_${timestamp}_${item.pw.length}@challenger-test.com`,
            password: item.pw,
          }),
        });
        const res = await registerRoute.POST(req);
        recordTest(
          `Password < 6 chars rejected with HTTP 400 Bad Request [${item.desc}]`,
          "Password Boundary Fuzzing",
          res.status === 400,
          400,
          res.status
        );
      }

      // Boundary test: exactly 6 chars MUST be accepted (HTTP 201)
      const boundaryEmail = `boundary_pw_${timestamp}@challenger-test.com`;
      const reqBoundary = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Boundary Pw Test",
          email: boundaryEmail,
          password: "123456",
        }),
      });
      const resBoundary = await registerRoute.POST(reqBoundary);
      const boundaryData = await resBoundary.json();
      if (boundaryData.user?.id) cleanupUserIds.push(boundaryData.user.id);

      recordTest(
        "Password exactly 6 chars is accepted with HTTP 201 Created (Boundary check)",
        "Password Boundary Fuzzing",
        resBoundary.status === 201,
        201,
        resBoundary.status
      );
    }

    // 1.6 Malformed & Boundary Registration Input Fuzzing
    {
      const malformedCases = [
        { body: null, desc: "Null body" },
        { body: {}, desc: "Empty JSON body" },
        { body: { name: "", email: `bad_${timestamp}@test.com`, password: "validPassword1" }, desc: "Empty name string" },
        { body: { name: "   ", email: `bad_${timestamp}@test.com`, password: "validPassword1" }, desc: "Whitespace-only name" },
        { body: { name: "Test User", email: "invalid-email-no-at", password: "validPassword1" }, desc: "Invalid email format (no @)" },
        { body: { name: "Test User", email: "invalid@no-domain", password: "validPassword1" }, desc: "Invalid email format (no dot domain)" },
        { body: { name: "Test User", email: `valid_${timestamp}@test.com`, password: null }, desc: "Null password" },
        { body: { name: "Test User", email: `valid_${timestamp}@test.com`, password: 12345678 }, desc: "Numeric password instead of string" },
      ];

      for (const tc of malformedCases) {
        const req = new Request("http://localhost:3000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: tc.body ? JSON.stringify(tc.body) : "invalid json",
        });
        const res = await registerRoute.POST(req);
        recordTest(
          `Malformed input rejected with HTTP 400 Bad Request [${tc.desc}]`,
          "Input Validation Fuzzing",
          res.status === 400,
          400,
          res.status
        );
      }
    }

    // 1.7 Newly registered user can authenticate and create a case
    let newlyCreatedCase = null;
    {
      // Test NextAuth CredentialsProvider authorize() with new user credentials
      const authUser = await authorize({
        email: primaryEmail,
        password: primaryPassword,
      });

      recordTest(
        "Newly registered user authenticates successfully via NextAuth authorize()",
        "Registration & Auth Flow",
        !!authUser && authUser.email === primaryEmail && authUser.role === "CUSTOMER",
        { email: primaryEmail, role: "CUSTOMER" },
        { email: authUser?.email, role: authUser?.role }
      );

      // Now create a case using authenticated session of the new user
      currentSession = { user: { id: registeredUser.id, email: primaryEmail, role: "CUSTOMER" } };
      const reqCase = new Request("http://localhost:3000/api/cases", { method: "POST" });
      const resCase = await casesRoute.POST(reqCase);
      const caseData = await resCase.json();

      recordTest(
        "Newly registered user can create a case via POST /api/cases (HTTP 201)",
        "Registration & Auth Flow",
        resCase.status === 201 && caseData.case?.status === "DRAFT",
        { status: 201, caseStatus: "DRAFT" },
        { status: resCase.status, caseStatus: caseData.case?.status }
      );

      newlyCreatedCase = caseData.case;
      if (newlyCreatedCase?.id) cleanupCaseIds.push(newlyCreatedCase.id);

      // Verify CASE_CREATED audit log
      const caseAudit = await prisma.auditLog.findFirst({
        where: {
          action: "CASE_CREATED",
          entityId: newlyCreatedCase?.id,
        },
      });

      recordTest(
        "CASE_CREATED audit log recorded in database for newly created case",
        "Audit Logging",
        !!caseAudit && caseAudit.actorId === registeredUser.id,
        true,
        !!caseAudit
      );
    }

    // ========================================================================
    // SUITE 2: IDOR VULNERABILITY FUZZING & AUTHORIZATION BOUNDARIES
    // ========================================================================
    console.log("\n========================================================================");
    console.log("SUITE 2: IDOR VULNERABILITY FUZZING & AUTHORIZATION BOUNDARIES");
    console.log("========================================================================");

    // Setup User A (Victim) and User B (Attacker)
    const userA = await prisma.user.create({
      data: {
        name: "Victim User A",
        email: `victim_a_${timestamp}@challenger-test.com`,
        password: await bcrypt.hash("Password123!", 10),
        role: "CUSTOMER",
      },
    });
    cleanupUserIds.push(userA.id);

    const userB = await prisma.user.create({
      data: {
        name: "Attacker User B",
        email: `attacker_b_${timestamp}@challenger-test.com`,
        password: await bcrypt.hash("Password123!", 10),
        role: "CUSTOMER",
      },
    });
    cleanupUserIds.push(userB.id);

    // Case owned by User A (Victim)
    const caseA = await prisma.case.create({
      data: {
        customerId: userA.id,
        status: "DRAFT",
        flags: "STANDARD",
      },
    });
    cleanupCaseIds.push(caseA.id);

    // Initial legitimate answer saved to Case A by User A
    await prisma.questionnaireAnswer.create({
      data: {
        caseId: caseA.id,
        questionId: "personal_info",
        sectionId: "personal_info",
        questionnaireVersion: "v1.0",
        answerData: JSON.stringify({ fullName: "Legitimate User A", city: "Mumbai" }),
      },
    });

    // Case owned by User B (Attacker)
    const caseB = await prisma.case.create({
      data: {
        customerId: userB.id,
        status: "DRAFT",
        flags: "STANDARD",
      },
    });
    cleanupCaseIds.push(caseB.id);

    // 2.1 IDOR Attack: User B (Attacker) attempts to POST / save to User A's case
    {
      currentSession = { user: { id: userB.id, email: userB.email, role: "CUSTOMER" } };

      const attackPayloads = [
        {
          desc: "Standard personal_info overwrite attempt",
          body: {
            caseId: caseA.id,
            sectionId: "personal_info",
            data: { fullName: "Hacked by Attacker B", city: "Nowhere" },
          },
        },
        {
          desc: "Injecting malicious guardian into victim case",
          body: {
            caseId: caseA.id,
            sectionId: "guardian",
            data: { guardianName: "Malicious Guardian", guardianRelationship: "Fraud" },
          },
        },
        {
          desc: "Empty payload tampering attempt",
          body: {
            caseId: caseA.id,
            sectionId: "personal_info",
            data: {},
          },
        },
      ];

      for (const atk of attackPayloads) {
        const req = new Request("http://localhost:3000/api/questionnaire/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(atk.body),
        });

        const res = await saveRoute.POST(req);
        const data = await res.json();

        recordTest(
          `IDOR attack rejected with HTTP 403 Forbidden [${atk.desc}]`,
          "IDOR Vulnerability Fuzzing",
          res.status === 403 && data.error === "Forbidden: You do not own this case",
          { status: 403, error: "Forbidden: You do not own this case" },
          { status: res.status, error: data.error }
        );
      }

      // Verify Victim's data remains 100% UNMODIFIED in database
      const victimAnswerInDb = await prisma.questionnaireAnswer.findUnique({
        where: {
          caseId_questionId: {
            caseId: caseA.id,
            questionId: "personal_info",
          },
        },
      });
      const parsedVictimAnswer = JSON.parse(victimAnswerInDb.answerData);

      recordTest(
        "Victim case data untouched in database after IDOR attack attempts",
        "IDOR Integrity",
        parsedVictimAnswer.fullName === "Legitimate User A" && parsedVictimAnswer.city === "Mumbai",
        { fullName: "Legitimate User A", city: "Mumbai" },
        parsedVictimAnswer
      );

      // Verify attacker was NOT able to inject guardian section
      const guardianInDb = await prisma.questionnaireAnswer.findUnique({
        where: {
          caseId_questionId: {
            caseId: caseA.id,
            questionId: "guardian",
          },
        },
      });
      recordTest(
        "Attacker injected section was NOT created in victim case",
        "IDOR Integrity",
        guardianInDb === null,
        null,
        guardianInDb
      );
    }

    // 2.2 Unauthenticated client attempting to POST to /api/questionnaire/save (MUST reject with 401)
    {
      currentSession = null; // Unauthenticated

      const unauthReq = new Request("http://localhost:3000/api/questionnaire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseA.id,
          sectionId: "personal_info",
          data: { fullName: "Anonymous Attacker" },
        }),
      });

      const unauthRes = await saveRoute.POST(unauthReq);
      const unauthData = await unauthRes.json();

      recordTest(
        "Unauthenticated POST to /api/questionnaire/save rejected with HTTP 401 Unauthorized",
        "Unauthenticated API Protection",
        unauthRes.status === 401 && unauthData.error === "Unauthorized",
        { status: 401, error: "Unauthorized" },
        { status: unauthRes.status, error: unauthData.error }
      );
    }

    // 2.3 Unauthenticated client attempting to GET /api/cases (MUST reject with 401)
    {
      currentSession = null; // Unauthenticated

      const unauthGetCasesReq = new Request("http://localhost:3000/api/cases", { method: "GET" });
      const unauthGetCasesRes = await casesRoute.GET(unauthGetCasesReq);
      const unauthGetCasesData = await unauthGetCasesRes.json();

      recordTest(
        "Unauthenticated GET /api/cases rejected with HTTP 401 Unauthorized",
        "Unauthenticated API Protection",
        unauthGetCasesRes.status === 401 && unauthGetCasesData.error === "Unauthorized",
        { status: 401, error: "Unauthorized" },
        { status: unauthGetCasesRes.status, error: unauthGetCasesData.error }
      );
    }

    // 2.4 Unauthenticated client attempting to POST to /api/cases (MUST reject with 401)
    {
      currentSession = null; // Unauthenticated

      const unauthPostCasesReq = new Request("http://localhost:3000/api/cases", { method: "POST" });
      const unauthPostCasesRes = await casesRoute.POST(unauthPostCasesReq);
      const unauthPostCasesData = await unauthPostCasesRes.json();

      recordTest(
        "Unauthenticated POST /api/cases rejected with HTTP 401 Unauthorized",
        "Unauthenticated API Protection",
        unauthPostCasesRes.status === 401 && unauthPostCasesData.error === "Unauthorized",
        { status: 401, error: "Unauthorized" },
        { status: unauthPostCasesRes.status, error: unauthPostCasesData.error }
      );
    }

    // 2.5 Customer Isolation: GET /api/cases strictly filters cases by customerId
    {
      // Query as User A -> must only see Case A
      currentSession = { user: { id: userA.id, email: userA.email, role: "CUSTOMER" } };
      const getResA = await casesRoute.GET(new Request("http://localhost:3000/api/cases"));
      const dataA = await getResA.json();

      const userACaseIds = dataA.cases.map((c) => c.id);
      recordTest(
        "User A only receives their own cases from GET /api/cases",
        "Customer Isolation",
        userACaseIds.includes(caseA.id) && !userACaseIds.includes(caseB.id),
        true,
        userACaseIds.includes(caseA.id) && !userACaseIds.includes(caseB.id)
      );

      // Query as User B -> must only see Case B
      currentSession = { user: { id: userB.id, email: userB.email, role: "CUSTOMER" } };
      const getResB = await casesRoute.GET(new Request("http://localhost:3000/api/cases"));
      const dataB = await getResB.json();

      const userBCaseIds = dataB.cases.map((c) => c.id);
      recordTest(
        "User B only receives their own cases from GET /api/cases",
        "Customer Isolation",
        userBCaseIds.includes(caseB.id) && !userBCaseIds.includes(caseA.id),
        true,
        userBCaseIds.includes(caseB.id) && !userBCaseIds.includes(caseA.id)
      );
    }

    // 2.6 Legitimate questionnaire save by owner succeeds (HTTP 200)
    {
      currentSession = { user: { id: userA.id, email: userA.email, role: "CUSTOMER" } };
      const legitReq = new Request("http://localhost:3000/api/questionnaire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseA.id,
          sectionId: "personal_info",
          data: { fullName: "Victim User A Updated", city: "Bengaluru" },
        }),
      });

      const legitRes = await saveRoute.POST(legitReq);
      const legitData = await legitRes.json();

      recordTest(
        "Legitimate save by case owner succeeds with HTTP 200",
        "Questionnaire Authorization",
        legitRes.status === 200 && legitData.success === true,
        { status: 200, success: true },
        { status: legitRes.status, success: legitData.success }
      );
    }

    // 2.7 Non-existent Case ID returns 404 Not Found
    {
      currentSession = { user: { id: userA.id, email: userA.email, role: "CUSTOMER" } };
      const notFoundReq = new Request("http://localhost:3000/api/questionnaire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: "non_existent_case_999999",
          sectionId: "personal_info",
          data: { test: true },
        }),
      });

      const notFoundRes = await saveRoute.POST(notFoundReq);
      recordTest(
        "Saving to non-existent case returns HTTP 404 Not Found",
        "Questionnaire Validation",
        notFoundRes.status === 404,
        404,
        notFoundRes.status
      );
    }

    // 2.8 Missing required fields in save request returns 400 Bad Request
    {
      currentSession = { user: { id: userA.id, email: userA.email, role: "CUSTOMER" } };
      const missingReq = new Request("http://localhost:3000/api/questionnaire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseA.id,
          // missing sectionId
        }),
      });

      const missingRes = await saveRoute.POST(missingReq);
      recordTest(
        "Saving with missing sectionId returns HTTP 400 Bad Request",
        "Questionnaire Validation",
        missingRes.status === 400,
        400,
        missingRes.status
      );
    }

    // 2.9 Admin override permitted on save route
    {
      currentSession = { user: { id: "admin_override_user", email: "admin@demo.com", role: "ADMIN" } };
      const adminReq = new Request("http://localhost:3000/api/questionnaire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseA.id,
          sectionId: "personal_info",
          data: { fullName: "Victim User A", notes: "Admin audited" },
        }),
      });

      const adminRes = await saveRoute.POST(adminReq);
      recordTest(
        "Admin role is permitted to update case on save route (RBAC oversight)",
        "RBAC Oversight",
        adminRes.status === 200,
        200,
        adminRes.status
      );
    }

    // ========================================================================
    // SUITE 3: CONDITIONAL BRANCHING & DOWNSTREAM RULE ENGINE STRESS TEST
    // ========================================================================
    console.log("\n========================================================================");
    console.log("SUITE 3: CONDITIONAL BRANCHING & DOWNSTREAM RULE ENGINE STRESS TEST");
    console.log("========================================================================");

    // Mandate Scenario 1: hasChildren = "No" -> guardian hidden
    {
      const answersScenario1 = {
        fullName: "Test Citizen",
        hasChildren: "No",
      };

      const isHasMinorChildrenActive = isQuestionActive("children", "hasMinorChildren", answersScenario1);
      const isGuardianActive = isSectionActive("guardian", answersScenario1);
      const workflowResult1 = await LegalWorkflowEngine.evaluate(answersScenario1);

      recordTest(
        "hasChildren = 'No' -> hasMinorChildren question is hidden/inactive",
        "Conditional Branching",
        isHasMinorChildrenActive === false,
        false,
        isHasMinorChildrenActive
      );

      recordTest(
        "hasChildren = 'No' -> guardian nomination section is hidden/inactive",
        "Conditional Branching",
        isGuardianActive === false,
        false,
        isGuardianActive
      );

      recordTest(
        "hasChildren = 'No' -> LegalWorkflowEngine does NOT generate GUARDIAN_REQUIRED flag",
        "Downstream Rule Engine",
        !workflowResult1.flags.includes("GUARDIAN_REQUIRED"),
        true,
        !workflowResult1.flags.includes("GUARDIAN_REQUIRED")
      );

      recordTest(
        "hasChildren = 'No' -> LegalWorkflowEngine retains STANDARD flag",
        "Downstream Rule Engine",
        workflowResult1.flags.includes("STANDARD"),
        true,
        workflowResult1.flags.includes("STANDARD")
      );
    }

    // Mandate Scenario 2: hasChildren = "Yes" & hasMinorChildren = "No" -> guardian hidden
    {
      const answersScenario2 = {
        fullName: "Test Citizen",
        hasChildren: "Yes",
        hasMinorChildren: "No",
      };

      const isHasMinorChildrenActive = isQuestionActive("children", "hasMinorChildren", answersScenario2);
      const isGuardianActive = isSectionActive("guardian", answersScenario2);
      const workflowResult2 = await LegalWorkflowEngine.evaluate(answersScenario2);

      recordTest(
        "hasChildren = 'Yes' -> hasMinorChildren question is visible/active",
        "Conditional Branching",
        isHasMinorChildrenActive === true,
        true,
        isHasMinorChildrenActive
      );

      recordTest(
        "hasChildren = 'Yes' & hasMinorChildren = 'No' -> guardian section is hidden/inactive",
        "Conditional Branching",
        isGuardianActive === false,
        false,
        isGuardianActive
      );

      recordTest(
        "hasChildren = 'Yes' & hasMinorChildren = 'No' -> LegalWorkflowEngine does NOT generate GUARDIAN_REQUIRED",
        "Downstream Rule Engine",
        !workflowResult2.flags.includes("GUARDIAN_REQUIRED"),
        true,
        !workflowResult2.flags.includes("GUARDIAN_REQUIRED")
      );
    }

    // Mandate Scenario 3: hasChildren = "Yes" & hasMinorChildren = "Yes" -> guardian active; GUARDIAN_REQUIRED flag
    {
      const answersScenario3 = {
        fullName: "Test Citizen",
        hasChildren: "Yes",
        hasMinorChildren: "Yes",
      };

      const isHasMinorChildrenActive = isQuestionActive("children", "hasMinorChildren", answersScenario3);
      const isGuardianActive = isSectionActive("guardian", answersScenario3);
      const workflowResult3 = await LegalWorkflowEngine.evaluate(answersScenario3);

      recordTest(
        "hasChildren = 'Yes' & hasMinorChildren = 'Yes' -> guardian section is activated",
        "Conditional Branching",
        isGuardianActive === true,
        true,
        isGuardianActive
      );

      recordTest(
        "hasChildren = 'Yes' & hasMinorChildren = 'Yes' -> LegalWorkflowEngine generates GUARDIAN_REQUIRED flag",
        "Downstream Rule Engine",
        workflowResult3.flags.includes("GUARDIAN_REQUIRED"),
        true,
        workflowResult3.flags.includes("GUARDIAN_REQUIRED")
      );

      recordTest(
        "hasChildren = 'Yes' & hasMinorChildren = 'Yes' -> flags include both STANDARD and GUARDIAN_REQUIRED",
        "Downstream Rule Engine",
        workflowResult3.flags.includes("STANDARD") && workflowResult3.flags.includes("GUARDIAN_REQUIRED"),
        true,
        workflowResult3.flags
      );
    }

    // Downstream Rule Engine Permutations & Multi-flag Stress Test
    {
      const complexAnswers = {
        fullName: "NRI Citizen with Complex Estate",
        maritalStatus: "Other",
        hasChildren: "Yes",
        hasMinorChildren: "Yes",
        isNRI: "Yes",
        assetsList: [{ type: "BusinessInterests", description: "Tech Startup Equity", ownershipPercentage: 100 }],
        hasExistingWill: "Yes",
      };

      const complexResult = await LegalWorkflowEngine.evaluate(complexAnswers);

      recordTest(
        "Complex case triggers all expected legal flags concurrently",
        "Rule Engine Stress Test",
        complexResult.flags.includes("STANDARD") &&
          complexResult.flags.includes("GUARDIAN_REQUIRED") &&
          complexResult.flags.includes("NRI") &&
          complexResult.flags.includes("FOREIGN_ASSETS") &&
          complexResult.flags.includes("BUSINESS_INTEREST") &&
          complexResult.flags.includes("EXISTING_WILL") &&
          complexResult.flags.includes("LEGAL_REVIEW_REQUIRED") &&
          complexResult.flags.includes("MANUAL_CONSULTATION_REQUIRED"),
        true,
        complexResult.flags
      );

      recordTest(
        "Complex case sets requiresLawyerReview to true",
        "Rule Engine Stress Test",
        complexResult.requiresLawyerReview === true,
        true,
        complexResult.requiresLawyerReview
      );

      // Adversarial type fuzzing on LegalWorkflowEngine: unexpected values must not throw
      const fuzzedInputs = [
        { hasMinorChildren: true }, // boolean instead of "Yes"
        { hasMinorChildren: "yes" }, // lowercase
        { hasMinorChildren: 1 }, // number
        { hasMinorChildren: null }, // null
        { hasMinorChildren: undefined }, // undefined
        { hasMinorChildren: {} }, // object
        {}, // completely empty answers
      ];

      for (let i = 0; i < fuzzedInputs.length; i++) {
        let threw = false;
        let res = null;
        try {
          res = await LegalWorkflowEngine.evaluate(fuzzedInputs[i]);
        } catch (err) {
          threw = true;
        }

        recordTest(
          `LegalWorkflowEngine handles malformed input gracefully without crashing [Variant ${i + 1}]`,
          "Rule Engine Resilience",
          !threw && Array.isArray(res?.flags),
          true,
          !threw
        );
      }
    }

    // ========================================================================
    // SUITE 4: DEBOUNCED AUTOSAVE & RESUME HYDRATION INTEGRITY
    // ========================================================================
    console.log("\n========================================================================");
    console.log("SUITE 4: DEBOUNCED AUTOSAVE & RESUME HYDRATION INTEGRITY");
    console.log("========================================================================");

    // 4.1 Rapid debounced autosaves to same section (compound unique key deduplication)
    {
      currentSession = { user: { id: userA.id, email: userA.email, role: "CUSTOMER" } };

      const updates = [
        { fullName: "Debounce Test 1", city: "Delhi" },
        { fullName: "Debounce Test 2", city: "New Delhi" },
        { fullName: "Debounce Test 3", city: "Connaught Place, New Delhi" },
      ];

      let lastUpdatedAt = null;
      for (const upd of updates) {
        const req = new Request("http://localhost:3000/api/questionnaire/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: caseA.id,
            sectionId: "personal_info",
            data: upd,
          }),
        });
        const res = await saveRoute.POST(req);
        const data = await res.json();
        lastUpdatedAt = data.updatedAt;
      }

      // Query database directly to ensure NO duplicate rows were created
      const count = await prisma.questionnaireAnswer.count({
        where: {
          caseId: caseA.id,
          questionId: "personal_info",
        },
      });

      recordTest(
        "Compound unique constraint (caseId_questionId) guarantees exactly 1 record per section",
        "Autosave Deduplication",
        count === 1,
        1,
        count
      );

      const latestRecord = await prisma.questionnaireAnswer.findUnique({
        where: {
          caseId_questionId: {
            caseId: caseA.id,
            questionId: "personal_info",
          },
        },
      });

      const parsedLatest = JSON.parse(latestRecord.answerData);
      recordTest(
        "Latest debounced save data persists accurately in database",
        "Autosave Deduplication",
        parsedLatest.city === "Connaught Place, New Delhi",
        "Connaught Place, New Delhi",
        parsedLatest.city
      );
    }

    // 4.2 Multi-section resume hydration (simulating page reload query)
    {
      // Save multiple distinct sections to Case A
      const sectionsToSave = [
        {
          sectionId: "children",
          data: {
            hasChildren: "Yes",
            hasMinorChildren: "Yes",
            childrenList: [{ name: "Ananya", dateOfBirth: "2016-04-12", relationship: "Biological" }],
          },
        },
        {
          sectionId: "guardian",
          data: {
            guardianName: "Vikram Mehta",
            guardianRelationship: "Uncle",
            guardianAddress: "45 MG Road, Bangalore",
          },
        },
        {
          sectionId: "assets",
          data: {
            assetsList: [
              { type: "Property", description: "Apartment in Whitefield", ownershipPercentage: 100 },
              { type: "BankAccount", description: "HDFC Savings", ownershipPercentage: 100 },
            ],
          },
        },
      ];

      for (const s of sectionsToSave) {
        const req = new Request("http://localhost:3000/api/questionnaire/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: caseA.id,
            sectionId: s.sectionId,
            data: s.data,
          }),
        });
        await saveRoute.POST(req);
      }

      // Simulate server-side questionnaire page query:
      // prisma.case.findUnique({ where: { id: caseId }, include: { answers: true } })
      const reloadedCase = await prisma.case.findUnique({
        where: { id: caseA.id },
        include: { answers: true },
      });

      const hydratedAnswers = {};
      for (const ans of reloadedCase.answers) {
        Object.assign(hydratedAnswers, JSON.parse(ans.answerData));
      }

      recordTest(
        "All saved sections are retrieved upon case reload",
        "Resume Hydration",
        reloadedCase.answers.length >= 4, // personal_info, children, guardian, assets
        true,
        reloadedCase.answers.length >= 4
      );

      recordTest(
        "Hydrated answers retain full fidelity across multiple sections",
        "Resume Hydration",
        hydratedAnswers.fullName === "Debounce Test 3" &&
          hydratedAnswers.hasChildren === "Yes" &&
          hydratedAnswers.hasMinorChildren === "Yes" &&
          hydratedAnswers.guardianName === "Vikram Mehta" &&
          hydratedAnswers.assetsList.length === 2,
        true,
        {
          fullName: hydratedAnswers.fullName,
          hasChildren: hydratedAnswers.hasChildren,
          guardianName: hydratedAnswers.guardianName,
          assetCount: hydratedAnswers.assetsList?.length,
        }
      );
    }

  } finally {
    // Teardown & Database Cleanup
    console.log("\n========================================================================");
    console.log("TEARDOWN: Cleaning up test fixtures from SQLite database...");
    console.log("========================================================================");

    if (cleanupCaseIds.length > 0) {
      await prisma.questionnaireAnswer.deleteMany({ where: { caseId: { in: cleanupCaseIds } } });
      await prisma.auditLog.deleteMany({ where: { caseId: { in: cleanupCaseIds } } });
      await prisma.case.deleteMany({ where: { id: { in: cleanupCaseIds } } });
    }

    if (cleanupUserIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { actorId: { in: cleanupUserIds } } });
      await prisma.auditLog.deleteMany({ where: { entityId: { in: cleanupUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
    }

    await prisma.$disconnect();
    console.log("Teardown complete. Test artifacts successfully purged.");
  }

  // Final Summary
  console.log("\n========================================================================");
  console.log("CHALLENGE EXECUTION SUMMARY");
  console.log("========================================================================");
  console.log(`  Total Assertions : ${stats.total}`);
  console.log(`  Passed           : ${stats.passed}`);
  console.log(`  Failed           : ${stats.failed}`);

  if (stats.failed > 0) {
    console.error("\n❌ CHALLENGE FAILED — The following tests failed:");
    stats.failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. [${f.category}] ${f.name}`);
      console.error(`     Expected: ${JSON.stringify(f.expected)}`);
      console.error(`     Actual:   ${JSON.stringify(f.actual)}`);
    });
    process.exit(1);
  } else {
    console.log("\n✅ ALL EMPIRICAL CHALLENGE TESTS PASSED!");
    console.log("Verdict: APPROVE");
    process.exit(0);
  }
}

runEmpiricalChallenge().catch((err) => {
  console.error("\n💥 Unhandled challenge test suite error:", err);
  process.exit(1);
});
