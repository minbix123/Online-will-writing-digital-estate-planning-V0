# Handoff Report: Milestone 5 — Lawyer Portal, Review Workflow & RBAC Investigation

**Author**: Explorer 1 (Milestone 5)  
**Date**: 2026-09-17T12:19:00Z  
**Target Audience**: Orchestrator, Worker M5, Test Verifier  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\explorer_m5_1`

---

## 1. Observation

### 1.1 Current State of Lawyer Routes & Filesystem Structure
- **Files present**:
  - `src/app/lawyer/dashboard/page.tsx` exists (68 lines).
  - **No case review route exists**: Directory `src/app/lawyer/case/` or file `src/app/lawyer/case/[id]/page.tsx` does **not** exist in the repository (`find_by_name` on `src/app/lawyer` returned only `dashboard` and `dashboard/page.tsx`).
- **Dashboard Review Link points to non-existent route**:
  In `src/app/lawyer/dashboard/page.tsx` (lines 55–57):
  ```tsx
  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
    <Link href={`/lawyer/case/${c.id}`} className="text-blue-600 hover:text-blue-900">Review</Link>
  </td>
  ```
  Clicking "Review" returns an immediate HTTP 404.
- **Lawyer Dashboard Case Query**:
  In `src/app/lawyer/dashboard/page.tsx` (lines 12–22):
  ```tsx
  const cases = await prisma.case.findMany({
    where: {
      status: {
        in: ["IN_REVIEW", "CLARIFICATION_REQUESTED", "APPROVED"]
      }
    },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: true
    }
  });
  ```
  This query fetches all cases across the system matching those statuses without filtering by `lawyerId` or distinguishing between cases assigned to the current lawyer (`case.lawyerId === session.user.id`) vs unassigned cases (`case.lawyerId === null`) vs cases assigned to other lawyers.
- **No Self-Assignment / Case Claim Mechanism**:
  There are no buttons, forms, actions, or API routes allowing a lawyer to self-assign or claim an unassigned case.

### 1.2 Prisma Schema & Data Models
In `prisma/schema.prisma`:
- **`Case` model** (lines 30–53):
  ```prisma
  model Case {
    id            String    @id @default(cuid())
    customerId    String
    customer      User      @relation("CustomerCases", fields: [customerId], references: [id], onDelete: Cascade)
    lawyerId      String?
    lawyer        User?     @relation("LawyerCases", fields: [lawyerId], references: [id])
    status        String    @default("DRAFT") // DRAFT, PAID, IN_REVIEW, CLARIFICATION_REQUESTED, REVISION_REQUIRED, APPROVED, DELIVERED
    flags         String?   // Comma-separated list of flags: STANDARD, GUARDIAN_REQUIRED, NRI, FOREIGN_ASSETS, BUSINESS_INTEREST, COMPLEX_FAMILY, EXISTING_WILL, LEGAL_REVIEW_REQUIRED, MANUAL_CONSULTATION_REQUIRED
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt

    answers       QuestionnaireAnswer[]
    documents     Document[]
    reviews       LawyerReview[]
    payments      Payment[]
    auditLogs     AuditLog[]

    @@index([customerId])
    @@index([lawyerId])
    @@index([status])
    @@index([createdAt])
  }
  ```
- **`LawyerReview` model** (lines 154–167):
  ```prisma
  model LawyerReview {
    id          String   @id @default(cuid())
    caseId      String
    case        Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
    lawyerId    String?
    lawyer      User?    @relation("LawyerReviews", fields: [lawyerId], references: [id])
    status      String   // e.g., REQUESTED, COMPLETED
    notes       String?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@index([caseId])
    @@index([lawyerId])
  }
  ```
- **`AuditLog` model** (lines 186–202):
  ```prisma
  model AuditLog {
    id          String   @id @default(cuid())
    actorId     String?
    actor       User?    @relation(fields: [actorId], references: [id])
    action      String
    entity      String?
    entityId    String?
    caseId      String?
    case        Case?    @relation(fields: [caseId], references: [id])
    metadata    String?
    createdAt   DateTime @default(now())
    timestamp   DateTime @default(now())

    @@index([actorId])
    @@index([entity, entityId])
    @@index([createdAt])
  }
  ```

### 1.3 Security, RBAC & IDOR Implementation
- **Edge Middleware** (`src/middleware.ts`):
  Lines 22–30:
  ```ts
  // 2. Lawyer route protection: requires LAWYER or ADMIN role
  if (pathname.startsWith("/lawyer")) {
    if (role !== "LAWYER" && role !== "ADMIN") {
      if (role === "CUSTOMER") {
        return NextResponse.redirect(new URL("/customer/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
  ```
  Edge middleware protects `/lawyer/*` paths for `LAWYER` and `ADMIN`.
- **Admin Lockout in `LawyerDashboard`**:
  In `src/app/lawyer/dashboard/page.tsx` (line 9):
  ```ts
  if (!session || (session.user as any).role !== "LAWYER") redirect("/login");
  ```
  Edge middleware permits `ADMIN`, but line 9 explicitly redirects `ADMIN` to `/login`.
- **API Matcher Limitation in `middleware.ts`**:
  Lines 55–61:
  ```ts
  export const config = {
    matcher: [
      "/customer/:path*",
      "/lawyer/:path*",
      "/admin/:path*",
    ],
  };
  ```
  Middleware does **not** protect `/api/*` routes. Every API endpoint must enforce its own session and role checks.
- **IDOR / Access Boundary Discrepancy in `src/app/api/document/download/route.ts`**:
  Lines 30–33:
  ```ts
  const isAssignedLawyer =
    user.role === "LAWYER" &&
    (caseData.lawyerId === user.id || caseData.lawyerId === null || caseData.status === "IN_REVIEW");
  ```
  Because of `|| caseData.status === "IN_REVIEW"`, if a case is assigned to Lawyer A (`caseData.lawyerId === "lawyerA"`), Lawyer B can still download the document if status is `IN_REVIEW`. This contradicts `PROJECT.md` line 76:
  `Lawyer access: user.role === 'ADMIN' || (user.role === 'LAWYER' && (case.lawyerId === user.id || case.lawyerId === null))`.

### 1.4 Legal Review Workflow & Test Assertions
- **Existing Test Suite Status**:
  Ran `node tests/runner.js` across Tiers 1–4:
  `Total Tests: 131, Passed: 131, Failed: 0, Total Time: 39009ms`.
- **Scenario 5 Review Expectations** (`tests/tier4_scenarios/test_scenarios.js`, lines 508–562):
  1. Case with high-risk flags enters `IN_REVIEW`.
  2. Assigned lawyer verifies answers.
  3. `prisma.lawyerReview.create({ data: { caseId, lawyerId, status: 'COMPLETED', notes: '...' } })` is executed.
  4. Case transitions: `prisma.case.update({ where: { id }, data: { status: 'APPROVED' } })`.
  5. Audit log is emitted: `action: 'LAWYER_CASE_REVIEW_APPROVED'`, `actorId: lawyer.id`.
  6. Document generation is confirmed: `DocumentGenerator.generate(caseId)`.
- **Valid Lifecycle Transitions** (`tests/tier2_boundaries/test_f3_boundaries.js`, lines 60–69):
  ```js
  IN_REVIEW: ['CLARIFICATION_REQUESTED', 'REVISION_REQUIRED', 'APPROVED'],
  CLARIFICATION_REQUESTED: ['IN_REVIEW'],
  REVISION_REQUIRED: ['IN_REVIEW'],
  APPROVED: ['DELIVERED'],
  ```

### 1.5 UI & Aqua Skeuomorphic Conformance
- `src/app/globals.css` defines the full suite of Aqua skeuomorphic CSS classes:
  - `.bg-aqua-pinstripes` (classic Mac OS X pinstripe background)
  - `.aqua-window`, `.aqua-card` (glass gradients, inner bevel highlights, soft shadows)
  - `.aqua-titlebar`, `.aqua-traffic-lights`, `.aqua-dot-red`, `.aqua-dot-yellow`, `.aqua-dot-green`
  - `.aqua-btn`, `.aqua-btn-primary`, `.aqua-btn-secondary`, `.aqua-btn-silver`
  - `.aqua-badge`, `.aqua-badge-blue`
  - `.aqua-inset-well`, `.aqua-glow-focus`
- While `src/app/customer/dashboard/page.tsx` meticulously applies these styles, `src/app/lawyer/dashboard/page.tsx` uses basic flat Tailwind (`bg-gray-50`, `bg-white`, standard borders) and completely lacks Aqua skeuomorphism.

---

## 2. Logic Chain

1. **Premise**: Milestone 5 mandates a functional Lawyer Portal (`/lawyer/case/[id]`), case review decision engine (`APPROVE`, `REQUEST_CHANGES`, `REJECT`), case assignment/claiming, and RBAC isolation conforming to Aqua design.
2. **From Observation 1.1**: The route `/lawyer/case/[id]` does not exist. Clicking "Review" in `/lawyer/dashboard` yields a 404 error. Therefore, the core case review workflow cannot be accessed in the browser.
3. **From Observation 1.1 & 1.3**: The current dashboard does not separate assigned vs unassigned cases, and no endpoint exists to claim a case or submit review decisions.
4. **From Observation 1.2 & 1.4**: The Prisma database already has the relational models (`Case`, `LawyerReview`, `AuditLog`, `QuestionnaireAnswer`, `Document`) and test expectations (`Scenario 5`, `T2.3.2`, `T1.2.2`). The missing piece is the Next.js App Router presentation layer and API endpoints to wire them together.
5. **From Observation 1.3**: In `src/app/api/document/download/route.ts` line 32, `caseData.status === "IN_REVIEW"` inadvertently allows Lawyer B to download documents belonging to a case already assigned to Lawyer A. Removing that clause aligns the code with `PROJECT.md` line 76.
6. **From Observation 1.5**: The existing Aqua skeuomorphic CSS classes in `globals.css` are battle-tested and proven in the customer portal. They should be imported and applied across `/lawyer/dashboard` and `/lawyer/case/[id]`.

---

## 3. Caveats

- **Admin Case Assignment**: While lawyers can self-assign cases, the Admin portal may also provide an administrative case assignment interface (Explorer 2 covers Admin Portal).
- **Client vs Server Actions**: Whether the review form at `/lawyer/case/[id]` is implemented as a client component posting to `/api/lawyer/cases/review` or as a Next.js Server Action, the same database updates (`Case`, `LawyerReview`, `AuditLog`) and status validation rules must apply. Using API routes (`/api/lawyer/cases/*`) ensures testability with HTTP scripts.
- **Template Version Lifecycle**: When a case is approved, any generated document must continue to bind strictly to a `LAWYER_APPROVED` template version, which `DocumentGenerator.generate()` already enforces.

---

## 4. Conclusion & Actionable Blueprint

### Required Implementation Steps for Milestone 5 (Lawyer Portal Track):

#### 1. Implement `/lawyer/case/[id]` Review Page (`src/app/lawyer/case/[id]/page.tsx`)
- Server-side page fetching `case` with `customer`, `answers`, `documents`, `reviews`, `payments`.
- Authorization Guard:
  - If unauthenticated or role is `CUSTOMER`: redirect `/login`.
  - If role is `LAWYER` and `case.lawyerId !== null && case.lawyerId !== session.user.id`: render an Aqua-styled "Access Denied / Assigned to another counsel" error panel.
- UI Layout (Aqua skeuomorphic):
  - Aqua window with titlebar, traffic lights, and Case ID header.
  - Testator profile card (Name, Phone, Email, PAN, Aadhaar, Marital Status, NRI status).
  - Risk & Workflow Flags display (`GUARDIAN_REQUIRED`, `NRI`, `BUSINESS_INTEREST`, `EXISTING_WILL`, etc.) with `aqua-badge`.
  - Family, asset distribution, executor, and clause inspection sections.
  - Document download button: `<a href={`/api/document/download?caseId=${case.id}`} className="aqua-btn aqua-btn-primary">Download DOCX</a>`.
  - Review history timeline showing past notes from `LawyerReview`.
  - Interactive Review Decision Form:
    - Textarea for review notes / redlines (`aqua-inset-well`, `aqua-glow-focus`).
    - Decision triggers:
      - **Approve**: Sets status `APPROVED`, status `COMPLETED` on review, triggers/verifies doc generation.
      - **Request Clarifications**: Sets status `CLARIFICATION_REQUESTED`, status `REQUESTED` on review.
      - **Reject**: Sets status `REJECTED`, status `COMPLETED` on review.

#### 2. Upgrade `/lawyer/dashboard/page.tsx` to Full Aqua UI & Two-Tier Queue
- Allow both `LAWYER` and `ADMIN` access (change line 9 condition).
- Display Metric Summary cards: "Assigned to Me", "Unassigned Queue", "Completed Reviews".
- Render two distinct tables:
  1. **"My Assigned Cases"**: `where: { lawyerId: session.user.id, status: { in: ["IN_REVIEW", "CLARIFICATION_REQUESTED", "APPROVED"] } }`.
  2. **"Available Review Queue (Unassigned)"**: `where: { lawyerId: null, status: "IN_REVIEW" }`.
     - Includes a "Claim & Review" button.

#### 3. Create Case Review & Assignment API Endpoints
- `src/app/api/lawyer/cases/assign/route.ts`:
  - `POST`: Assigns case to `session.user.id` (or specified `lawyerId` if caller is `ADMIN`).
  - Emits `AuditLog` (`action: "CASE_ASSIGNED"`).
- `src/app/api/lawyer/cases/review/route.ts`:
  - `POST`: Validates decision (`APPROVE`, `REQUEST_CHANGES`, `REJECT`), checks lawyer authorization, atomically updates `Case.status`, inserts `LawyerReview`, and creates `AuditLog` (`action: "LAWYER_CASE_REVIEW_APPROVED" | "LAWYER_CASE_REVIEW_CHANGES_REQUESTED" | "LAWYER_CASE_REVIEW_REJECTED"`).

#### 4. Fix IDOR Gap in `src/app/api/document/download/route.ts`
- In lines 30–33, change:
  ```ts
  const isAssignedLawyer =
    user.role === "LAWYER" &&
    (caseData.lawyerId === user.id || caseData.lawyerId === null);
  ```
  Eliminating the leaky `|| caseData.status === "IN_REVIEW"` fallback.

#### 5. Implement Centralized Audit Logger (`src/lib/audit.ts`)
- Export `createAuditLog({ actorId, action, entity, entityId, caseId, metadata })`.

---

## 5. Verification Method

1. **Automated Test Suite**:
   Run full runner:
   ```bash
   node tests/runner.js
   ```
   Must pass all 131 tests with 0 failures.
2. **Specific Lawyer Workflow Verification**:
   Run Scenario 5 directly:
   ```bash
   node tests/runner.js --filter="Scenario 5"
   ```
3. **Manual Route Verification**:
   - Log in as `lawyer@demo.com` / `password123`.
   - Visit `/lawyer/dashboard`: Verify "My Assigned Cases" and "Unassigned Cases Queue" display with Aqua styling (`bg-aqua-pinstripes`, `aqua-window`, `aqua-badge`).
   - Click "Review" on an in-review case: Verify `/lawyer/case/[id]` renders questionnaire answers, workflow flags, previous notes, and DOCX download button without 404.
   - Submit review decision with notes: Verify `LawyerReview` created, case status updated, and `AuditLog` recorded with UTC timestamp.
   - Verify IDOR: Log in as a different lawyer (or simulated non-assigned lawyer) and confirm access to another lawyer's assigned case returns HTTP 403.
