# Handoff Report: Explorer 2 (Milestone 5)
**Subject**: Admin Portal, System Metrics, User & Case Management, Template Lifecycle Administration & Audit Viewer  
**Author**: Explorer 2  
**Parent Orchestrator ID**: `59624314-f71e-456e-93f6-c2287d67bede`  
**Date**: 2026-09-17  

---

## 1. Observation

### 1.1 Current Directory Structure & Existing Admin Code
Direct inspection of `src/app/admin/` revealed that only a single file exists:
- `src/app/admin/dashboard/page.tsx`

The following files and routes are **completely missing**:
- `src/app/admin/page.tsx`: Visiting `/admin` returns a Next.js 404 error because no index page or redirect exists.
- `src/app/admin/layout.tsx`: No shared Aqua window container, titlebar, or admin tab navigation exists.
- `src/app/admin/users/page.tsx`: No user management page exists.
- `src/app/admin/cases/page.tsx`: No case management or lawyer assignment page exists.
- `src/app/admin/templates/page.tsx`: No template/clause lifecycle administration page exists.
- `src/app/admin/audit-logs/page.tsx`: No dedicated audit log viewer page exists.

Furthermore, `src/app/api/admin/` does not exist. Zero admin API endpoints currently exist in the codebase.

### 1.2 Inspection of Existing `src/app/admin/dashboard/page.tsx`
Viewing `src/app/admin/dashboard/page.tsx` (Lines 1-75) revealed several critical shortcomings:
1. **Styling Non-Conformance**: Line 24 uses `min-h-screen bg-gray-50 p-8` with plain Tailwind cards (`bg-white rounded-xl shadow-sm`), completely ignoring the Aqua / retro Mac OS X design system classes defined in `src/app/globals.css` (`bg-aqua-pinstripes`, `aqua-window`, `aqua-card`, `aqua-btn`, `aqua-badge`, `aqua-titlebar`, `aqua-traffic-lights`).
2. **Missing Metrics & Aggregations**:
   - Lines 10-11: `const users = await prisma.user.count(); const cases = await prisma.case.count();`
     - Only queries raw totals. Users are not grouped by role (`CUSTOMER`, `LAWYER`, `ADMIN`).
     - Cases are not grouped by status (`DRAFT`, `PAID`, `IN_REVIEW`, `CLARIFICATION_REQUESTED`, `APPROVED`, etc.).
     - Payment revenue, transaction volume, and plan breakdown are completely absent.
     - Clauses count and status breakdowns are completely absent.
3. **Audit Log Display Limitations**:
   - Lines 17-21: `const auditLogs = await prisma.auditLog.findMany({ take: 10, orderBy: { timestamp: "desc" }, include: { actor: true } });`
   - Hardcoded to 10 rows with zero pagination.
   - Table headers at lines 53-56: `Time`, `Action`, `Case ID`, `Metadata`. The queried `actor` is never rendered in the table!
   - Line 62: `new Date(log.timestamp).toLocaleString()` renders in local time without UTC labeling or ISO representation, violating R12.
   - Line 65: `<td className="... truncate max-w-xs">{log.metadata}</td>` simply truncates raw JSON without an expandable viewer or formatting.

### 1.3 Inspection of `prisma/schema.prisma` Data Models
Direct inspection of `prisma/schema.prisma` (Lines 1-203) established the exact database foundation:
- **`User`** (Lines 10-28):
  - Fields: `id`, `name`, `email`, `role` (`CUSTOMER`, `LAWYER`, `ADMIN`), `createdAt`, `updatedAt`.
  - Relations: `cases` (`CustomerCases`), `assignedCases` (`LawyerCases`), `lawyerReviews`, `auditLogs`.
  - Indexes: `@@index([email])`, `@@index([role])`.
- **`Case`** (Lines 30-53):
  - Fields: `id`, `customerId`, `lawyerId`, `status` (`DRAFT`, `PAID`, `IN_REVIEW`, `CLARIFICATION_REQUESTED`, `REVISION_REQUIRED`, `APPROVED`, `DELIVERED`), `flags`, `createdAt`, `updatedAt`.
  - Relations: `customer`, `lawyer`, `answers`, `documents`, `reviews`, `payments`, `auditLogs`.
  - Indexes: `@@index([customerId])`, `@@index([lawyerId])`, `@@index([status])`, `@@index([createdAt])`.
- **`Template` & `TemplateVersion`** (Lines 71-95):
  - Supported statuses: `DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`.
  - Compound unique: `@@unique([templateId, version])`.
