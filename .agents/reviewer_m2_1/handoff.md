# Quality & Adversarial Review Report: Milestone 2 — Database Schema, Relational Integrity & Secure Authentication

**Reviewer**: `reviewer_m2_1` (Roles: Reviewer, Adversarial Critic)  
**Target Recipient**: Milestone 2 Sub-Orchestrator (`parent`, id: `894e2a30-8730-42e3-9e4c-ea5656318368`)  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\reviewer_m2_1`  
**Date**: 2026-09-16  
**Status**: COMPLETE  

---

## Review Summary

**Verdict: APPROVE**

The work submitted by `worker_m2` for Milestone 2 meets all functional, architectural, security, and relational integrity requirements outlined in `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `.agents/sub_orch_m2_db_auth/SCOPE.md`. Zero integrity violations, dummy facades, or hardcoded shortcuts were detected. All compound unique constraints, foreign keys, cascade deletes, secondary indexes, bcrypt password hashing, seed clauses/templates, and edge middleware RBAC rules were empirically proven operational across 75 independent automated checks.

---

## 1. Observation

### 1.1 Compound Unique Constraints (`prisma/schema.prisma`)
- `QuestionnaireAnswer`: Line 66: `@@unique([caseId, questionId])`
- `TemplateVersion`: Line 93: `@@unique([templateId, version])`
- `ClauseVersion`: Line 117: `@@unique([clauseId, version])`
- Directly tested duplicate row insertion via `independent_verify.js`: each table rejected duplicate attempts with Prisma exception code `P2002` (`Unique constraint failed`).
- Directly tested compound upsert on `caseId_questionId` via `test_upsert.js`: atomically updated existing answer payload without race-condition duplicates or ID modification.

### 1.2 Foreign Key Relations & Reverse Relations (`prisma/schema.prisma`)
- `LawyerReview` model:
  - Line 156-157: `caseId String`, `case Case @relation(fields: [caseId], references: [id], onDelete: Cascade)`
  - Line 158-159: `lawyerId String?`, `lawyer User? @relation("LawyerReviews", fields: [lawyerId], references: [id])`
- Reverse relations:
  - `User`: Line 23: `lawyerReviews LawyerReview[] @relation("LawyerReviews")`
  - `Case`: Line 45: `reviews LawyerReview[]`
- Cascade Deletion:
  - Lines 33, 43, 58, 133, 157, 172: Verified `onDelete: Cascade` on relations to `Case`.
  - When test case was deleted during empirical testing, linked `QuestionnaireAnswer` and `LawyerReview` rows were immediately purged by SQLite engine.

### 1.3 Secondary Indexes (`prisma/schema.prisma`)
Explicit indexes cover all foreign keys and high-frequency search paths:
- `User`: `@@index([email])`, `@@index([role])` (lines 26-27)
- `Case`: `@@index([customerId])`, `@@index([lawyerId])`, `@@index([status])`, `@@index([createdAt])` (lines 49-52)
- `QuestionnaireAnswer`: `@@index([caseId])`, `@@index([sectionId])` (lines 67-68)
- `TemplateVersion`: `@@index([templateId])` (line 94)
- `ClauseVersion`: `@@index([clauseId])` (line 118)
- `Document`: `@@index([caseId])`, `@@index([status])` (lines 150-151)
- `LawyerReview`: `@@index([caseId])`, `@@index([lawyerId])` (lines 165-166)
- `Payment`: `@@index([caseId])`, `@@index([status])` (lines 182-183)
- `AuditLog`: `@@index([actorId])`, `@@index([entity, entityId])`, `@@index([createdAt])` (lines 199-201)

### 1.4 Enums & Lifecycle States (`prisma/schema.prisma`)
- `Template` & `TemplateVersion`: `status String @default("DRAFT") // DRAFT, UNDER_REVIEW, LAWYER_APPROVED, LOCKED, ARCHIVED` (lines 75, 88)
- `Clause` & `ClauseVersion`: `status String @default("DRAFT") // DRAFT, UNDER_REVIEW, LAWYER_APPROVED, LOCKED, ARCHIVED` (lines 101, 114)
- String representation with documented enum states is used to maintain SQLite portability and avoid DDL migration locking.

### 1.5 Password Hashing & Seed Script (`prisma/seed.ts`)
- Implements `bcrypt.hashSync('password123', 10)` (lines 22-23).
- Generates 4 demo accounts with active bcrypt hashes:
  - `customer@demo.com` (`role: CUSTOMER`)
  - `nri@demo.com` (`role: CUSTOMER`)
  - `lawyer@demo.com` (`role: LAWYER`)
  - `admin@demo.com` (`role: ADMIN`)
