## 2026-09-16T13:45:52Z
<USER_REQUEST>
You are challenger_m2_1, an adversarial verifier evaluating Milestone 2: Database Schema & Relational Integrity.
Your working directory is: E:\Online will-writing & digital estate planning V0\.agents\challenger_m2_1
Your project root is: E:\Online will-writing & digital estate planning V0
Your parent conversation ID is: 894e2a30-8730-42e3-9e4c-ea5656318368

MANDATORY FIRST ACTIONS:
1. Read the verbatim user request: E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
2. Read the project scope: E:\Online will-writing & digital estate planning V0\PROJECT.md
3. Read the milestone scope: E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m2_db_auth\SCOPE.md
4. Read the worker handoff: E:\Online will-writing & digital estate planning V0\.agents\worker_m2\handoff.md

CHALLENGE FOCUS (Database Constraints & Stress Testing):
Write and run empirical stress scripts (in your working directory, e.g. `E:\Online will-writing & digital estate planning V0\.agents\challenger_m2_1\stress_test.js`) to test:
1. Compound unique constraint enforcement:
   - Attempt to insert duplicate `QuestionnaireAnswer` with same `caseId` and `questionId`. Verify Prisma rejects it with a unique constraint error (P2002).
   - Attempt to insert duplicate `TemplateVersion` with same `templateId` and `version`. Verify rejection.
   - Attempt to insert duplicate `ClauseVersion` with same `clauseId` and `version`. Verify rejection.
2. Foreign key relational integrity:
   - Verify `LawyerReview` properly connects to `User` and `Case`. Verify creating a review with non-existent `lawyerId` or `caseId` fails or adheres to relational constraints.
3. Database Query Performance & Indexes:
   - Query Prisma schema to confirm secondary indexes on `customerId`, `lawyerId`, `caseId`, `status`, `actorId`, `[entity, entityId]`.
4. Idempotency of seed:
   - Verify that running seed verification or query on demo users always succeeds.

DELIVERABLE:
Write your empirical report in: `E:\Online will-writing & digital estate planning V0\.agents\challenger_m2_1\handoff.md`.
Conclude with:
`Verdict: APPROVE` (or `Verdict: REQUEST_CHANGES` with concrete failure evidence).
Send a message back to parent (`894e2a30-8730-42e3-9e4c-ea5656318368`).
</USER_REQUEST>
