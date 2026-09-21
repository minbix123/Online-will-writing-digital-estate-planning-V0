# Task Assignment: Explorer 1 (Milestone 5)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_1`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Explorer 1 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.
Your investigation focuses on: **Lawyer Portal, Case Assignment, Review Workflow, Decisions & Notes**.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md` (authoritative user requirements)
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md` (architecture, milestones, interfaces)
3. Existing code:
   - `src/app/lawyer/` (check current pages: dashboard, cases, case review)
   - `src/app/api/cases/` and any lawyer API routes
   - `prisma/schema.prisma` (Case, User, AuditLog models, relations: customerId, lawyerId, status, paymentStatus)
   - `src/middleware.ts` (lawyer role routing & protection)

## What to Investigate:
1. **Current State of Lawyer Routes & Pages**:
   - What exists in `src/app/lawyer/`? Is there a `/lawyer/dashboard`, `/lawyer/cases`, `/lawyer/case/[id]`?
   - How does a lawyer view assigned vs. unassigned (`status = 'IN_REVIEW'`, `lawyerId = null`) cases?
   - Can a lawyer self-assign/claim an unassigned case?
2. **Review Workflow & Decision Engine**:
   - When viewing a case at `/lawyer/case/[id]`:
     - How are questionnaire answers, testator details, and legal workflow flags (`GUARDIAN_REQUIRED`, `NRI`, etc.) rendered?
     - Can the lawyer view/download the generated DOCX?
     - How does the lawyer submit a decision: `APPROVE`, `REJECT`, or `REQUEST_CHANGES`?
     - Where are lawyer notes stored? Is there a `notes` field or `AuditLog` / `CaseReview` model?
   - Status transitions: `IN_REVIEW` -> `APPROVED` or `REJECTED` or back to `DRAFT` / `CHANGES_REQUESTED`.
3. **Security & Authorization (RBAC / IDOR)**:
   - What prevents a non-lawyer or unassigned lawyer from modifying case reviews?
   - Ensure `session.user.role === 'LAWYER' || session.user.role === 'ADMIN'`.
4. **Aqua UI Conformance**:
   - What UI components and CSS classes (`.aqua-*`) are used in existing portals?
5. **E2E Test Compatibility**:
   - Check `tests/` for lawyer-related test assertions to ensure zero regressions.

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- In `handoff.md`, structure your findings into: Observation, Logic Chain, Caveats, Conclusion, and Verification Method.
- Send a completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).

## 2026-09-17T12:14:17Z
You are Explorer 1 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.

Your working directory is:
E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_1
Project root:
E:\Online will-writing & digital estate planning V0
Parent conversation ID:
59624314-f71e-456e-93f6-c2287d67bede

Read these files immediately before starting:
1. E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_1\DISPATCH.md
2. E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
3. E:\Online will-writing & digital estate planning V0\PROJECT.md

Investigate:
1. Current state of lawyer portal: pages in src/app/lawyer/ (cases list, case review /lawyer/case/[id]).
2. Lawyer review workflow: case assignment, reviewing answers/flags/docx, approving/rejecting/requesting changes with notes, status transitions.
3. Security & RBAC: lawyer role verification, IDOR prevention, unassigned vs assigned case rules.
4. Aqua skeuomorphic UI conformance.
5. Existing test cases covering lawyer portal in tests/.

Deliverables:
- Write progress.md and handoff.md in your directory.
- Send a completion message to parent (59624314-f71e-456e-93f6-c2287d67bede) when done.