- Verified dynamically generated hashes in `dev.db` start with `$2a$10$` and authenticate correctly with `password123`, while rejecting wrong passwords.
- Seeds 5 legal clauses: `STANDARD_DECLARATION`, `EXECUTORS`, `GUARDIAN`, `NRI_ASSETS`, `BUSINESS_SUCCESSION`, each with Version 1 in `LAWYER_APPROVED` status.
- Seeds legal template "Comprehensive Indian Last Will & Testament" with Version 1 in `LAWYER_APPROVED` status.

### 1.6 Authentication & Edge Middleware (`src/lib/auth.ts`, `src/middleware.ts`)
- `src/lib/auth.ts`:
  - `authorize()` trims and lowercases email: `email: credentials.email.toLowerCase().trim()`.
  - Performs constant-time cryptographic hash comparison: `await bcrypt.compare(credentials.password, user.password)`.
  - Enriches `token` and `session.user` with `id`, `name`, `email`, and `role`.
- `src/middleware.ts`:
  - Uses `withAuth` matcher: `['/customer/:path*', '/lawyer/:path*', '/admin/:path*']`.
  - Enforces server-side edge protection:
    - `/admin/*` -> `ADMIN` only; non-admins redirected to their specific dashboard or `/login`.
    - `/lawyer/*` -> `LAWYER` or `ADMIN`; unauthorized users redirected.
    - `/customer/*` -> `CUSTOMER` or `ADMIN`; unauthorized users redirected.
    - Unauthenticated requests -> redirected to `/login`.
- `src/app/login/page.tsx`:
  - Completely eliminates legacy `/api/auth/session` redirection.
  - Smoothly routes authenticated users based on session role (`LAWYER` -> `/lawyer/dashboard`, `ADMIN` -> `/admin/dashboard`, `CUSTOMER` -> `/customer/dashboard`).
  - Provides quick-fill demo buttons for Customer, NRI, Lawyer, and Admin accounts.

### 1.7 Verification Commands Executed
- `node node_modules/typescript/bin/tsc --noEmit`: Code 0, zero errors.
- `node node_modules/prisma/build/index.js validate`: Code 0 ("The schema at prisma\schema.prisma is valid 🚀").
- `node node_modules/next/dist/bin/next build`: Code 0 (Compiled successfully in 16.3s, generated all 14 static/dynamic routes).
- `node tests/runner.js --file=test_f1_auth.js`: 12/12 tests passed (Tiers 1 & 2).
- `node tests/runner.js --file=test_f2`: 9/9 tests passed (Tiers 1 & 2).
- `node .agents/reviewer_m2_1/independent_verify.js`: 75/75 assertions passed.

---

## 2. Logic Chain

1. **Relational Integrity**:
   - In SQLite/Prisma architectures without database-level constraints, concurrent autosaves create orphaned answers and corrupted revision histories.
   - The implementation of `@@unique([caseId, questionId])`, `@@unique([templateId, version])`, and `@@unique([clauseId, version])` was verified to block duplicates at the SQLite engine level (verified by P2002 error generation during stress test).
   - Therefore, concurrent saves cannot produce duplicate questions or duplicate template/clause versions.

2. **Cascade & Foreign Key Enforcement**:
   - Deleting a Case must not leave dangling answers, reviews, documents, or payments in the system.
   - `onDelete: Cascade` on `Case` relationships was verified by inserting and deleting a test case, confirming that associated answers and reviews were deleted automatically.
   - Therefore, database hygiene is guaranteed across case lifecycles.

3. **Authentication Security & Credential Protection**:
   - Previously, passwords were stored in plaintext and evaluated using javascript string comparison.
   - The worker introduced `bcryptjs` with 10 salt rounds (`$2a$10$`), verified in `seed.ts` and `auth.ts`.
   - All 4 demo accounts verify against `password123` and reject invalid passwords and SQL injection payloads.
   - Passwords are deleted from session objects and never returned to the browser.
   - Therefore, password storage and authentication meet industry standards for this MVP.

4. **Zero Edge Bypass (RBAC)**:
   - Previously, navigation to `/customer/*`, `/lawyer/*`, and `/admin/*` was unguarded at the edge.
   - `src/middleware.ts` intercepts all matching paths before server components or API routes execute, validating JWT role tokens.
   - Edge routing was tested across unauthenticated, cross-role, and authorized scenarios.
   - Therefore, unauthorized access via direct URL manipulation is prevented.

---

## 3. Adversarial Challenges & Stress-Test Results

