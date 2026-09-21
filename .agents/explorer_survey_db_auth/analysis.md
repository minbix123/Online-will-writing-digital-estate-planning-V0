# Comprehensive Database, Schema, Authentication & RBAC Audit Report

**Target Platform**: Online Will-Writing & Digital Estate Planning Platform (India)  
**Investigator**: Database & Authentication Explorer (`explorer_survey_db_auth`)  
**Project Workspace**: `E:\Online will-writing & digital estate planning V0`  
**Date**: 2026-09-16  

---

## 1. Executive Summary

A comprehensive, line-by-line audit of the database layer, Prisma schema, authentication mechanisms, session management, and RBAC / authorization controls was conducted across `E:\Online will-writing & digital estate planning V0`.

### Key Findings Overview
1. **Critical Authentication Security Vulnerability (Plaintext Passwords)**:
   - Passwords in `prisma/seed.ts` and `src/lib/auth.ts` are stored and verified in **pure plaintext** (`user.password === credentials.password`). No hashing algorithm (bcrypt/argon2/scrypt) is installed or used.
   - `NEXTAUTH_SECRET` falls back to a hardcoded string (`"fallback_secret_for_development"`).
2. **Broken Client-Side Login Flow**:
   - In `src/app/login/page.tsx` (line 26), `window.location.href = "/api/auth/session"` executes directly upon successful credential submission, redirecting the browser to a raw JSON dump instead of routing to the dashboard.
   - No logout button, route, or server action exists anywhere in the application.
3. **Severe IDOR and Broken Access Control (RBAC)**:
   - `/api/checkout` has **zero authentication checks** (`getServerSession` is not even imported). Any unauthenticated user can trigger payments, advance any case status, and trigger document generation for any arbitrary `caseId`.
   - `/api/questionnaire/save` obtains session but does not enforce authentication or case ownership (`session.user.id === case.customerId`), allowing any visitor to overwrite questionnaire answers for any case.
   - `/api/document/download` allows any user with the `LAWYER` role to download documents for **any customer's case** without checking assignment (`caseData.lawyerId === user.id`), violating R3 / R8 requirements.
4. **Database & Schema Architectural Deficits**:
   - **No Prisma Migrations**: No `prisma/migrations` folder exists; `package.json` relies on `prisma db push --accept-data-loss`.
   - **Missing Compound Unique Constraints**: `QuestionnaireAnswer` lacks `@@unique([caseId, questionId])`, leading to duplicate answers during autosave. `TemplateVersion` lacks `@@unique([templateId, version])`.
   - **Missing Foreign Key & Performance Indexes**: Zero secondary indexes exist on foreign keys (`customerId`, `lawyerId`, `caseId`, `actorId`), causing full table scans.
   - **Unused / Disconnected Legal Models**: `Clause`, `ClauseVersion`, and `Rule` models exist in Prisma schema but are 100% disconnected from `Document` and `DocumentGenerator.ts` (clauses are hardcoded in TS strings; `clauseVersions` in Document is a dummy string `"v1"`).
   - **LawyerReview Missing Foreign Key**: `LawyerReview` has no `lawyerId` foreign key to `User`, making it impossible to attribute reviews to a specific lawyer.
   - **Document Duplication on Download**: Every document download re-runs `DocumentGenerator.generate` and inserts a new row into `Document` table instead of retrieving stored metadata/blobs.
   - **Missing Transaction Boundaries**: Checkout operations (`Payment.create`, `Case.update`, `DocumentGenerator.generate`, `AuditLog.create`) run without `prisma.$transaction`, risking inconsistent database state upon failure.

---

## 2. Database Layer Audit

### 2.1 Storage Engine & Configuration
- **Datasource**: SQLite file-based database located at `prisma/dev.db` (~112 KB).
- **Prisma Client**: Initialized via global singleton pattern in `src/lib/prisma.ts` to mitigate client proliferation in Next.js development mode.
- **Concurrency & Locking Risks**:
  - SQLite uses database-level write locks. Under concurrent autosaves, checkouts, and document generations, concurrent writes will throw `SQLITE_BUSY: database is locked`.
  - WAL (Write-Ahead Logging) mode is not enabled in the connection string (`file:./dev.db?journal_mode=WAL`).