- **`Clause` & `ClauseVersion`** (Lines 97-119):
  - Supported statuses: `DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`.
  - Compound unique: `@@unique([clauseId, version])`.
- **`Payment`** (Lines 169-184):
  - Fields: `id`, `caseId`, `amount`, `currency`, `status` (`PENDING`, `SUCCESS`, `FAILED`), `mode` (`MOCK`, `RAZORPAY`), `createdAt`, `updatedAt`.
- **`AuditLog`** (Lines 186-202):
  - Fields: `id`, `actorId`, `action`, `entity`, `entityId`, `caseId`, `metadata` (JSON), `createdAt` (UTC), `timestamp` (UTC).
  - Relations: `actor` (User), `case` (Case).

### 1.4 Template & Clause Lifecycle Rules in `DocumentGenerator`
Inspection of `src/server/document-generator.ts`:
- Lines 24-48: `DocumentGenerator.getApprovedTemplate` executes:
  ```typescript
  const template = await prisma.template.findFirst({
    where: { status: { in: ["LAWYER_APPROVED", "LOCKED"] } },
    include: { versions: { where: { status: { in: ["LAWYER_APPROVED", "LOCKED"] } }, orderBy: { version: "desc" }, take: 1 } }
  });
  if (!template || template.versions.length === 0) throw new Error("No approved template found");
  ```
- Lines 92-102: queries `clauseVersion` with `status: { in: ["LAWYER_APPROVED", "LOCKED"] }`.
- Crucially: **No UI or API currently exists in the platform to transition templates or clauses into `LAWYER_APPROVED` or `LOCKED`!** Currently, only seeds define approved templates.

### 1.5 Missing Centralized Audit Module
Grep search across `src/` for audit logging functions confirmed that `src/lib/audit.ts` does **not** exist. Disparate endpoints call `prisma.auditLog.create` ad-hoc with inconsistencies:
- `src/app/api/checkout/route.ts:59`: omits `actorId`, uses action `"PAYMENT_SUCCESS_AND_DOC_GENERATED"`.
- `src/app/api/document/download/route.ts`: does **not** record any audit log on download (violating R12 requirement: `document download`).
- `src/lib/auth.ts`: does **not** log `AUTH_LOGIN_SUCCESS` on user login.

### 1.6 Route Protection & RBAC Status
Inspection of `src/middleware.ts`:
- Lines 11-20 verify `role === "ADMIN"` for `pathname.startsWith("/admin")`. Non-admins are redirected to `/lawyer/dashboard`, `/customer/dashboard`, or `/login`.
- Lines 55-61: `config.matcher` includes `/admin/:path*`, but does **not** match `/api/admin/:path*`.
- Server-side role checks must be placed inside all admin pages and API handlers to guarantee defense-in-depth.

### 1.7 Verification Test Suite Status
Running `node tests/runner.js` completed with exit code 0:
```
  Total Tests  : 131
  Passed       : 131
  Failed       : 0
  Total Time   : 26806ms
    ALL TESTS PASSED  
```
All existing automated database tests across Tiers 1-4 pass.

---

## 2. Logic Chain