| Challenge | Attack Vector / Scenario | Expected Result | Actual Result | Verdict |
|---|---|---|---|---|
| **C1: Duplicate Answer Collision** | Send identical `caseId` and `questionId` concurrently | Reject duplicate with P2002 | Threw PrismaClientKnownRequestError P2002 | **PASS** |
| **C2: Duplicate Version Collision** | Send identical `templateId` and `version` | Reject duplicate with P2002 | Threw PrismaClientKnownRequestError P2002 | **PASS** |
| **C3: Case Deletion Orphan Leak** | Delete parent `Case` with child `LawyerReview` & `QuestionnaireAnswer` | Cascade delete children | Children returned null upon subsequent lookup | **PASS** |
| **C4: Login Case-Sensitivity** | Attempt login with `CUSTOMER@DEMO.COM` | Login succeeds via normalization | Returns valid user object and CUSTOMER role | **PASS** |
| **C5: Non-Existent User Login** | Attempt login with `unknown@domain.com` | Return null (no unhandled 500 error) | Returns null cleanly | **PASS** |
| **C6: Invalid Password Attack** | Attempt login with bad password or SQL injection string | Return null, no bypass | Returns null cleanly | **PASS** |
| **C7: Cross-Role Edge Access** | Customer attempts to access `/admin/users` or `/lawyer/case/1` | Redirect to `/customer/dashboard` | Returns redirect to `/customer/dashboard` | **PASS** |
| **C8: Compound Upsert Behavior** | Perform upsert using `caseId_questionId` | Update in-place, retain same primary key ID | Record ID unchanged; answerData updated | **PASS** |

---

## 4. Integrity Assessment

As required by the adversarial critic mandate, the implementation was examined for integrity violations:
- **Hardcoded test results embedded in source code**: None found. Real SQLite database operations, real cryptographic hashing, real JWT session tokens.
- **Dummy or facade implementations**: None found. Schema, indexes, relations, auth callbacks, and middleware are fully implemented.
- **Shortcuts that bypass the intended task**: None found.
- **Fabricated verification outputs**: None found. All logs and outputs were independently reproduced and confirmed.
- **Self-certifying work without genuine verification**: Worker's claims were independently stress-tested with a separate test script (`independent_verify.js`) containing 75 assertions.

---

## 5. Findings & Constructive Recommendations

### [Minor] Finding 1: Path Handling with Spaces in CLI
- **What**: Running `npx prisma validate` via powershell can fail if the workspace directory path contains spaces and ampersands (`&`), because `npx`'s wrapper batch script does not always quote the command line properly on Windows.
- **Where**: CLI tooling execution.
- **Why**: Running `node node_modules/prisma/build/index.js` or standard npm scripts avoids this platform-specific edge case.
- **Suggestion**: Ensure all package.json scripts (e.g. `npm run generate`, `npm run push`) continue to invoke `prisma` directly or via `node` path references.

### [Minor] Finding 2: Session Secret Development Fallback
- **What**: `src/lib/auth.ts` and `src/middleware.ts` use `process.env.NEXTAUTH_SECRET || "fallback_secret_for_development"`.
- **Where**: `src/lib/auth.ts:67`, `src/middleware.ts:51`.
- **Why**: Standard and safe for MVP development mode; `.env` already contains `NEXTAUTH_SECRET`.
- **Suggestion**: In production readiness milestone (M6), verify that production environments strictly enforce non-empty, high-entropy secrets without fallback.

---

## 6. Caveats

- Payment integration remains an internal mock payment system (`mode: "MOCK"`), as explicitly permitted by `ORIGINAL_REQUEST.md` line 24. Full transactional wrapping of mock payments is scheduled for Milestone 5.
- API route ownership verification (`case.customerId === session.user.id` on `/api/questionnaire/save`) and customer dashboard UI are scheduled for Milestone 3 per the project roadmap.

---

## 7. Conclusion

Milestone 2 implementation is **complete, robust, and verified**. All requirements are satisfied with genuine logic, strict relational integrity, and secure authentication.

**Verdict: APPROVE**

---

## 8. Verification Method (Independent Reproduction)

To independently reproduce the verification:
1. Run Typecheck:
   ```powershell
   node node_modules/typescript/bin/tsc --noEmit
   ```
2. Run Prisma Schema Validation:
   ```powershell
   node node_modules/prisma/build/index.js validate
   ```
3. Run Independent Stress-Testing Suite:
   ```powershell
   node .agents/reviewer_m2_1/independent_verify.js
   ```
4. Run Auth & RBAC E2E Suites:
   ```powershell
   node tests/runner.js --file=test_f1_auth.js
   node tests/runner.js --file=test_f2
   ```
5. Run Production Build:
   ```powershell
   node node_modules/next/dist/bin/next build
   ```
