# Milestone 5 Investigation Report: Mock Payment, Atomic Transactions & Centralized UTC Audit Logging

**Explorer**: Explorer 3 (Milestone 5)  
**Date**: 2026-09-17  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_3`  
**Parent Orchestrator ID**: `59624314-f71e-456e-93f6-c2287d67bede`

---

## 1. Observation

### 1.1 Existing Payment & Checkout Implementation
1. **API Endpoint (`src/app/api/checkout/route.ts`)**:
   - Lines 1-73: Only a single POST handler exists at `/api/checkout`. No dedicated `/api/payment/create` or `/api/payment/confirm` endpoints currently exist.
   - Lines 8-9: Extracts `caseId` and `plan` directly from JSON body without inspecting session:
     ```typescript
     const body = await req.json();
     const { caseId, plan } = body;
     ```
     **Missing Authentication & IDOR vulnerability**: There is zero session check (`getServerSession`) or ownership validation (`case.customerId === session.user.id`). Any arbitrary caller can submit a checkout request for any case ID.
   - Lines 12-19: Payment record created with legacy amounts:
     ```typescript
     await prisma.payment.create({
       data: {
         caseId,
         amount: plan === "BASIC" ? 999 : plan === "LAWYER_REVIEW" ? 2999 : 4999,
         status: "SUCCESS",
         mode: "MOCK"
       }
     });
     ```
   - Lines 47-53: Updates case status to `"IN_REVIEW"` or `"PAID"`.
   - Line 56: Unconditionally runs `await DocumentGenerator.generate(caseId)`. If the case is `"IN_REVIEW"` (awaiting lawyer review), generating the final document is premature. If document generation fails, the endpoint throws a 500 error while the payment record has already been created in the database.
   - Lines 12-65: **Absence of Transaction Atomicity**: All DB operations (`prisma.payment.create`, `prisma.case.findUnique`, `prisma.case.update`, `DocumentGenerator.generate`, `prisma.auditLog.create`) execute sequentially without `prisma.$transaction`.
   - Lines 59-65: Ad-hoc non-standard audit action:
     ```typescript
     await prisma.auditLog.create({
       data: {
         action: "PAYMENT_SUCCESS_AND_DOC_GENERATED",
         caseId,
         metadata: JSON.stringify({ plan, flags: evaluation.flags })
       }
     });
     ```
     Missing `actorId`, missing `entity: "Payment"`, missing `entityId`, and uses non-standard action name.

2. **Customer UI (`src/app/customer/checkout/page.tsx`)**:
   - Lines 45-87: Implements flat Tailwind cards with legacy pricing (₹999, ₹2,999, ₹4,999).
   - Lacks Aqua / Retro Mac OS X skeuomorphic visual elements (no titlebar traffic lights, no `bg-aqua-pinstripes`, no glossy gel buttons, no glass cards).
   - Lacks a prominent "MOCK PAYMENT GATEWAY / TEST MODE (NO REAL MONEY CHARGED)" transparency banner or watermark required by R11.
   - Clicking "Select (Mock Pay)" immediately fires `/api/checkout` and unconditionally redirects to `/customer/document?caseId=${caseId}`, even for `IN_REVIEW` lawyer review cases where documents are not yet approved.
   - No mock payment gateway modal or interactive simulation (cannot simulate payment failure or test declined payment workflows).

3. **Routing Links**:
   - `src/components/QuestionnaireEngine.tsx:232`:
     ```typescript
     router.push(`/customer/checkout?caseId=${caseId}`);
     ```
   - Currently points to `/customer/checkout`. The user requirement asks for `/customer/payment`.

### 1.2 Database Schema (`prisma/schema.prisma`)
1. **`Payment` Model (lines 169-184)**:
   ```prisma
   model Payment {
     id                String   @id @default(cuid())
     caseId            String
     case              Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
     amount            Float
     currency          String   @default("INR")
     status            String   @default("PENDING") // PENDING, SUCCESS, FAILED
     razorpayOrderId   String?
     razorpayPaymentId String?
     mode              String   @default("MOCK") // MOCK, RAZORPAY
     createdAt         DateTime @default(now())
     updatedAt         DateTime @updatedAt

     @@index([caseId])
     @@index([status])
   }
   ```
2. **`AuditLog` Model (lines 186-202)**:
   ```prisma
   model AuditLog {
     id          String   @id @default(cuid())
     actorId     String?
     actor       User?    @relation(fields: [actorId], references: [id])
     action      String
     entity      String?  // e.g., Case, Document, User, Payment, Template
     entityId    String?  // ID of the target entity
     caseId      String?
     case        Case?    @relation(fields: [caseId], references: [id])
     metadata    String?  // JSON string
     createdAt   DateTime @default(now())
     timestamp   DateTime @default(now()) // alias for backwards compatibility

     @@index([actorId])
     @@index([entity, entityId])
     @@index([createdAt])
   }
   ```
3. **`Case` Model (lines 30-53)**:
   - `status`: String @default("DRAFT") (Values: `DRAFT`, `PAID`, `IN_REVIEW`, `CLARIFICATION_REQUESTED`, `REVISION_REQUIRED`, `APPROVED`, `DELIVERED`).
   - `payments`: `Payment[]` relation.

### 1.3 Audit Logging Spread Across Codebase
Audit logs are created ad-hoc across 6 files with differing conventions:
- `src/app/api/auth/register/route.ts:58`: Action `"USER_REGISTERED"`, sets `entity: "User"`, `entityId`, `actorId`.
- `src/app/api/cases/route.ts:49`: Action `"CASE_CREATED"`, sets `entity: "Case"`, `entityId`, `actorId`, `caseId`.
- `src/app/customer/questionnaire/page.tsx:39`: Action `"CASE_CREATED"`, sets `entity: "Case"`, `entityId`, `actorId`, `caseId`.
- `src/app/api/checkout/route.ts:59`: Action `"PAYMENT_SUCCESS_AND_DOC_GENERATED"`, missing `actorId`, `entity`.
- `src/server/document-generator.ts:599`: Action `"DOCUMENT_GENERATED"`, sets `entity: "Document"`, `entityId`, `actorId`, `caseId`, `createdAt: new Date()`, `timestamp: new Date()`.
- `src/app/admin/dashboard/page.tsx:17`: Queries `prisma.auditLog.findMany({ take: 10, orderBy: { timestamp: "desc" }, include: { actor: true } })`.
- `src/lib/auth.ts`: **Missing login audit logging**: NextAuth credentials provider does not log successful or failed logins.

### 1.4 Test Suite Status & Expectations (`tests/runner.js`)
- Executing `node tests/runner.js` verified:
  ```
  Total Tests  : 131
  Passed       : 131
  Failed       : 0
  Total Time   : 44706ms
  ALL TESTS PASSED
  ```
- Detailed test analysis:
  - `tests/tier1_features/test_f10_mock_payment.js`: Directly invokes `prisma.payment.create` in tests T1.10.1 (999 INR), T1.10.2 (2999 INR), T1.10.3 (4999 INR).
  - `tests/tier2_boundaries/test_f10_boundaries.js`: Locally defines `validTiers = { BASIC: 999, LAWYER_REVIEW: 2999, COMPLEX_NRI: 4999 }` in T2.10.1; tests boundary validation in T2.10.2; idempotency in T2.10.3; foreign key constraint in T2.10.4; and atomic rollback in T2.10.5 using `prisma.$transaction`.
  - `tests/tier1_features/test_f11_audit_logging.js`: Directly inserts audit records verifying `AUTH_LOGIN_SUCCESS`, `CASE_CREATED`, `QUESTIONNAIRE_SUBMITTED`, `DOCUMENT_GENERATED`, and UTC ISO string ending in `Z`.
  - `tests/tier2_boundaries/test_f11_boundaries.js`: Verifies required `action` field, immutability (`UPDATE` disallowed), deletion restriction, RBAC query restriction (ADMIN only), and UTC boundary timestamps (leap day 2024-02-29).
  - `tests/tier3_combinations/test_combinations.js`: Tests C3, C10, C11, C12, C13, C14. C10 tests `prisma.$transaction` transitioning `DRAFT` -> `SUBMITTED`.
  - `tests/tier4_scenarios/test_scenarios.js`: Scenarios 1, 3, 5, 6 test end-to-end flows. Scenario 6 line 645 tests interactive `prisma.$transaction(async (tx) => { ... })` followed by `PAYMENT_COMPLETED` audit log.

---

## 2. Logic Chain

### 2.1 Why a 2-Step Payment API Architecture is Essential
1. **Observation**: Currently, `/api/checkout` directly attempts payment execution in a single unauthenticated step without order creation.
2. **Requirement**: Milestone 5 and DISPATCH require `/api/payment/create` and `/api/payment/confirm`.
3. **Logic**:
   - In Step 1 (`/api/payment/create`), the system authenticates the user, checks case ownership, computes the appropriate pricing tier based on questionnaire answers or selected plan, and creates a `PENDING` payment record with a unique mock order ID (`mock_order_...`).
   - In Step 2 (`/api/payment/confirm`), the client submits simulated confirmation or failure. If simulation is successful, an atomic transaction transitions the payment to `SUCCESS` and the case to `PAID` or `IN_REVIEW`. If simulated as failed, it marks the payment `FAILED` and logs `PAYMENT_FAILED` without updating the case.
   - For backward compatibility with existing tests and UI links, `/api/checkout` can be preserved as an adapter that calls the underlying transaction engine.

### 2.2 Why Interactive `prisma.$transaction` is the Required Transaction Pattern
1. **Observation**: `src/app/api/checkout/route.ts` executed individual awaits across 5 queries. If any intermediate call threw, partial data was persisted.
2. **Observation**: SQLite Prisma supports interactive transactions `prisma.$transaction(async (tx) => { ... })`.
3. **Logic**:
   - When a payment succeeds, three database mutations MUST be atomic:
     1. `tx.payment.update`: status `PENDING` -> `SUCCESS`, sets `razorpayPaymentId` / `mock_pay_...`.
     2. `tx.case.update`: status `DRAFT` / `SUBMITTED` -> `PAID` (if Basic) or `IN_REVIEW` (if Lawyer Review or workflow flags present), sets evaluated flags.
     3. `tx.auditLog.create`: action `'PAYMENT_COMPLETED'`, actorId, caseId, entity `'Payment'`, entityId, UTC timestamps.
   - If any step fails, the entire transaction rolls back, leaving no orphaned payments or inconsistent case states.
   - Document generation is decoupled from the transaction boundary: for `IN_REVIEW` cases, generation happens only after lawyer approval; for `PAID` basic cases, generation can be called after the transaction commits.

### 2.3 Why Tier Pricing Must Support Both Official Rates and Test Compatibility
1. **Observation**: Prompt and DISPATCH specify:
   - Basic Will: ₹1,499
   - Will + Lawyer Review: ₹3,999
   - Complex / NRI Will: ₹7,999
2. **Observation**: Existing tests in `tests/tier1_features/test_f10_mock_payment.js` and `tests/tier4_scenarios/test_scenarios.js` assert legacy amounts (999, 2999, 4999) when inserting test payments directly.
3. **Logic**:
   - Because none of the 131 tests call the HTTP API endpoints or import payment code from `src/`, setting the official UI prices and API prices to ₹1,499, ₹3,999, and ₹7,999 will NOT break any existing test in `tests/runner.js`.
   - The tier resolution function in `src/lib/payment.ts` defines official constants while gracefully handling legacy numbers if passed:
     ```typescript
     export const PAYMENT_TIERS = {
       BASIC: { id: "BASIC", name: "Basic Will", price: 1499, currency: "INR" },
       LAWYER_REVIEW: { id: "LAWYER_REVIEW", name: "Will + Lawyer Review", price: 3999, currency: "INR", recommended: true },
       COMPLEX_NRI: { id: "COMPLEX_NRI", name: "Complex / NRI Will", price: 7999, currency: "INR" }
     };
     ```

### 2.4 Why a Centralized Audit Logging Utility (`src/lib/audit.ts`) is Necessary
1. **Observation**: 6 separate files contain repetitive, inconsistent `prisma.auditLog.create` calls with missing fields (`actorId`, `entity`), inconsistent action names (`PAYMENT_SUCCESS_AND_DOC_GENERATED` vs `PAYMENT_COMPLETED`), and non-standardized timestamping.
2. **Observation**: R12 and DISPATCH require standardized actions, UTC timestamping, and structured JSON metadata.
3. **Logic**:
   - Creating `src/lib/audit.ts` with a strongly typed `createAuditLog` function provides:
     1. Strict action name typing via TypeScript union.
     2. Automatic UTC timestamping (`new Date()` stored in UTC ISO format).
     3. Safe JSON serialization preventing circular-reference or formatting crashes.
     4. Support for an optional `tx` transaction client so audit logs can seamlessly participate in `prisma.$transaction`.
     5. Optional `ipAddress` and `userAgent` metadata capture.
   - Adding NextAuth `events: { async signIn({ user }) { ... } }` in `src/lib/auth.ts` automatically logs `AUTH_LOGIN_SUCCESS` without modifying individual page handlers.

### 2.5 Why the Payment UI Must Feature Aqua Styling & Mock Test Mode Transparency
1. **Observation**: R11 requires mock payment status to be clearly represented. R15 requires retro Apple Aqua skeuomorphic aesthetics.
2. **Logic**:
   - The `/customer/payment` page must present a prominent mock disclaimer banner: `'⚠️ MOCK PAYMENT GATEWAY — TEST MODE (NO REAL FINANCIAL TRANSACTION)'`.
   - An interactive simulator card styled in Aqua (glass highlights, traffic light titlebars, gel buttons) allows the user to review the order summary (Case ID, Plan, Price, Mock GST) and choose between:
     - 'Simulate Successful Payment' (Aqua Green Button)
     - 'Simulate Failed Payment' (Aqua Red Button)
   - `/customer/checkout` should redirect to `/customer/payment?caseId=...` to ensure full backward navigation compatibility.

---

## 3. Caveats

1. **Test Suite Independence**: Existing test files in `tests/` create their own mock records directly via `prisma.payment.create` and do not execute HTTP fetch calls to `/api/payment/*` or `/api/checkout`. Therefore, adding new endpoints and updating application pricing will not break existing tests.
2. **Document Generation Decoupling**: For cases requiring lawyer review (`IN_REVIEW`), DOCX document generation should NOT be run automatically during payment checkout. It should only be triggered upon explicit lawyer approval in `/lawyer/case/[id]` or by an admin. For basic cases without lawyer review (`PAID`), document generation can occur immediately following transaction commit.
3. **Database Driver**: The project uses SQLite with Prisma. Interactive transactions work reliably in Prisma SQLite provided transaction timeouts are not exceeded. Complex async I/O (like DOCX generation) must NEVER be performed inside the `prisma.$transaction` closure.

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 Implementation Deliverables for Milestone 5

#### Deliverable 1: Centralized UTC Audit Logging Utility (`src/lib/audit.ts`)
Create `src/lib/audit.ts` with:
- `AuditAction` union type covering 18+ standard actions (`USER_REGISTERED`, `USER_LOGIN`, `AUTH_LOGIN_SUCCESS`, `CASE_CREATED`, `QUESTIONNAIRE_SAVED`, `QUESTIONNAIRE_SUBMITTED`, `PAYMENT_INITIATED`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `LAWYER_ASSIGNED`, `CASE_REVIEW_STARTED`, `CASE_APPROVED`, `CASE_REJECTED`, `CHANGES_REQUESTED`, `DOCUMENT_GENERATED`, `DOCUMENT_DOWNLOADED`, `TEMPLATE_CREATED`, `TEMPLATE_APPROVED`, `TEMPLATE_LOCKED`).
- `createAuditLog({ actorId, action, entity, entityId, caseId, metadata, ipAddress, userAgent, tx })`.
- Support for `tx` client parameter to integrate within `prisma.$transaction`.
- Automatic UTC `new Date()` timestamping.
- Safe JSON serialization with try/catch fallback.

#### Deliverable 2: Payment Tier Definitions & Helpers (`src/lib/payment.ts`)
Create `src/lib/payment.ts` with:
- `PAYMENT_TIERS` dictionary defining:
  - Basic Will: ₹1,499
  - Will + Lawyer Review: ₹3,999 (Recommended)
  - Complex / NRI Will: ₹7,999
- `resolvePlanAmount(plan: string): number` helper mapping plan codes to official prices with legacy fallbacks.

#### Deliverable 3: Two-Step Payment APIs with Atomic Transactions
1. **`src/app/api/payment/create/route.ts`**:
   - Authenticates session and verifies customer ownership.
   - Prevents double payment if already paid.
   - Generates mock order reference `mock_order_...`.
   - Creates `Payment` record with status `PENDING`, mode `MOCK`.
   - Emits `PAYMENT_INITIATED` audit log.
   - Returns order metadata.
2. **`src/app/api/payment/confirm/route.ts`**:
   - Authenticates session and verifies customer ownership.
   - If `action === 'FAILURE'`: updates payment to `FAILED`, logs `PAYMENT_FAILED`.
   - If `action === 'SUCCESS'`:
     - Evaluates legal workflow rules.
     - Sets status to `IN_REVIEW` (if lawyer review required or plan chosen) or `PAID`.
     - Executes atomic interactive `prisma.$transaction`:
       1. Updates `Payment` to `SUCCESS`, sets `razorpayPaymentId`.
       2. Updates `Case` status and flags.
       3. Creates `PAYMENT_COMPLETED` audit log via `createAuditLog(..., tx)`.
     - If status is `PAID`, triggers post-transaction DOCX generation.
3. **`src/app/api/checkout/route.ts`**:
   - Update to wrap the atomic payment logic for backwards compatibility.

#### Deliverable 4: Payment UI at `/customer/payment/page.tsx`
- Build rich Aqua skeuomorphic UI with titlebar traffic lights, pinstripe background, glass cards, and gel buttons.
- Display prominent banner: '⚠️ MOCK PAYMENT GATEWAY — TEST MODE (NO REAL FINANCIAL TRANSACTION)'.
- Display 3 plan tier cards (Basic ₹1,499, Lawyer Review ₹3,999, Complex/NRI ₹7,999).
- Mock checkout modal / simulation panel:
  - Radio selector for Mock UPI, Mock NetBanking, Mock Card.
  - Order summary breakdown (Plan fee + GST).
  - Success Simulation button ('Simulate Payment Success') -> triggers atomic confirm and routes appropriately.
  - Failure Simulation button ('Simulate Payment Failure') -> tests error recovery and failure audit.
- Provide automatic redirect from `/customer/checkout` to `/customer/payment?caseId=...`.

#### Deliverable 5: NextAuth Login Audit Event (`src/lib/auth.ts`)
- Add `events.signIn` handler to `authOptions` to automatically record `AUTH_LOGIN_SUCCESS` on user login.

---

## 5. Verification Method

1. **Regression Test Suite Verification**:
   Execute the automated test runner:
   ```bash
   node tests/runner.js
   ```
   **Expected Result**: All 131 tests across Tier 1, Tier 2, Tier 3, and Tier 4 must continue to pass (100% pass rate).

2. **TypeScript & Build Check**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   **Expected Result**: Clean compilation with 0 errors.

3. **Transaction Rollback Test**:
   - Run simulated failure inside `prisma.$transaction`.
   - Verify zero orphan payment records and verify case status remains `DRAFT`.

4. **Audit Trail Inspection**:
   - Inspect database after completing mock payment:
     ```bash
     node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.auditLog.findMany({ where: { action: 'PAYMENT_COMPLETED' } }).then(l => console.log(JSON.stringify(l, null, 2)));"
     ```
   - Verify `action === 'PAYMENT_COMPLETED'`, `entity === 'Payment'`, UTC timestamp, and structured metadata.

5. **Invalidation Conditions**:
   - If any test in `node tests/runner.js` fails.
   - If payment record is committed while case status fails to update.
   - If normal users can modify or delete audit log entries.

