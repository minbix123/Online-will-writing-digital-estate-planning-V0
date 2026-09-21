# Task Assignment: Implementation Worker (Milestone 5)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\worker_m5`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are the Implementation Worker (`teamwork_preview_worker`) for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.
Your objective is to implement genuine, production-grade, secure, performant functionality across all 4 tracks of Milestone 5 with full Aqua skeuomorphic UI fidelity.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

---

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md` (authoritative requirements: R8, R9, R11, R12)
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md` (master architecture, interfaces, milestone definitions)
3. The 3 Explorer Handoff Reports:
   - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_1\handoff.md` (Lawyer Portal & Case Review)
   - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_2\handoff.md` (Admin Portal & Metrics)
   - `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_3\handoff.md` (Mock Payment & Centralized Audit Logging)

---

## Tasks to Implement:

### Track 1: Centralized UTC Audit Logging
1. Create `src/lib/audit.ts` (or `src/server/audit.ts`):
   - Export `createAuditLog({ userId, action, details, ipAddress, tx })`:
     - Uses Prisma client or transaction client `tx`.
     - Supports standard actions: `USER_REGISTERED`, `USER_LOGIN`, `CASE_CREATED`, `QUESTIONNAIRE_SAVED`, `PAYMENT_INITIATED`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `LAWYER_ASSIGNED`, `LAWYER_REVIEW_SUBMITTED`, `CASE_APPROVED`, `CASE_REJECTED`, `CHANGES_REQUESTED`, `DOCUMENT_GENERATED`, `TEMPLATE_CREATED`, `TEMPLATE_STATUS_CHANGED`, `CLAUSE_STATUS_CHANGED`, `ADMIN_CASE_ASSIGNED`.
     - Strict UTC timestamping (`new Date()` or `toISOString()`).
     - JSON-safe details serialization.
   - Refactor existing ad-hoc audit logging in `src/app/api/auth/register`, `src/app/api/cases`, `src/server/document-generator.ts` to use `createAuditLog` without breaking contracts.

### Track 2: Mock Payment Engine & Atomic Transactions
2. `src/app/api/payment/create/route.ts`:
   - Enforce session authentication (`session.user.id`).
   - Validate case ownership (`case.customerId === session.user.id`).
   - Determine pricing tier:
     - Basic Will: ₹1,499 (`amount: 1499`)
     - Will + Lawyer Review: ₹3,999 (`amount: 3999`)
     - Complex / NRI Will: ₹7,999 (`amount: 7999`)
   - Create `Payment` record with status `PENDING`, `provider: "MOCK"`.
   - Emit `PAYMENT_INITIATED` audit log.
   - Return `{ paymentId, amount, currency: "INR", tier, status: "PENDING" }`.

3. `src/app/api/payment/confirm/route.ts`:
   - Validate session & case ownership.
   - Accept `{ paymentId, status: "SUCCESS" | "FAILURE" }`.
   - Atomic database transaction using `prisma.$transaction(async (tx) => { ... })`:
     - If `status === "SUCCESS"`:
       - Update `Payment`: `status = "COMPLETED"`, `reference = "MOCK_TXN_..."`.
       - Evaluate workflow flags using `LegalWorkflowEngine.evaluate(caseAnswers)`:
         - If `evaluation.requiresLawyerReview || tier !== "BASIC"`, transition `Case.status = "IN_REVIEW"`.
         - Otherwise transition `Case.status = "APPROVED"` or `"SUBMITTED"`.
       - Update `Case`: `paymentStatus = "PAID"`, `tier = tier`.
       - Record `PAYMENT_COMPLETED` audit log via `createAuditLog({ ..., tx })`.
     - If `status === "FAILURE"`:
       - Update `Payment`: `status = "FAILED"`.
       - Record `PAYMENT_FAILED` audit log.
   - Return updated payment and case status.

4. `src/app/api/checkout/route.ts`:
   - Maintain backward compatibility for any existing checkout triggers, delegating to the atomic transaction logic.

5. `src/app/customer/payment/page.tsx` (and redirect/alias `/customer/checkout`):
   - Aqua skeuomorphic design (`.aqua-window`, `.aqua-titlebar`, traffic light dots, `.aqua-card`, `.aqua-badge`, `.aqua-btn-primary`, `.aqua-btn-secondary`).
   - Prominent banner: `MOCK PAYMENT GATEWAY / TEST MODE — No real money is charged`.
   - Plan selection cards (Basic ₹1,499, Lawyer Review ₹3,999, Complex/NRI ₹7,999).
   - "Simulate Payment Success" and "Simulate Payment Failure" buttons with clear feedback and redirect to customer dashboard.

### Track 3: Lawyer Portal & Case Review Workflow
6. `src/app/lawyer/dashboard/page.tsx`:
   - Segregate into two clear Aqua panels:
     - **My Assigned Cases**: Cases where `lawyerId === session.user.id`. Shows customer name, case status, flags, date, and link to `/lawyer/case/[id]`.
     - **Unassigned Review Queue**: Cases where `status === "IN_REVIEW"` and `lawyerId === null`. Shows customer name, flags, and an interactive "Claim Case" button.
   - Aqua UI styling with quick statistics (Assigned, Pending Review, Approved).

7. `src/app/api/lawyer/cases/assign/route.ts`:
   - Enforce lawyer RBAC: `session.user.role === "LAWYER" || session.user.role === "ADMIN"`.
   - Validate that case exists and is in `IN_REVIEW` status.
   - Atomically assign `case.lawyerId = session.user.id`.
   - Emit `LAWYER_ASSIGNED` audit log.
   - Return updated case.