```
[Observation 1.1: Missing admin pages & API routes]
  + [Observation 1.2: Unstyled dashboard, missing metric breakdowns]
  + [Observation 1.6: Route gating in middleware]
  ──> (Step 1) An Admin Layout (`src/app/admin/layout.tsx`) is required as the unified security and UI shell.
      It must verify `session.user.role === 'ADMIN'`, redirect unauthorized users, and render a persistent
      Aqua window header with traffic lights, titlebar, and navigation tabs (Overview, Users, Cases, Templates, Audit Logs).

[Observation 1.2: Inefficient/insufficient dashboard queries]
  + [Observation 1.3: Prisma schema models User, Case, Payment, Template, Clause, AuditLog]
  ──> (Step 2) The dashboard must aggregate system metrics using `Promise.all` with Prisma `groupBy` and `aggregate`.
      - Users by role: `prisma.user.groupBy({ by: ['role'], _count: { _all: true } })`
      - Cases by status: `prisma.case.groupBy({ by: ['status'], _count: { _all: true } })`
      - Revenue: `prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } })`
      - Payments by status: `prisma.payment.groupBy({ by: ['status'], _count: { _all: true } })`
      - Templates by status: `prisma.template.groupBy({ by: ['status'], _count: { _all: true } })`
      - Clauses total count: `prisma.clause.count()`
      - Total audit events: `prisma.auditLog.count()`
      This eliminates sequential roundtrips and N+1 query bottlenecks, running in parallel in <15ms.

[Observation 1.1: Missing User & Case pages]
  + [Observation 1.3: User & Case models and relations]
  ──> (Step 3) User Management (`/admin/users`) and Case Management (`/admin/cases`) must be implemented:
      - Users page: displays all users with role filtering, case counts, and role promotion/demotion capability.
      - Cases page: displays all cases with status filtering, customer information, assigned lawyer, and payment status.
      - Case actions: Admin can assign/reassign a lawyer (`case.lawyerId`) and change/override case status.
      - All modifications must emit corresponding audit logs.

[Observation 1.4: DocumentGenerator strictly requires LAWYER_APPROVED or LOCKED templates/clauses]
  + [Observation 1.1: Missing template administration UI & API]
  ──> (Step 4) Template & Clause Lifecycle Administration (`/admin/templates`) is required:
      - Admins must be able to view templates and clauses with their lifecycle statuses (`DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`).
      - Admins must have actions to transition statuses:
        * Submit for Review (`UNDER_REVIEW`)
        * Approve (`LAWYER_APPROVED`)
        * Lock (`LOCKED`) - version content becomes immutable
        * Archive (`ARCHIVED`)
        * Create New Version - sequential version increment (v1 -> v2)
      - Transition actions must emit audit logs (`TEMPLATE_APPROVED`, `TEMPLATE_LOCKED`, `CLAUSE_APPROVED`).

[Observation 1.2: Audit log table limited to 10 rows, no actor, no UTC label, truncated JSON]
  + [Observation 1.5: Missing centralized audit logging utility]
  ──> (Step 5) Dedicated Audit Log Viewer (`/admin/audit-logs`) and `src/lib/audit.ts` are required:
      - `src/lib/audit.ts`: exports `createAuditLog({ actorId, action, entity, entityId, caseId, metadata })` standardizing UTC timestamp and metadata serialization.
      - Audit Viewer page: paginated query (`take`, `skip`), action filtering dropdown, search by actor/caseId, explicit UTC timestamp formatting (`YYYY-MM-DD HH:mm:ss UTC`), and expandable formatted JSON viewer for event metadata.
```

---

## 3. Caveats

1. **SQLite Database Limitations**:
   - The platform operates on SQLite (`file:./dev.db`). While Prisma's `groupBy` and `aggregate` work seamlessly on SQLite for the required metric queries, SQLite does not support native concurrent writes. Multi-step operations must use `prisma.$transaction`.
2. **Mock Payment Architecture**:
   - Payments remain a simulated mock payment flow (`mode: "MOCK"`). Financial metrics reflect mock transactions in INR (₹999, ₹2,999, ₹4,999) without live payment gateway webhooks.
3. **Lawyer Portal Independence**:
   - Explorer 1 is investigating the Lawyer Portal (`/lawyer/dashboard`, `/lawyer/case/[id]`). Case assignment by Admin directly enables lawyer case access under `case.lawyerId === lawyer.id`.

---

## 4. Conclusion & Recommended Architecture

To bring the Admin Portal to full production readiness under Milestone 5, the following 9 components must be implemented:

| Component | Target Path | Purpose |
|---|---|---|
| **1. Audit Utility** | `src/lib/audit.ts` | Centralized `createAuditLog` utility adhering to `PROJECT.md` contract with UTC timestamps |
| **2. Admin Layout** | `src/app/admin/layout.tsx` | Aqua window frame with titlebar, traffic lights, admin session badge, and tab navigation |
| **3. Root Redirect** | `src/app/admin/page.tsx` | Automatic redirect from `/admin` to `/admin/dashboard` |
| **4. Admin Dashboard** | `src/app/admin/dashboard/page.tsx` | Aqua skeuomorphic dashboard with parallel aggregated metrics and quick-glance cards |
| **5. User Management** | `src/app/admin/users/page.tsx` | Filterable user list, role badges, case count stats, role mutation modal/action |
| **6. Case Management** | `src/app/admin/cases/page.tsx` | Filterable case list, lawyer assignment dropdown, status override controls |
| **7. Template Admin** | `src/app/admin/templates/page.tsx` | Template and clause lifecycle management (DRAFT -> UNDER_REVIEW -> LAWYER_APPROVED -> LOCKED) |
| **8. Audit Viewer** | `src/app/admin/audit-logs/page.tsx` | Paginated audit trail with action filtering, UTC timestamp display, and metadata JSON viewer |
| **9. Admin APIs** | `src/app/api/admin/*` | Guarded endpoints for case assignment, status changes, template lifecycle, and user roles |

