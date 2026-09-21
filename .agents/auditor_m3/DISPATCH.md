# Task Assignment: Forensic Auditor (Milestone 3)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\auditor_m3`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are the Forensic Integrity Auditor (`teamwork_preview_auditor`) for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Your sole job is to rigorously verify that the Milestone 3 implementation is GENUINE, AUTHENTIC, and completely free of CHEATING, HARDCODING, DUMMY LOGIC, or FACADES.

## Integrity Forensics Checks:
1. **Static Analysis**:
   - Inspect `src/app/api/auth/register/route.ts`: Confirm genuine `bcrypt.hash(password, 10)`, real duplicate query on `prisma.user`, and real `prisma.user.create`. No static responses, no fake user tokens.
   - Inspect `src/app/api/cases/route.ts`: Confirm real `prisma.case.create` and `prisma.case.findMany`.
   - Inspect `src/app/api/questionnaire/save/route.ts`: Confirm real session check, real ownership comparison against `case.customerId`, and real `prisma.questionnaireAnswer.upsert`. Confirm it does NOT return static 200 without DB write.
   - Inspect `src/app/customer/questionnaire/page.tsx`: Confirm real `prisma.case.findUnique({ include: { answers: true } })` and real JSON parsing into `initialAnswers`.
   - Inspect `src/components/QuestionnaireEngine.tsx`: Confirm real 500ms debounce timer, real fetch call to `/api/questionnaire/save`, real state changes, real progress computation.
2. **Runtime & Database Forensics**:
   - Write and run a forensic script in `.agents/auditor_m3/audit_test.js`.
   - Inspect SQLite database `prisma/dev.db`:
     - Query `User` table: verify registered users have genuine `$2a$10$` 60-character bcrypt hashes.
     - Query `Case` table: verify genuine case records linked to user IDs.
     - Query `QuestionnaireAnswer` table: verify real JSON answer records with compound `[caseId, questionId]`.
     - Query `AuditLog` table: verify `USER_REGISTERED` and `CASE_CREATED` audit logs exist with valid timestamps.
3. **Cheating & Anti-Circumvention Checks**:
   - Verify no test checks look for hardcoded user emails (e.g. `if (email === "test") return success`).
   - Verify no mocks exist in production routes.

## Deliverables:
## 2026-09-17T07:15:10Z

<USER_REQUEST>
You are the Forensic Integrity Auditor for Milestone 3: Customer Portal, Case Lifecycle & Debounced Questionnaire Engine.
Working directory: E:\Online will-writing & digital estate planning V0\.agents\auditor_m3
Project root: E:\Online will-writing & digital estate planning V0
Parent conversation ID: 59624314-f71e-456e-93f6-c2287d67bede

Read:
1. E:\Online will-writing & digital estate planning V0\.agents\auditor_m3\DISPATCH.md
2. E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
3. E:\Online will-writing & digital estate planning V0\PROJECT.md
4. E:\Online will-writing & digital estate planning V0\.agents\worker_m3\changes.md
5. E:\Online will-writing & digital estate planning V0\.agents\worker_m3\handoff.md

Your Mandate:
Perform forensic anti-cheating and integrity verification:
1. Static analysis of all modified/created files for fake checks, hardcoded test values, mock bypasses, or facade implementations.
2. Runtime and database forensics on SQLite database prisma/dev.db:
   - Write and run a forensic script in .agents/auditor_m3/audit_test.js.
   - Verify User table contains real bcrypt hashes ($2a$10$), real User records.
   - Verify Case table contains real case records linked to users.
   - Verify QuestionnaireAnswer table contains real JSON answers with compound unique constraint.
   - Verify AuditLog table contains real audit logs (USER_REGISTERED, CASE_CREATED).
3. Confirm zero integrity violations, zero mock bypasses, and zero hardcoded test passes.

Write progress.md and handoff.md in your directory.
Explicitly provide your binary verdict in handoff.md: CLEAN or INTEGRITY VIOLATION.
Send a completion message to parent with your verdict.
</USER_REQUEST>