8. `src/app/lawyer/case/[id]/page.tsx`:
   - Case Review UI for assigned lawyer / admin:
     - Testator summary card (Name, Email, Phone, Address, Marital Status).
     - Full Questionnaire Answers viewer categorized by section (Personal, Family, Assets, Beneficiaries, Executors).
     - Legal Workflow Flags badges (`STANDARD`, `GUARDIAN_REQUIRED`, `NRI`, `FOREIGN_ASSETS`, `BUSINESS_INTEREST`, `EXISTING_WILL`).
     - Generated DOCX preview/download link (`/api/document/download?caseId=...`).
     - Review Decision Form:
       - Actions: `APPROVE`, `REJECT`, `REQUEST_CHANGES`.
       - Notes textarea (required for reject/changes requested).
       - Submit review button.

9. `src/app/api/lawyer/cases/review/route.ts`:
   - Enforce lawyer RBAC: `session.user.role === "LAWYER" || session.user.role === "ADMIN"`.
   - Verify that lawyer owns the case (`case.lawyerId === session.user.id || session.user.role === "ADMIN"`).
   - Atomic `prisma.$transaction`:
     - Create `LawyerReview` record with `lawyerId`, `caseId`, `status: decision`, `notes`.
     - Update `Case.status`:
       - If `decision === "APPROVE"` -> `status = "APPROVED"`.
       - If `decision === "REJECT"` -> `status = "REJECTED"`.
       - If `decision === "REQUEST_CHANGES"` -> `status = "DRAFT"` (or `"IN_REVIEW"` with changes flag).
     - Emit `LAWYER_REVIEW_SUBMITTED` audit log.
   - Return success.

10. IDOR Hardening in `src/app/api/document/download/route.ts`:
    - Ensure lawyers can only download documents for cases assigned to them (`case.lawyerId === user.id`), or unassigned review cases (`case.status === "IN_REVIEW" && case.lawyerId === null`), but NOT cases assigned to another lawyer.

### Track 4: Admin Portal & System Metrics
11. `src/app/admin/layout.tsx` & `src/app/admin/page.tsx`:
    - Aqua navigation shell: Dashboard (`/admin/dashboard`), Users (`/admin/users`), Cases (`/admin/cases`), Templates (`/admin/templates`), Audit Logs (`/admin/audit-logs`).
    - Redirect `/admin` -> `/admin/dashboard`.
    - Server-side guard: `session?.user?.role === "ADMIN"`; unauthorized users redirect to `/login` or 403.

12. `src/app/admin/dashboard/page.tsx`:
    - Aggregated metrics via parallel `Promise.all` with `groupBy` and `aggregate`:
      - Total Users and breakdown by role (`CUSTOMER`, `LAWYER`, `ADMIN`).
      - Total Cases and breakdown by status (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `APPROVED`, `REJECTED`).
      - Payment statistics (Total revenue in INR, successful transactions count).
      - Template and Clause counts.
      - Recent system audit events feed.

13. `src/app/admin/users/page.tsx`:
    - User directory with role filter buttons, user metadata (Email, Name, Role badge, Created At, Cases count).

14. `src/app/admin/cases/page.tsx`:
    - Master cases list with status filters, customer name, assigned lawyer name/unassigned badge, payment status badge, created date, and quick action to reassign lawyer (`POST /api/admin/cases/assign`).

15. `src/app/admin/templates/page.tsx` & `src/app/api/admin/templates/status/route.ts`:
    - List templates and clauses with version numbers and lifecycle badges (`DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`).
    - Action buttons to transition lifecycle states (e.g. Approve, Lock, Archive).

16. `src/app/admin/audit-logs/page.tsx`:
    - Full audit log explorer with action filter dropdown, user filter, date display in explicit UTC ISO format, and expandable JSON metadata.

---

## Verification Requirements:
1. `node "node_modules/typescript/bin/tsc" --noEmit`: 0 errors.
2. `node "node_modules/next/dist/bin/next" build`: All routes compiled cleanly.
3. `node tests/runner.js`: 131/131 tests passing (zero regression).
4. Create and run an integration verification script: `.agents/worker_m5/verify_m5.js` (or `.ts`):
   - Test 1: Centralized audit logging (`createAuditLog`) with UTC timestamps.
   - Test 2: Mock payment creation & atomic confirmation (`prisma.$transaction`).
   - Test 3: Lawyer case claiming (`/api/lawyer/cases/assign`).
   - Test 4: Lawyer case review decision (`/api/lawyer/cases/review`) with `LawyerReview` record and status transition.
   - Test 5: Lawyer download IDOR isolation.
   - Test 6: Admin metrics aggregation query accuracy.
   - Test 7: Template lifecycle state transition API.
   - Test 8: Full Aqua UI styling check across lawyer and admin routes.
5. Write `changes.md` and `handoff.md` in your directory.
6. Send completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).

## 2026-09-17T12:20:00Z
Received user request to implement Milestone 5:
- Track 1: Centralized UTC Audit Logging in src/lib/audit.ts
- Track 2: Mock Payment Engine & Atomic Transactions (/api/payment/create, /api/payment/confirm, /api/checkout backwards compat, /customer/payment UI & alias)
- Track 3: Lawyer Portal & Case Review Workflow (/lawyer/dashboard, /api/lawyer/cases/assign, /lawyer/case/[id], /api/lawyer/cases/review, IDOR hardening on /api/document/download)
- Track 4: Admin Portal & System Metrics (/admin/layout.tsx, /admin/page.tsx, /admin/dashboard, /admin/users, /admin/cases, /admin/templates, /api/admin/templates/status, /admin/audit-logs)
Verification: tsc --noEmit, next build, tests/runner.js (131/131), verify_m5.js, changes.md, handoff.md, send message.