### Proposed Data Contracts & APIs:

#### A. Centralized Audit Log Contract (`src/lib/audit.ts`)
```typescript
import prisma from "@/lib/prisma";

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  caseId?: string | null;
  metadata?: Record<string, any> | string | null;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  const metadataStr =
    typeof params.metadata === "object" && params.metadata !== null
      ? JSON.stringify(params.metadata)
      : params.metadata || null;

  const now = new Date(); // Standardized UTC Date instance

  return await prisma.auditLog.create({
    data: {
      actorId: params.actorId || null,
      action: params.action,
      entity: params.entity || null,
      entityId: params.entityId || null,
      caseId: params.caseId || null,
      metadata: metadataStr,
      createdAt: now,
      timestamp: now,
    },
  });
}
```

#### B. Parallel Metrics Aggregation (`src/app/admin/dashboard/page.tsx`)
```typescript
const [
  totalUsers,
  usersByRole,
  totalCases,
  casesByStatus,
  paymentAggregates,
  paymentsByStatus,
  templateCounts,
  clauseCounts,
  recentLogs
] = await Promise.all([
  prisma.user.count(),
  prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
  prisma.case.count(),
  prisma.case.groupBy({ by: ['status'], _count: { _all: true } }),
  prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true }, _count: { _all: true } }),
  prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
  prisma.template.groupBy({ by: ['status'], _count: { _all: true } }),
  prisma.clause.groupBy({ by: ['status'], _count: { _all: true } }),
  prisma.auditLog.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { actor: true } })
]);
```

#### C. Admin API Endpoints Needed:
1. `POST /api/admin/cases/assign`:
   - Payload: `{ caseId: string, lawyerId: string | null }`
   - Role guard: `session.user.role === 'ADMIN'`
   - Updates `case.lawyerId`, logs `CASE_ASSIGNED` audit event.
2. `POST /api/admin/cases/status`:
   - Payload: `{ caseId: string, status: string, notes?: string }`
   - Role guard: `session.user.role === 'ADMIN'`
   - Updates `case.status`, logs `CASE_STATUS_UPDATED` audit event.
3. `POST /api/admin/templates/status`:
   - Payload: `{ templateId: string, versionId?: string, status: string }`
   - Role guard: `session.user.role === 'ADMIN'`
   - Updates status, enforces version immutability if `LOCKED`, logs `TEMPLATE_STATUS_UPDATED`.
4. `POST /api/admin/users/role`:
   - Payload: `{ userId: string, role: 'CUSTOMER' | 'LAWYER' | 'ADMIN' }`
   - Role guard: `session.user.role === 'ADMIN'`, prevents admin from demoting self, logs `USER_ROLE_UPDATED`.

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the full test runner to verify zero regressions across existing tiers:
```bash
node tests/runner.js
```
*Expected Result*: 131/131 passing tests (Tiers 1-4).

### 5.2 TypeScript Compilation & Linting
Verify strict TypeScript compliance:
```bash
npx tsc --noEmit
npm run lint
```
*Expected Result*: Zero type errors and clean lint output.

### 5.3 RBAC Security Verification
1. **Unauthenticated Access**:
   Request `http://localhost:3000/admin/dashboard` without session cookies.
   *Expected Result*: 307/302 Redirect to `/login`.
2. **Customer Access Violation**:
   Log in as `customer@demo.com` and navigate to `/admin/dashboard`.
   *Expected Result*: Redirect to `/customer/dashboard`.
3. **Lawyer Access Violation**:
   Log in as `lawyer@demo.com` and navigate to `/admin/dashboard`.
   *Expected Result*: Redirect to `/lawyer/dashboard`.
4. **Direct API Attack (IDOR/Escalation)**:
   Call `POST /api/admin/cases/assign` with a Customer session token.
   *Expected Result*: HTTP 403 Forbidden with `{ "error": "Forbidden: Admin access required" }`.

### 5.4 Audit Trail Verification
Verify that performing administrative actions (reassigning a lawyer, updating a case status, approving a template) generates a database record in `prisma.auditLog` containing:
- `actorId`: admin user ID
- `action`: respective event name (e.g. `CASE_ASSIGNED`)
- `createdAt` / `timestamp`: Date object in UTC
- `metadata`: valid JSON payload detailing state transition
