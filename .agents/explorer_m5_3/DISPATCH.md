# Task Assignment: Explorer 3 (Milestone 5)

- Working Directory: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_3`
- Project Root: `E:\Online will-writing & digital estate planning V0`
- Parent Orchestrator ID: `59624314-f71e-456e-93f6-c2287d67bede`

## Mandate & Scope
You are Explorer 3 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.
Your investigation focuses on: **Mock Payment Flow, Atomic Transactions (`prisma.$transaction`) & Centralized UTC Audit Logging**.

## Required Reading:
1. `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md` (authoritative user requirements, R11 & R12)
2. `E:\Online will-writing & digital estate planning V0\PROJECT.md` (architecture, milestones, interfaces)
3. Existing code:
   - Payment routes: `src/app/api/payment/`, `src/app/customer/payment/` or similar
   - Audit logging: check where audit logs are currently created (`src/app/api/auth/register`, `document-generator.ts`, `src/lib/audit.ts` if any)
   - `prisma/schema.prisma` (Payment model: id, caseId, amount, currency, status, provider, reference, createdAt; AuditLog model: id, userId, action, details, ipAddress, createdAt)

## What to Investigate:
1. **Mock Payment Architecture**:
   - What payment endpoints currently exist?
   - Tier definitions per requirements:
     - Basic Will: ₹1,499
     - Will + Lawyer Review: ₹3,999
     - Complex / NRI Will: ₹7,999
   - Mock payment workflow:
     - Clear visual indication of "MOCK PAYMENT GATEWAY / TEST MODE".
     - Simulating successful payment or failed payment.
   - Atomic database transaction using `prisma.$transaction`:
     - Creates `Payment` record with status `COMPLETED`.
     - Updates `Case`: `paymentStatus = 'PAID'`, sets tier, and updates case status to `SUBMITTED` or `IN_REVIEW`.
     - Emits `PAYMENT_COMPLETED` audit log.
     - Guarantees all-or-nothing atomicity.
2. **Centralized UTC Audit Logging System**:
   - Where are audit logs currently emitted? Is it ad-hoc?
   - Need for a centralized utility (e.g. `src/lib/audit.ts` or `src/server/audit.ts`):
     - `createAuditLog({ userId, action, details, ipAddress })`.
     - Standard system actions: `USER_REGISTERED`, `USER_LOGIN`, `CASE_CREATED`, `QUESTIONNAIRE_SAVED`, `PAYMENT_COMPLETED`, `LAWYER_ASSIGNED`, `CASE_APPROVED`, `CASE_REJECTED`, `CHANGES_REQUESTED`, `DOCUMENT_GENERATED`, `TEMPLATE_CREATED`, `TEMPLATE_APPROVED`.
     - Strict UTC timestamp enforcement (`new Date().toISOString()`).
     - JSON-safe metadata serialization.
3. **E2E Test & Regression Compatibility**:
   - Check `tests/` for payment and audit log tests (e.g., Tier 1 payment tests, Tier 3 combinations).
   - Ensure all 131 tests continue to pass.

## Deliverables:
- Write `progress.md` and `handoff.md` in your directory.
- In `handoff.md`, structure your findings into: Observation, Logic Chain, Caveats, Conclusion, and Verification Method.
- Send a completion message to parent (`59624314-f71e-456e-93f6-c2287d67bede`).

## 2026-09-17T12:14:17Z
<USER_REQUEST>
You are Explorer 3 for Milestone 5: Lawyer Portal, Admin Portal, Mock Payment & Audit Logging.

Your working directory is:
E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_3
Project root:
E:\Online will-writing & digital estate planning V0
Parent conversation ID:
59624314-f71e-456e-93f6-c2287d67bede

Read these files immediately before starting:
1. E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_3\DISPATCH.md
2. E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
3. E:\Online will-writing & digital estate planning V0\PROJECT.md

Investigate:
1. Mock payment workflow: APIs (/api/payment/create, /api/payment/confirm), UI (/customer/payment), tiers (Basic ₹1,499, Lawyer Review ₹3,999, Complex/NRI ₹7,999).
2. Atomic transactions: using prisma.$transaction for Payment creation + Case status/tier update + UTC AuditLog.
3. Centralized UTC audit logging system: standard action types, UTC timestamping, structured JSON metadata.
4. Existing test cases in tests/ covering payment and audit logging.

Deliverables:
- Write progress.md and handoff.md in your directory.
- Send a completion message to parent (59624314-f71e-456e-93f6-c2287d67bede) when done.
</USER_REQUEST>