- **Prisma & Dependencies**:
  - `@prisma/client`: `^6.19.3`
  - `prisma`: `^6.19.3`
  - `package.json` script: `"push": "prisma db push --accept-data-loss"`.
  - **No migration history**: There is no `prisma/migrations/` directory. Schema evolutions cannot be audited, applied deterministically, or rolled back safely.

### 2.2 Seed Script (`prisma/seed.ts`)
- **Teardown Flaws**:
  - Deletions are executed sequentially:
    ```ts
    await prisma.auditLog.deleteMany()
    await prisma.document.deleteMany()
    await prisma.templateVersion.deleteMany()
    await prisma.template.deleteMany()
    await prisma.case.deleteMany()
    await prisma.user.deleteMany()
    ```
  - Tables `Payment`, `QuestionnaireAnswer`, `LawyerReview`, `Clause`, `ClauseVersion`, and `Rule` are not truncated in seed teardown. If records exist with foreign key references, foreign key constraints will fail.
- **Seeded Accounts**:
  | Role | Email | Password (Stored) | Notes |
  |---|---|---|---|
  | `CUSTOMER` | `customer@demo.com` | `password123` (Plaintext) | Demo standard customer |
  | `CUSTOMER` | `nri@demo.com` | `password123` (Plaintext) | Demo NRI customer (shares role CUSTOMER) |
  | `LAWYER` | `lawyer@demo.com` | `password123` (Plaintext) | Demo legal reviewer |
  | `ADMIN` | `admin@demo.com` | `password123` (Plaintext) | Demo platform admin |
- **Template Seeding**:
  - Seeds 1 DRAFT template: `Standard Will (Draft)` (v1)
  - Seeds 1 LAWYER_APPROVED template: `Standard Will (Approved)` (v1)
- **Missing Seeds**:
  - Zero `Clause` or `ClauseVersion` records seeded.
  - Zero `Rule` records seeded.
  - Zero `LawyerReview` records seeded.
  - Zero `Payment` records seeded.

---

## 3. Conceptual Data Model Comparison

The platform's business requirements (ORIGINAL_REQUEST.md R2) mandate support for:
`User`, `Case`, `QuestionnaireAnswer`, `Template`, `Clause`, `Document`, `Payment`, `AuditLog`.

### Detailed Comparison Table

| Required Model | Existing Model in `schema.prisma` | Status | Missing Keys / Relations / Indexes / Gaps |
|---|---|---|---|
| **User** | `model User` | Partial | - Password stored in plaintext<br>- No index on `role`<br>- No enum constraint on `role` (raw String)<br>- No phone number, address, or profile attributes |
| **Case** | `model Case` | Partial | - Missing indexes on `customerId`, `lawyerId`, and `status`<br>- `flags` is an unindexed comma-separated string instead of structured array/JSON<br>- No cascade behavior specified on relations<br>- No reference to which `TemplateVersion` is locked to the case |
| **QuestionnaireAnswer** | `model QuestionnaireAnswer` | Incomplete | - **CRITICAL: Missing `@@unique([caseId, questionId])`**<br>- Missing index on `caseId`<br>- `answerData` stores raw JSON string, but UI currently dumps the entire state tree into single rows |
| **Template** | `model Template` | Partial | - `status` is on `Template`, not on `TemplateVersion`<br>- Lacks approval lifecycle states (`UNDER_REVIEW`, `LOCKED`, `ARCHIVED`)<br>- Missing indexes |
| **TemplateVersion** | `model TemplateVersion` | Partial | - Missing `@@unique([templateId, version])`<br>- Missing `status` / approval metadata (approvedBy, approvedAt) |
| **Clause** | `model Clause` | Disconnected | - Model exists but is 100% unused in document generation<br>- No relationship to `Document` or `Case` |
| **ClauseVersion** | `model ClauseVersion` | Disconnected | - Missing `@@unique([clauseId, version])`<br>- Unused; document generator hardcodes clauses in TypeScript strings |
| **Document** | `model Document` | Incomplete | - `clauseVersions` is a dummy string (`"v1"`), not relational foreign keys<br>- `pdfUrl` and `docxUrl` are always null (no blob storage or file persistence)<br>- Missing index on `caseId`<br>- Re-created redundantly on every download GET request |
| **Payment** | `model Payment` | Partial | - Missing index on `caseId`<br>- Amount is `Float` instead of integer paise or `Decimal`<br>- No transaction isolation when payment succeeds |
| **LawyerReview** | `model LawyerReview` | Broken | - **Missing `lawyerId` foreign key to `User`** (cannot know which lawyer reviewed)<br>- Missing index on `caseId` |
| **AuditLog** | `model AuditLog` | Incomplete | - Missing `entity` and `entityId` fields (required by R12)<br>- Missing indexes on `actorId`, `caseId`, `timestamp`<br>- Missing `ipAddress` and `userAgent` metadata |
| **Rule** | `model Rule` | Disconnected | - Model exists in schema but is never queried or mutated; rules are hardcoded in `src/server/legal-workflows/index.ts` |

