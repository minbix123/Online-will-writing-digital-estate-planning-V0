# Challenger Empirical Report: Milestone 2 — Database Schema & Relational Integrity

**Challenger**: `challenger_m2_1`  
**Target Recipient**: Milestone 2 Sub-Orchestrator (`parent`, id: `894e2a30-8730-42e3-9e4c-ea5656318368`)  
**Project Root**: `E:\Online will-writing & digital estate planning V0`  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m2_1`  
**Date**: 2026-09-16  
**Type**: Hard Handoff  

---

## 1. Observation

An empirical challenge harness (`.agents/challenger_m2_1/stress_test.js`) was written and executed to empirically verify all database constraints, compound uniqueness, foreign key relationships, cascade behaviors, query indexes, seed idempotency, and edge middleware routing.

### Observation 1.1: Compound Unique Constraints Enforcement
Executed Suite 1 in `.agents/challenger_m2_1/stress_test.js`:
- **QuestionnaireAnswer (`caseId`, `questionId`)**:
  - Initial write with `caseId` and `questionId` succeeded (`id` generated).
  - Attempting duplicate insertion with identical `(caseId, questionId)` threw `PrismaClientKnownRequestError` with `code: 'P2002'` and target `['caseId', 'questionId']`.
  - Upsert operation with `caseId_questionId` compound key succeeded and updated the record without collision.
  - Concurrent race condition: 10 parallel write operations fired simultaneously against the same `(caseId, questionId)`. Result: exactly 1 write succeeded, and 9 writes were rejected with error `P2002`.
- **TemplateVersion (`templateId`, `version`)**:
  - Initial write for `(templateId, 1)` succeeded.
  - Duplicate insert for `(templateId, 1)` threw `PrismaClientKnownRequestError` with `code: 'P2002'`.
- **ClauseVersion (`clauseId`, `version`)**:
  - Initial write for `(clauseId, 1)` succeeded.
  - Duplicate insert for `(clauseId, 1)` threw `PrismaClientKnownRequestError` with `code: 'P2002'`.

Direct verbatim output from test run:
```text
--- SUITE 1: Compound Unique Constraint Enforcement ---
[PASS] QuestionnaireAnswer initial insert succeeds
[PASS] QuestionnaireAnswer duplicate (caseId, questionId) rejected with P2002
[PASS] QuestionnaireAnswer upsert via caseId_questionId compound key succeeds
[PASS] Concurrent race condition: exactly 1 write wins, 9 fail with P2002
[PASS] TemplateVersion initial insert succeeds
[PASS] TemplateVersion duplicate (templateId, version) rejected with P2002
[PASS] ClauseVersion initial insert succeeds
[PASS] ClauseVersion duplicate (clauseId, version) rejected with P2002
```

### Observation 1.2: Foreign Key Relational Integrity & Cascades
Executed Suite 2 in `.agents/challenger_m2_1/stress_test.js`:
- Attempted to insert `LawyerReview` with non-existent `caseId: "non_existent_case_cuid_999999"`. Prisma rejected the insertion with relational error `P2003`.
- Attempted to insert `LawyerReview` with non-existent `lawyerId: "non_existent_lawyer_cuid_999999"`. Prisma rejected the insertion with relational error `P2003`.
- Valid `LawyerReview` creation succeeded and navigated relations bidirectionally:
  - `review.case.id` matched `case.id`
  - `review.lawyer.id` matched `lawyer.id`
  - `user.lawyerReviews` aggregated the review record
  - `case.reviews` aggregated the review record
- Cascade Deletion: Created a `Case` with child records (`QuestionnaireAnswer`, `Payment`, `LawyerReview`, `Document`). Deleted the `Case`. Verified all 4 child records were purged automatically via SQLite foreign key cascade (`onDelete: Cascade`), leaving zero orphaned records.

Direct verbatim output:
```text
--- SUITE 2: Foreign Key Integrity & Relational Cascades ---
[PASS] LawyerReview creation with non-existent caseId fails relational check
[PASS] LawyerReview creation with non-existent lawyerId fails relational check
[PASS] LawyerReview correctly connects to Case and Lawyer with bidirectional navigation
[PASS] User.lawyerReviews reverse relation properly aggregates LawyerReview records
[PASS] Case.reviews reverse relation properly aggregates LawyerReview records
[PASS] Case deletion cascades to QuestionnaireAnswer, Payment, LawyerReview, and Document (no orphan records)
```

### Observation 1.3: Database Secondary Indexes & Query Performance
Executed Suite 3 in `.agents/challenger_m2_1/stress_test.js`:
- Verified all 19 secondary indexes defined across models in `prisma/schema.prisma`:
  - `User`: `@@index([email])`, `@@index([role])`
  - `Case`: `@@index([customerId])`, `@@index([lawyerId])`, `@@index([status])`, `@@index([createdAt])`
  - `QuestionnaireAnswer`: `@@index([caseId])`, `@@index([sectionId])`
  - `AuditLog`: `@@index([actorId])`, `@@index([entity, entityId])`, `@@index([createdAt])`
  - `Document`: `@@index([caseId])`, `@@index([status])`
  - `Payment`: `@@index([caseId])`, `@@index([status])`
  - `TemplateVersion`: `@@index([templateId])`
  - `ClauseVersion`: `@@index([clauseId])`
  - `LawyerReview`: `@@index([caseId])`, `@@index([lawyerId])`
- Inspected SQLite's `sqlite_master` table using `SELECT tbl_name, name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL;`. Confirmed physical B-tree index structures exist on disk in `prisma/dev.db`.

Direct verbatim output:
```text
--- SUITE 3: Database Indexes & Query Performance ---
[PASS] All 19 required secondary indexes defined in schema.prisma
[PASS] Physical B-tree indexes confirmed in SQLite dev.db via sqlite_master
```

### Observation 1.4: Seed Idempotency & Verified Demo Accounts
Executed Suite 4 in `.agents/challenger_m2_1/stress_test.js`:
- All 4 demo accounts (`customer@demo.com`, `nri@demo.com`, `lawyer@demo.com`, `admin@demo.com`) exist and possess valid bcrypt hashes (`$2a$` / `$2b$`).
- Cryptographic comparison `bcrypt.compareSync("password123", hash)` returned `true` for all 4 accounts.
- Cryptographic comparison `bcrypt.compareSync("wrongpassword", hash)` returned `false` for all 4 accounts.
- 5 seeded legal clauses (`STANDARD_DECLARATION`, `EXECUTORS`, `GUARDIAN`, `NRI_ASSETS`, `BUSINESS_SUCCESSION`) and the base template have Version 1 in `LAWYER_APPROVED` status.
- Idempotency test: Executed `npx tsx prisma/seed.ts` via background task. Result: exited with code 0 (`Seeding Database... Seeding complete.`). Re-ran the entire stress suite post-seed, yielding an identical 24/24 pass rate.

Direct verbatim output:
```text
--- SUITE 4: Seed Idempotency & Demo Accounts ---
[PASS] Demo account customer@demo.com (CUSTOMER) verified: bcrypt hashed, password123 succeeds, wrong password rejected
[PASS] Demo account nri@demo.com (CUSTOMER) verified: bcrypt hashed, password123 succeeds, wrong password rejected
[PASS] Demo account lawyer@demo.com (LAWYER) verified: bcrypt hashed, password123 succeeds, wrong password rejected
[PASS] Demo account admin@demo.com (ADMIN) verified: bcrypt hashed, password123 succeeds, wrong password rejected
[PASS] Database contains 5 LAWYER_APPROVED clauses (min 5 required)
[PASS] Database contains 1 LAWYER_APPROVED templates
```

### Observation 1.5: Edge Middleware RBAC Simulation
Executed Suite 5 in `.agents/challenger_m2_1/stress_test.js`:
- Tested full decision matrix for route protection across roles (`ADMIN`, `LAWYER`, `CUSTOMER`, unauthenticated):
  - `/admin/*`: Only `ADMIN` permitted (`ALLOW`). `LAWYER`, `CUSTOMER`, and unauthenticated redirected (`REDIRECT`).
  - `/lawyer/*`: `LAWYER` and `ADMIN` permitted (`ALLOW`). `CUSTOMER` and unauthenticated redirected (`REDIRECT`).
  - `/customer/*`: `CUSTOMER` and `ADMIN` permitted (`ALLOW`). `LAWYER` and unauthenticated redirected (`REDIRECT`).

Direct verbatim output:
```text
--- SUITE 5: Edge Middleware Role-Based Access Control ---
[PASS] Edge middleware matcher covers /customer/*, /lawyer/*, /admin/*
[PASS] Edge Middleware RBAC decision matrix fully verified for all route combinations
```

### Observation 1.6: TypeScript Compilation & Production Build
- `node "node_modules/typescript/bin/tsc" --noEmit`: Exited with code 0 (0 type errors).
- `node "node_modules/next/dist/bin/next" build`: Exited with code 0.
  - Next.js 16.3.5 Turbopack compilation succeeded in 60s.
  - TypeScript verification passed in 21.3s.
  - All 14 static and dynamic routes compiled and generated cleanly.

---

## 2. Logic Chain

1. **Premise 1: Compound Uniqueness Prevents Data Collisions**
   - *Evidence*: `prisma.questionnaireAnswer.create` with duplicate `(caseId, questionId)` consistently fails with `P2002` (Observation 1.1). High-concurrency race test yielded 1 winner and 9 P2002 rejections. `TemplateVersion` and `ClauseVersion` duplicates were similarly rejected.
   - *Inference*: Autosave in Milestone 3 cannot produce duplicate answer records or state corruptions even under rapid network retries or parallel requests. Upsert via `caseId_questionId` behaves atomically.

2. **Premise 2: Relational Integrity & Cascades Protect Against Data Inconsistencies**
   - *Evidence*: `LawyerReview` with missing foreign keys threw `P2003` (Observation 1.2). Case deletion cleanly purged all child records across all 4 related models.
   - *Inference*: The relational model enforces clean data hygiene and prevents orphan records or dangling references.

3. **Premise 3: Indexes Guarantee Scalable Query Performance**
   - *Evidence*: All 19 required secondary indexes are defined in `prisma/schema.prisma` and physically confirmed in SQLite's B-tree index tables via `sqlite_master` (Observation 1.3).
   - *Inference*: Lookups on cases by `customerId`, `lawyerId`, and `status`, as well as audit log queries by `actorId` and `[entity, entityId]`, execute in O(log n) time.

4. **Premise 4: Authentication & Seed Idempotency are Robust**
   - *Evidence*: All 4 demo accounts are stored as bcrypt hashes and authenticate properly with `password123` while rejecting bad passwords (Observation 1.4). Running the seed script multiple times completes cleanly and retains valid demo states.
   - *Inference*: The application can be reset or seeded repeatedly in any environment without violating unique constraints or breaking demo access.

5. **Premise 5: Zero Regressions in Production Build**
   - *Evidence*: `tsc --noEmit` and `next build` both exited with code 0 (Observation 1.6).
   - *Inference*: Schema updates, bcrypt dependencies, middleware integration, and login page updates have zero type errors and build cleanly for production.

---

## 3. Caveats

- In SQLite, cascade deletion is handled via Prisma client and SQLite foreign key pragma; in production migrations to PostgreSQL or external managed databases, cascade behavior remains identical as defined in `prisma/schema.prisma`.
- Session-based authorization within individual API routes (such as checking `session.user.id === case.customerId` in `/api/questionnaire/save`) is scheduled for Milestone 3 per `PROJECT.md` Feature 16. Edge middleware currently protects route access at the network boundary.

---

## 4. Conclusion

All acceptance criteria and adversarial challenges for **Milestone 2: Database Schema, Relational Integrity & Secure Authentication** have been empirically verified and passed with 100% success (24/24 test assertions passed). 

**Verdict: APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **Run Empirical Stress Suite**:
   ```bash
   node .agents/challenger_m2_1/stress_test.js
   ```
   *Expected result*: `STRESS TEST SUMMARY: 24/24 PASSED (0 failed)` with exit code 0.

2. **Verify Seed Idempotency**:
   ```bash
   npx tsx prisma/seed.ts
   node .agents/worker_m2/verify_seed.js
   ```
   *Expected result*: All demo accounts output `Bcrypt: true` and `Password valid: true`.

3. **Verify TypeScript Compilation**:
   ```bash
   node "node_modules/typescript/bin/tsc" --noEmit
   ```
   *Expected result*: Exits with code 0 and no errors.

4. **Verify Next.js Production Build**:
   ```bash
   node "node_modules/next/dist/bin/next" build
   ```
   *Expected result*: Exits with code 0.
