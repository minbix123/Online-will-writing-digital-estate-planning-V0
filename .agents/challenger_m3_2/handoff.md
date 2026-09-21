# Empirical Security & Workflow Challenge Report: Milestone 3

**Author**: Empirical Challenger 2 (`challenger_m3_2`)  
**Target Recipient**: Milestone 3 Sub-Orchestrator (`parent`, id: `59624314-f71e-456e-93f6-c2287d67bede`)  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m3_2`  
**Milestone**: Milestone 3 — Customer Portal, Case Lifecycle & Debounced Questionnaire Engine  
**Date**: 2026-09-17  
**Verdict**: **APPROVE**  
**Type**: Hard Handoff (Complete)  

---

## 1. Observation

Direct empirical observations from executing the independent adversarial challenge suite (`.agents/challenger_m3_2/challenge_security.js`), baseline automated test runner (`tests/runner.js`), and TypeScript typechecker (`tsc --noEmit`):

### 1.1 Empirical Challenge Execution Command & Verbatim Output
- **Command**: `node .agents/challenger_m3_2/challenge_security.js`
- **Exit Code**: `0`
- **Key Verbatim Output**:
  ```
  ========================================================================
  CHALLENGER 2: EMPIRICAL SECURITY & WORKFLOW ADVERSARIAL SUITE
  Milestone 3 — Customer Portal, Case Lifecycle & Debounced Questionnaire Engine
  ========================================================================

  ========================================================================
  SUITE 1: REGISTRATION SECURITY FUZZING & PASSWORD HASHING INTEGRITY
  ========================================================================
    ✔ [PASS] [Registration Security] Valid registration returns HTTP 201 Created
    ✔ [PASS] [Registration Security] Registration response returns sanitized user object without password or hash
    ✔ [PASS] [Bcrypt & DB Security] Database stores valid bcrypt hash ($2a$10$ / $2b$10, 60 chars)
    ✔ [PASS] [Bcrypt & DB Security] Plaintext password is NEVER stored in database
    ✔ [PASS] [Bcrypt & DB Security] bcrypt.compare verifies plaintext password against stored hash
    ✔ [PASS] [Bcrypt & DB Security] bcrypt.compare rejects incorrect password
    ✔ [PASS] [Audit Logging] USER_REGISTERED audit log record created with correct entityId and actorId
    ✔ [PASS] [Registration Fuzzing] Duplicate email registration rejected with HTTP 409 Conflict (Exact match)
    ✔ [PASS] [Registration Fuzzing] Duplicate email registration rejected with HTTP 409 Conflict (Uppercase variant)
    ✔ [PASS] [Registration Fuzzing] Duplicate email registration rejected with HTTP 409 Conflict (Whitespace padded)
    ✔ [PASS] [Password Boundary Fuzzing] Password < 6 chars rejected with HTTP 400 Bad Request [0 chars (empty string)]
    ✔ [PASS] [Password Boundary Fuzzing] Password < 6 chars rejected with HTTP 400 Bad Request [1 char ('a')]
    ✔ [PASS] [Password Boundary Fuzzing] Password < 6 chars rejected with HTTP 400 Bad Request [4 chars ('1234')]
    ✔ [PASS] [Password Boundary Fuzzing] Password < 6 chars rejected with HTTP 400 Bad Request [5 chars ('abcde')]
    ✔ [PASS] [Password Boundary Fuzzing] Password exactly 6 chars is accepted with HTTP 201 Created (Boundary check)
    ✔ [PASS] [Input Validation Fuzzing] Malformed input rejected with HTTP 400 Bad Request [Null body]
    ✔ [PASS] [Input Validation Fuzzing] Malformed input rejected with HTTP 400 Bad Request [Empty JSON body]
    ✔ [PASS] [Input Validation Fuzzing] Malformed input rejected with HTTP 400 Bad Request [Empty name string]
    ✔ [PASS] [Input Validation Fuzzing] Malformed input rejected with HTTP 400 Bad Request [Whitespace-only name]
    ✔ [PASS] [Input Validation Fuzzing] Malformed input rejected with HTTP 400 Bad Request [Invalid email format (no @)]
    ✔ [PASS] [Input Validation Fuzzing] Malformed input rejected with HTTP 400 Bad Request [Invalid email format (no dot domain)]
    ✔ [PASS] [Input Validation Fuzzing] Malformed input rejected with HTTP 400 Bad Request [Null password]
    ✔ [PASS] [Input Validation Fuzzing] Malformed input rejected with HTTP 400 Bad Request [Numeric password instead of string]
    ✔ [PASS] [Registration & Auth Flow] Newly registered user authenticates successfully via NextAuth authorize()
    ✔ [PASS] [Registration & Auth Flow] Newly registered user can create a case via POST /api/cases (HTTP 201)
    ✔ [PASS] [Audit Logging] CASE_CREATED audit log recorded in database for newly created case

  ========================================================================
  SUITE 2: IDOR VULNERABILITY FUZZING & AUTHORIZATION BOUNDARIES
  ========================================================================
    ✔ [PASS] [IDOR Vulnerability Fuzzing] IDOR attack rejected with HTTP 403 Forbidden [Standard personal_info overwrite attempt]
    ✔ [PASS] [IDOR Vulnerability Fuzzing] IDOR attack rejected with HTTP 403 Forbidden [Injecting malicious guardian into victim case]
    ✔ [PASS] [IDOR Vulnerability Fuzzing] IDOR attack rejected with HTTP 403 Forbidden [Empty payload tampering attempt]
    ✔ [PASS] [IDOR Integrity] Victim case data untouched in database after IDOR attack attempts
    ✔ [PASS] [IDOR Integrity] Attacker injected section was NOT created in victim case
    ✔ [PASS] [Unauthenticated API Protection] Unauthenticated POST to /api/questionnaire/save rejected with HTTP 401 Unauthorized
    ✔ [PASS] [Unauthenticated API Protection] Unauthenticated GET /api/cases rejected with HTTP 401 Unauthorized
    ✔ [PASS] [Unauthenticated API Protection] Unauthenticated POST /api/cases rejected with HTTP 401 Unauthorized
    ✔ [PASS] [Customer Isolation] User A only receives their own cases from GET /api/cases
    ✔ [PASS] [Customer Isolation] User B only receives their own cases from GET /api/cases
    ✔ [PASS] [Questionnaire Authorization] Legitimate save by case owner succeeds with HTTP 200
    ✔ [PASS] [Questionnaire Validation] Saving to non-existent case returns HTTP 404 Not Found
    ✔ [PASS] [Questionnaire Validation] Saving with missing sectionId returns HTTP 400 Bad Request
    ✔ [PASS] [RBAC Oversight] Admin role is permitted to update case on save route (RBAC oversight)

  ========================================================================
  SUITE 3: CONDITIONAL BRANCHING & DOWNSTREAM RULE ENGINE STRESS TEST
  ========================================================================
    ✔ [PASS] [Conditional Branching] hasChildren = 'No' -> hasMinorChildren question is hidden/inactive
    ✔ [PASS] [Conditional Branching] hasChildren = 'No' -> guardian nomination section is hidden/inactive
    ✔ [PASS] [Downstream Rule Engine] hasChildren = 'No' -> LegalWorkflowEngine does NOT generate GUARDIAN_REQUIRED flag
    ✔ [PASS] [Downstream Rule Engine] hasChildren = 'No' -> LegalWorkflowEngine retains STANDARD flag
    ✔ [PASS] [Conditional Branching] hasChildren = 'Yes' -> hasMinorChildren question is visible/active
    ✔ [PASS] [Conditional Branching] hasChildren = 'Yes' & hasMinorChildren = 'No' -> guardian section is hidden/inactive
    ✔ [PASS] [Downstream Rule Engine] hasChildren = 'Yes' & hasMinorChildren = 'No' -> LegalWorkflowEngine does NOT generate GUARDIAN_REQUIRED
    ✔ [PASS] [Conditional Branching] hasChildren = 'Yes' & hasMinorChildren = 'Yes' -> guardian section is activated
    ✔ [PASS] [Downstream Rule Engine] hasChildren = 'Yes' & hasMinorChildren = 'Yes' -> LegalWorkflowEngine generates GUARDIAN_REQUIRED flag
    ✔ [PASS] [Downstream Rule Engine] hasChildren = 'Yes' & hasMinorChildren = 'Yes' -> flags include both STANDARD and GUARDIAN_REQUIRED
    ✔ [PASS] [Rule Engine Stress Test] Complex case triggers all expected legal flags concurrently
    ✔ [PASS] [Rule Engine Stress Test] Complex case sets requiresLawyerReview to true
    ✔ [PASS] [Rule Engine Resilience] LegalWorkflowEngine handles malformed input gracefully without crashing [Variant 1]
    ✔ [PASS] [Rule Engine Resilience] LegalWorkflowEngine handles malformed input gracefully without crashing [Variant 2]
    ✔ [PASS] [Rule Engine Resilience] LegalWorkflowEngine handles malformed input gracefully without crashing [Variant 3]
    ✔ [PASS] [Rule Engine Resilience] LegalWorkflowEngine handles malformed input gracefully without crashing [Variant 4]
    ✔ [PASS] [Rule Engine Resilience] LegalWorkflowEngine handles malformed input gracefully without crashing [Variant 5]
    ✔ [PASS] [Rule Engine Resilience] LegalWorkflowEngine handles malformed input gracefully without crashing [Variant 6]
    ✔ [PASS] [Rule Engine Resilience] LegalWorkflowEngine handles malformed input gracefully without crashing [Variant 7]

  ========================================================================
  SUITE 4: DEBOUNCED AUTOSAVE & RESUME HYDRATION INTEGRITY
  ========================================================================
    ✔ [PASS] [Autosave Deduplication] Compound unique constraint (caseId_questionId) guarantees exactly 1 record per section
    ✔ [PASS] [Autosave Deduplication] Latest debounced save data persists accurately in database
    ✔ [PASS] [Resume Hydration] All saved sections are retrieved upon case reload
    ✔ [PASS] [Resume Hydration] Hydrated answers retain full fidelity across multiple sections

  ========================================================================
  TEARDOWN: Cleaning up test fixtures from SQLite database...
  ========================================================================
  Teardown complete. Test artifacts successfully purged.

  ========================================================================
  CHALLENGE EXECUTION SUMMARY
  ========================================================================
    Total Assertions : 63
    Passed           : 63
    Failed           : 0

  ✅ ALL EMPIRICAL CHALLENGE TESTS PASSED!
  Verdict: APPROVE
  ```

### 1.2 Baseline Automated Test Runner Execution
- **Command**: `node tests/runner.js`
- **Exit Code**: `0`
- **Output Summary**:
  ```
  ========================================================================
    TEST EXECUTION SUMMARY
  ========================================================================
    Total Tests  : 131
    Passed       : 131
    Failed       : 0
    Total Time   : 38017ms

      ALL TESTS PASSED
  ```

### 1.3 TypeScript Static Typecheck
- **Command**: `node "node_modules/typescript/bin/tsc" --noEmit`
- **Exit Code**: `0`
- **Stdout/Stderr**: Empty (0 compilation errors)

### 1.4 Code Inspection Observations
1. **IDOR Prevention in Save Route** (`src/app/api/questionnaire/save/route.ts` lines 9-11, 34-40):
   ```typescript
   if (!session?.user) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ...
   const user = session.user as any;
   if (existingCase.customerId !== user.id && user.role !== "ADMIN") {
     return NextResponse.json(
       { error: "Forbidden: You do not own this case" },
       { status: 403 }
     );
   }
   ```
2. **Case Route Authentication & Tenant Isolation** (`src/app/api/cases/route.ts` lines 11-13, 16):
   ```typescript
   if (!session || !userId) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   const cases = await prisma.case.findMany({
     where: { customerId: userId },
     orderBy: { createdAt: "desc" },
     include: { documents: true, reviews: true },
   });
   ```
3. **Registration Validation & Password Hashing** (`src/app/api/auth/register/route.ts` lines 14-46, 68-79):
   - Validates non-empty name, regex-validated email, minimum 6-character password.
   - Normalizes email via `.toLowerCase().trim()`.
   - Checks existing user and returns 409 Conflict if found.
   - Hashes password using `bcrypt.hash(password, 10)`.
   - Creates `USER_REGISTERED` audit log entry in UTC.
   - Returns sanitized user object (id, name, email, role) omitting password.
4. **Conditional Branching Configuration** (`src/lib/questionnaire.ts` lines 54-65, 93-101):
   - `hasMinorChildren` question is conditioned on `{ field: "hasChildren", operator: "equals", value: "Yes" }`.
   - `guardian` section is conditioned on `{ field: "hasChildren", operator: "equals", value: "Yes" }` and `{ field: "hasMinorChildren", operator: "equals", value: "Yes" }`.
5. **Deterministic Legal Workflow Engine** (`src/server/legal-workflows/index.ts` lines 20-23):
   ```typescript
   if (answers.hasMinorChildren === "Yes") {
     flags.add("GUARDIAN_REQUIRED");
   }
   ```

---

## 2. Logic Chain

1. **From Observation 1.1 (Suite 2) and Observation 1.4.1 to IDOR & Auth Immunity**:
   - When User B (attacker) attempted to save questionnaire data into Case A owned by User A, `src/app/api/questionnaire/save/route.ts` rejected the request with HTTP 403 (`Forbidden: You do not own this case`).
   - Inspection of the database confirmed that User A's data was completely untouched and uncorrupted.
   - When requests without an active session were dispatched to `/api/questionnaire/save`, `GET /api/cases`, and `POST /api/cases`, all three endpoints responded with HTTP 401 (`Unauthorized`).
   - Querying `GET /api/cases` as User A and User B demonstrated 100% tenant isolation, with each user only receiving cases where `customerId === session.user.id`.

2. **From Observation 1.1 (Suite 1) and Observation 1.4.3 to Registration Security & Password Protection**:
   - Fuzzing registration with an existing email via exact match, uppercase variation, and whitespace padding uniformly produced HTTP 409 Conflict without duplicate record insertion.
   - Passwords shorter than 6 characters (0, 1, 4, 5 chars) and malformed payloads were uniformly rejected with HTTP 400 Bad Request. Exactly 6 characters was accepted (boundary verified).
   - Direct database inspection confirmed all passwords are stored as genuine 60-character bcrypt hashes (`$2a$10$...`) that pass `bcrypt.compare` verification and never plaintext.
   - Newly registered users successfully authenticated via NextAuth `authorize()` and subsequently created a case in `DRAFT` status with a corresponding `CASE_CREATED` audit log.

3. **From Observation 1.1 (Suite 3) and Observation 1.4.4 to Conditional Branching & Rule Engine Integrity**:
   - When `hasChildren = "No"`, `hasMinorChildren` and the `guardian` section both evaluate to inactive/hidden, and `LegalWorkflowEngine.evaluate` does not emit `GUARDIAN_REQUIRED`.
   - When `hasChildren = "Yes"` & `hasMinorChildren = "No"`, `hasMinorChildren` is active, the `guardian` section remains inactive/hidden, and `GUARDIAN_REQUIRED` is not emitted.
   - When `hasChildren = "Yes"` & `hasMinorChildren = "Yes"`, the `guardian` section activates and `LegalWorkflowEngine.evaluate` deterministically generates the `GUARDIAN_REQUIRED` flag alongside `STANDARD`.
   - Adversarial type fuzzing across non-string and malformed inputs did not crash `LegalWorkflowEngine`.

4. **From Observation 1.2 & 1.3 to Regression-Free Stability**:
   - All 131 tests in `tests/runner.js` across Tiers 1–4 passed without failure.
   - TypeScript compilation reports zero type errors across the entire application codebase.

---

## 3. Caveats

- **Mock Payment**: Payments remain on the mock payment provider as permitted by `ORIGINAL_REQUEST.md`.
- **Database Scope**: Verification was performed against the local SQLite database (`prisma/dev.db`). Production deployments migrating to PostgreSQL will inherit identical Prisma ORM constraint definitions (`@@unique([caseId, questionId])`).
- **No other caveats**: All security boundaries, IDOR guards, registration checks, and workflow rules hold firm.

---

## 4. Conclusion

**Verdict: APPROVE**

The Milestone 3 implementation thoroughly satisfies all empirical security and workflow adversarial requirements:
1. **IDOR Immunity**: Cross-tenant case tampering is rejected with HTTP 403; unauthenticated route access is rejected with HTTP 401; tenant queries are strictly isolated.
2. **Registration Security**: Duplicate email registrations are rejected with HTTP 409; passwords <6 characters are rejected with HTTP 400; passwords in SQLite are valid bcrypt hashes (`$2a$10$`) and never plaintext; new users authenticate and create cases seamlessly.
3. **Deterministic Branching & Rules**: Conditional branching correctly controls visibility of `hasMinorChildren` and `guardian`; `LegalWorkflowEngine` generates `GUARDIAN_REQUIRED` strictly when minor children are present.
4. **Resilient Autosave & Hydration**: Compound unique key upsert deduplicates rapid autosaves, and multi-section answers hydrate cleanly across reloads.
5. **Zero Regressions**: 131/131 baseline tests pass, and TypeScript compiles cleanly with 0 errors.

---

## 5. Verification Method

To independently reproduce and verify these findings:

1. **Run the Milestone 3 Empirical Security Challenge Suite**:
   ```powershell
   node .agents/challenger_m3_2/challenge_security.js
   ```
   *Expected Output*: 63 total assertions, 63 passed, 0 failed, exit code 0.

2. **Run the Full Automated Baseline Test Suite**:
   ```powershell
   node tests/runner.js
   ```
   *Expected Output*: 131 total tests, 131 passed, 0 failed, exit code 0.

3. **Verify TypeScript Compilation**:
   ```powershell
   node "node_modules/typescript/bin/tsc" --noEmit
   ```
   *Expected Output*: Exit code 0, no errors reported.

4. **Code Inspection**:
   - `src/app/api/questionnaire/save/route.ts`: Verify 401 check (line 9) and 403 ownership check (line 35).
   - `src/app/api/cases/route.ts`: Verify 401 check (line 11) and customerId isolation (line 16).
   - `src/app/api/auth/register/route.ts`: Verify 409 duplicate check (line 38) and bcrypt hashing (line 45).
   - `src/lib/questionnaire.ts`: Verify `hasMinorChildren` and `guardian` conditions (lines 58, 96).
   - `src/server/legal-workflows/index.ts`: Verify `GUARDIAN_REQUIRED` flag condition (line 20).