---

## 4. Authentication & Session Management Audit

### 4.1 Implementation Stack
- Package: `next-auth: ^4.24.15`
- Configuration File: `src/lib/auth.ts`
- Route Handler: `src/app/api/auth/[...nextauth]/route.ts`

### 4.2 Security Deficiencies

1. **Plaintext Password Storage & Comparison**:
   ```ts
   // src/lib/auth.ts:22-30
   // In a real app, hash password and compare. For V0 MVP, direct comparison or dummy logic for demo.
   if (user && user.password === credentials.password) {
     return {
       id: user.id,
       name: user.name,
       email: user.email,
       role: user.role,
     };
   }
   ```
   - Passwords are not hashed with `bcrypt`, `argon2`, or `scrypt`.
   - Direct string comparison is vulnerable to timing attacks.
   - Any database dump immediately leaks all user credentials in cleartext.

2. **Insecure Secret Fallback**:
   ```ts
   // src/lib/auth.ts:58
   secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development",
   ```
   - There is no `.env` file in the repository root (`.env*` is in `.gitignore`).
   - Consequently, in standard setup, the fallback secret `"fallback_secret_for_development"` is used to sign all JWT cookies, enabling trivial JWT forgery.

3. **Critical Login Redirect Bug**:
   ```tsx
   // src/app/login/page.tsx:26-32
   window.location.href = "/api/auth/session";
   fetch('/api/auth/session').then(res => res.json()).then(session => {
      if (session?.user?.role === 'LAWYER') router.push('/lawyer/dashboard');
      else if (session?.user?.role === 'ADMIN') router.push('/admin/dashboard');
      else router.push('/customer/dashboard');
   });
   ```
   - Line 26 immediately mutates `window.location.href` to `/api/auth/session`.
   - The browser navigates away from the application to the NextAuth raw JSON endpoint, preventing the promise callback from running and breaking the entire user login experience.

4. **Missing Session Audit Logging**:
   - Neither `src/lib/auth.ts` nor `src/app/api/auth/[...nextauth]/route.ts` creates an `AuditLog` entry upon successful or failed authentication, violating R12.

5. **Missing Logout Mechanism**:
   - There is no sign-out button, route, or server action anywhere in the customer, lawyer, or admin interfaces.

---

## 5. Authorization & RBAC Audit

### 5.1 Role-Based Access Control Architecture
- Platform defines 3 roles: `CUSTOMER`, `LAWYER`, `ADMIN`.
- System lacks a global `middleware.ts`. All protection is deferred to individual page components or route handlers.

### 5.2 Endpoint-by-Endpoint Authorization Matrix

| Route / File | Method / Type | Auth Check | Role Check | IDOR Protection | Findings & Vulnerabilities |
|---|---|---|---|---|---|
| `src/app/page.tsx` | Page (Server) | None | None | N/A | Public landing page. Working. |
| `src/app/login/page.tsx` | Page (Client) | None | None | N/A | Public login page. Has redirect bug. |
| `src/app/customer/dashboard/page.tsx` | Page (Server) | `getServerSession` | `role === 'CUSTOMER'` | Scoped to `customerId` | Enforces `customerId: user.id`. Only customers see their own cases. |
| `src/app/customer/questionnaire/page.tsx` | Page (Server) | `getServerSession` | None (checks session) | `case.customerId === user.id` | Creates new case if no `caseId`. Verifies ownership if `caseId` provided. (Note: Next 15+ sync `searchParams` bug). |
| `src/app/customer/checkout/page.tsx` | Page (Client) | None | None | None | Client page without server guard; delegates to `/api/checkout`. |
| `src/app/customer/document/page.tsx` | Page (Client) | None | None | None | Client page without server guard; delegates to `/api/document/download`. |
| `src/app/lawyer/dashboard/page.tsx` | Page (Server) | `getServerSession` | `role === 'LAWYER'` | **BROKEN** | Shows **all** cases in review across the entire platform. Links to `/lawyer/case/${id}` which is a **404 dead link**. |
| `src/app/admin/dashboard/page.tsx` | Page (Server) | `getServerSession` | `role === 'ADMIN'` | N/A | Restricted to `ADMIN`. Read-only dashboard. |
| `src/app/api/questionnaire/route.ts` | API (GET) | None | None | N/A | Returns static JSON configuration. |
| `src/app/api/questionnaire/save/route.ts` | API (POST) | **IGNORED** | **NONE** | **CRITICAL IDOR** | Calls `getServerSession` but never checks if session is valid. Never verifies `case.customerId === session.user.id`. Any unauthenticated client can overwrite any case answers. |
| `src/app/api/checkout/route.ts` | API (POST) | **MISSING** | **NONE** | **CRITICAL IDOR** | `getServerSession` is not even imported. Any unauthenticated caller can post `{ caseId, plan }`, mark case `PAID` or `IN_REVIEW`, create payment records, and trigger document generation. |
| `src/app/api/document/download/route.ts` | API (GET) | `getServerSession` | Partial | **LAWYER IDOR** | Line 23: `caseData.customerId !== user.id && user.role !== "LAWYER" && user.role !== "ADMIN"`. **Any lawyer can download any customer's document** without case assignment. |

### 5.3 Detailed IDOR & Privilege Escalation Scenarios

1. **Scenario 1: Cross-Customer Questionnaire Answer Injection (IDOR)**:
   - Attacker sends `POST /api/questionnaire/save` with payload:
     `{ "caseId": "victim-case-cuid", "sectionId": "personal_info", "data": { "fullName": "Attacker Name" } }`.
   - The endpoint executes `prisma.questionnaireAnswer.update` or `create` without validating that the caller owns `victim-case-cuid`.
   - Outcome: Full unauthorized tampering with estate planning records.

2. **Scenario 2: Unauthenticated Payment & Case Advancement**:
   - Attacker sends `POST /api/checkout` with payload:
     `{ "caseId": "victim-case-cuid", "plan": "BASIC" }`.
   - The endpoint processes mock payment, advances case status to `PAID`, triggers document generation, and writes an audit log with `actorId: null`.
   - Outcome: Unauthenticated case manipulation, unauthorized document generation, state tampering.

3. **Scenario 3: Lawyer Cross-Case Document Access (IDOR)**:
   - Lawyer A is assigned Case 1. Customer B creates Case 2 (assigned to Lawyer B or unassigned).
   - Lawyer A calls `GET /api/document/download?caseId=case-2-cuid`.
   - Route logic allows any user whose role is `LAWYER` to download the document.
   - Outcome: Breach of legal confidentiality, violation of R3/R8 assignment isolation.

4. **Scenario 4: Lack of Middleware Protection on Dynamic Routes**:
   - Without `middleware.ts`, route security is fragmented across individual handlers. A newly added API route or Server Action will default to completely unprotected unless developer explicitly adds auth boilerplate.

---

## 6. Performance & Transaction Integrity Analysis

1. **Missing Atomic Transactions**:
   - In `src/app/api/checkout/route.ts`:
     ```ts
     await prisma.payment.create(...)
     const caseData = await prisma.case.findUnique(...)
     const evaluation = await LegalWorkflowEngine.evaluate(...)
     await prisma.case.update(...)
     await DocumentGenerator.generate(caseId)
     await prisma.auditLog.create(...)
     ```
     None of these mutations are wrapped in `prisma.$transaction`. If `DocumentGenerator.generate` throws an error, the payment row remains persisted as `SUCCESS`, creating phantom payments and inconsistent case states.
2. **Autosave Race Condition**:
   - `src/app/api/questionnaire/save/route.ts` performs `findFirst` followed by `update` or `create`.
   - Because `QuestionnaireAnswer` has no `@@unique([caseId, questionId])`, concurrent autosave requests from the client can produce multiple duplicate rows for the same section.
3. **Redundant Document Generation & Database Bloat**:
   - Every time a user accesses `GET /api/document/download?caseId=...`, the server executes `DocumentGenerator.generate(caseId)`, constructing a full DOCX buffer and executing `prisma.document.create(...)`.
   - If a customer clicks "Download DOCX" 10 times, 10 duplicate `Document` records are created in the database, and CPU is wasted regenerating identical DOCX files.
4. **Unindexed Database Scans**:
   - The SQLite queries on `Case.findMany({ where: { customerId } })` and `Case.findMany({ where: { status: ... } })` scan the entire table because no indexes exist on `customerId` or `status`.

---

## 7. Actionable Recommendations for Implementation

### 7.1 Database & Schema (`prisma/schema.prisma`)
1. **Add Required Indexes & Unique Constraints**:
   - `QuestionnaireAnswer`: Add `@@unique([caseId, questionId])` and `@@index([caseId])`.
   - `Case`: Add `@@index([customerId])`, `@@index([lawyerId])`, `@@index([status])`.
   - `TemplateVersion`: Add `@@unique([templateId, version])`.
   - `ClauseVersion`: Add `@@unique([clauseId, version])`.
   - `LawyerReview`: Add `lawyerId String`, relation `lawyer User @relation(fields: [lawyerId], references: [id])`, and `@@index([caseId])`.
   - `AuditLog`: Add `entity String?`, `entityId String?`, `ipAddress String?`, and indexes on `actorId`, `caseId`, `timestamp`.
   - `Document`: Add `fileBuffer Bytes?` or persistent storage path, and `@@index([caseId])`.
2. **Adopt Prisma Migrations**:
   - Initialize `prisma/migrations` using `prisma migrate dev --name init_schema` instead of `prisma db push`.

### 7.2 Authentication & Security
1. **Install Password Hashing**:
   - Add `bcryptjs` and `@types/bcryptjs`.
   - Update `prisma/seed.ts` to hash passwords with `await bcrypt.hash('password123', 10)`.
   - Update `src/lib/auth.ts` to verify with `await bcrypt.compare(credentials.password, user.password)`.
2. **Fix Login Redirect & Add Logout**:
   - In `src/app/login/page.tsx`, remove `window.location.href = "/api/auth/session"` and route directly based on `session.user.role`.
   - Add sign-out UI (`signOut()` from `next-auth/react`) to dashboard layouts.
3. **Environment Secrets**:
   - Provide a `.env.example` and ensure `NEXTAUTH_SECRET` is required and enforced.

### 7.3 Authorization & Route Hardening
1. **Implement Next.js Edge Middleware (`src/middleware.ts`)**:
   - Protect `/customer/:path*`, `/lawyer/:path*`, `/admin/:path*`, and `/api/:path*`.
   - Verify JWT token and enforce role boundaries before route rendering.
2. **Harden Route Handlers**:
   - `/api/questionnaire/save`: Require session; enforce `case.customerId === session.user.id`.
   - `/api/checkout`: Require session; enforce `case.customerId === session.user.id`; wrap all state changes in `prisma.$transaction`.
   - `/api/document/download`: Restrict lawyer access to cases where `case.lawyerId === session.user.id` or cases assigned for review.
3. **Build Lawyer Case Review Route**:
   - Implement `/lawyer/case/[id]/page.tsx` with review controls, status transitions (`CLARIFICATION_REQUESTED`, `APPROVED`), review notes persistence, and audit logging.

---
*Report compiled by Database & Authentication Explorer (`explorer_survey_db_auth`).*
