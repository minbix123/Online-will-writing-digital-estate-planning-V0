# Project: Indian Online Will-Writing & Digital Estate Planning Platform MVP

## Architecture
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Database Layer**: Prisma ORM with SQLite (`dev.db`), strict relational foreign keys, indexes, compound unique constraints, and transaction boundaries.
- **Authentication & RBAC**: NextAuth.js with CredentialsProvider, bcryptjs password hashing, JWT session with role tokens (`CUSTOMER`, `LAWYER`, `ADMIN`), Edge middleware (`src/middleware.ts`) and server-side authorization guards on all API routes and server actions.
- **Questionnaire Engine**: Schema-driven declarative JSON questionnaire, debounced autosave (500ms), conditional branching, progress calculation, and persisted resume capability.
- **Legal Workflow Engine**: Isolated, deterministic server-side rule engine evaluating legal flags (`GUARDIAN_REQUIRED`, `NRI`, `FOREIGN_ASSETS`, `BUSINESS_INTEREST`, `EXISTING_WILL`) without AI hallucination.
- **Template & Clause Management**: Version-controlled clauses and templates with explicit lifecycle states (`DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`).
- **Document Generation**: Server-side DOCX generator merging all structured user data and approved clauses, persisting files to disk, and logging audit records.
- **Payment Processing**: Multi-tiered mock payment system (`Basic`, `Lawyer Review`, `Complex/NRI`) with atomic transactional state transitions.
- **Audit Logging**: Centralized, tamper-resistant UTC audit trail covering all security, case, review, document, and payment events.
- **Design Language**: OLED Dark Mode Design System (true blacks `#000000` for OLED efficiency, carefully selected dark grays `#0a0a0a` through `#242424` for subtle depth and layer hierarchy, softer text alternatives `#e5e5e5`, `#d4d4d4`, `#a3a3a3` to prevent eye strain, subtle non-jarring accent colors, smooth transitions, natural dark-mode hover effects, and elegant legal visual hierarchy).

---

## Feature Inventory
Every requirement from ORIGINAL_REQUEST.md and the initial 3-explorer survey is inventoried below and assigned to a milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Async searchParams Fix | Await Promise searchParams in `/customer/questionnaire` to eliminate infinite redirect loop and DB spam | M1 | Survey (Perf Explorer) |
| 2 | Dependency & Compilation Fix | Remove broken `react-form` import, fix client component boundaries, eliminate render-time state setters | M1 | Survey (Perf Explorer) |
| 3 | Suspense Boundary Fix | Wrap `useSearchParams()` in `<Suspense>` in client pages (`checkout`, `document`) | M1 | Survey (Perf Explorer) |
| 4 | Retro Aqua / Skeuomorphic Styling | Initial styling baseline (now superseded by OLED Dark Mode pivot) | M1 | Survey & R15 |
| 5 | Clean Build & Typecheck | Ensure `npm run build` and `npx tsc --noEmit` succeed with zero errors | M1 | R1, R16 |
| 6 | Database Schema Hardening | Add compound unique constraints, foreign keys, secondary indexes on all relations in Prisma schema | M2 | Survey (DB Explorer) & R2 |
| 7 | Password Hashing (bcryptjs) | Replace plaintext password storage and comparison with bcryptjs hashing in seed and auth | M2 | Survey (DB Explorer) & R3 |
| 8 | Secure Authentication & Demo Accounts | Verify customer, nri, lawyer, admin demo accounts with bcrypt password123, enforce NEXTAUTH_SECRET | M2 | Survey (DB Explorer) & R3 |
| 9 | Edge Middleware & RBAC | Implement `src/middleware.ts` for route protection and server-side role validation | M2 | Survey (DB Explorer) & R3 |
| 10 | Fix Login Redirect | Eliminate `window.location.href = "/api/auth/session"`, route users to role dashboard | M2 | Survey (DB/Perf) & R3 |
| 11 | Customer Registration & Case Creation | Allow new customer registration and explicit POST case creation | M3 | Survey (Features) & R4 |
| 12 | Customer Dashboard & Case History | Display active cases, status badges, resume buttons, case history | M3 | Survey (Features) & R4 |
| 13 | Debounced Autosave Questionnaire | Implement 500ms debounced autosave with visual Saving/Saved/Failed status indicators | M3 | Survey (Features) & R5 |
| 14 | Questionnaire Conditional Branching | Fix missing `hasMinorChildren` question and render conditional sections safely | M3 | Survey (Features) & R5 |
| 15 | Questionnaire Resume on Refresh | Load persisted answers from database on mount so refreshes preserve state | M3 | Survey (Features) & R5 |
| 16 | Save API Ownership Verification | Enforce `session.user.id === case.customerId` in `/api/questionnaire/save` to eliminate IDOR | M3 | Survey (DB Explorer) & R13 |
| 17 | Deterministic Legal Workflow Engine | Implement isolated deterministic rule evaluation without AI hallucination | M4 | Survey (Features) & R6 |
| 18 | Real Workflow Test Assertions | Replace fake console.log checkmarks in `tests.ts` with real automated assertions | M4 | Survey (Features) & R6, R14 |
| 19 | Template & Clause Lifecycle | Implement lifecycle states (DRAFT, UNDER_REVIEW, LAWYER_APPROVED, LOCKED/ARCHIVED) | M4 | Survey (Features) & R7 |
| 20 | Complete DOCX Data Merging | Merge all user answers (assets, beneficiaries, executors, guardian) and clauses into DOCX | M4 | Survey (Features) & R10 |
| 21 | Document Storage & Dedup Download | Save generated DOCX to local storage, eliminate duplicate generation on download | M4 | Survey (Perf/Features) & R10 |
| 22 | Lawyer Case Review Route | Build `/lawyer/case/[id]` page for case review, flag inspection, notes, approve/reject | M5 | Survey (DB/Features) & R8 |
| 23 | Lawyer Authorization & Assignment | Restrict case review and document access to assigned lawyers and admins | M5 | Survey (DB Explorer) & R8, R13 |
| 24 | Admin Portal Management | Admin statistics, user management, case management, template lifecycle, audit viewer | M5 | Survey (Features) & R9 |
| 25 | Mock Payment with Transactions | Tiers (Basic, Lawyer Review, Complex/NRI) with atomic `prisma.$transaction` state transitions | M5 | Survey (DB/Features) & R11 |
| 26 | Tamper-Resistant Audit Logging | Centralized `createAuditLog` covering all 11 required system actions with UTC timestamps | M5 | Survey (Features) & R12 |
| 27 | OLED Dark Mode Design System | True black background (#000000), dark gray depth scale (#0a0a0a-#242424), softer text typography, eye-strain-free accents | M5B | User Scope Change & R8 |
| 28 | Universal Dark Mode Refactor | Refactor Landing, Auth, Customer, Lawyer, and Admin portals + reusable UI components to OLED Dark Mode | M5B | User Scope Change & R8 |
| 29 | Security Hardening (OWASP / IDOR) | Comprehensive server-side authorization on all routes, IDOR audit, injection prevention | M6 | Survey (DB Explorer) & R13 |
| 30 | E2E Test Suite (Tiers 1-4) Pass | Run and pass 100% of opaque-box E2E test suite published in TEST_READY.md | M6 | Project Pattern & R14 |
| 31 | Adversarial Testing (Tier 5) | Challenger-driven stress testing, boundary fuzzing, and edge-case hardening | M6 | Project Pattern & R14 |
| 32 | Production Readiness Verification | Final verification of build, types, migrations, seeds, demo accounts, clean run | M6 | R16 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Codebase Audit, Performance Optimization & UI Foundation | Fix async searchParams infinite loop, remove invalid `react-form`, fix render-phase re-renders, verify clean build | none | DONE |
| M2 | Database Schema, Relational Integrity & Secure Authentication | Hardened Prisma schema, indexes, unique constraints, bcryptjs password hashing, verified demo seeds, NextAuth fix, edge middleware RBAC | M1 | DONE |
| M3 | Customer Portal, Case Lifecycle & Debounced Questionnaire Engine | Customer registration, explicit case creation, customer dashboard, debounced autosave (500ms), fixed conditional questions, answer resume, IDOR fix | M2 | DONE |
| M4 | Deterministic Legal Workflow, Template/Clause System & DOCX Gen | Isolated rule engine, verified test assertions, template lifecycle (LAWYER_APPROVED), comprehensive DOCX data merging, persistent file storage | M3 | DONE |
| M5 | Lawyer Portal, Admin Portal, Mock Payment & Audit Logging | `/lawyer/case/[id]` review UI, case assignment enforcement, admin management & metrics, mock payment transactions, centralized UTC audit log | M4 | DONE |
| M5B | OLED Dark Mode UI/UX Refactor | True black (#000000) base palette, dark gray layering (#0a0a0a-#242424), softer text (#e5e5e5, #d4d4d4, #a3a3a3), subtle non-jarring accents, natural hover/transition states across all portals & components | M5 | IN_PROGRESS |
| M6 | Local Deployment Speed Optimization, Core Verification & Production Readiness | Fast local startup, streamlined caching, clean build, security hardening, core verification suite pass (avoiding redundant tests), and final Victory Audit | M5B | PLANNED |




---

## Interface Contracts

### Auth & Session Contract
- `Session.user`: `{ id: string, name: string, email: string, role: "CUSTOMER" | "LAWYER" | "ADMIN" }`
- Hashing: `bcryptjs.hash(password, 10)` and `bcryptjs.compare(candidate, hash)`
- Edge Middleware: redirects unauthorized requests based on cookie token and path prefix (`/customer/*`, `/lawyer/*`, `/admin/*`).

### Case Lifecycle Contract
- Statuses: `DRAFT` -> `SUBMITTED` -> `IN_REVIEW` (if lawyer plan or workflow flags require) -> `APPROVED` -> `COMPLETED`.
- Case ownership: `case.customerId === session.user.id`. Lawyer access: `user.role === 'ADMIN' || (user.role === 'LAWYER' && (case.lawyerId === user.id || case.lawyerId === null))`.

### Questionnaire Data Contract
- Autosave payload: `{ caseId: string, sectionId: string, data: Record<string, any> }`
- Response: `{ success: boolean, updatedAt: string, error?: string }`
- Unique constraint: `QuestionnaireAnswer` unique on `[caseId, questionId]`.

### Legal Workflow Contract
- Input: `evaluateRules(answers: Record<string, any>): WorkflowResult`
- Output: `{ flags: string[], requiresLawyerReview: boolean, recommendedClauses: string[] }`
- Supported flags: `STANDARD`, `GUARDIAN_REQUIRED`, `NRI`, `FOREIGN_ASSETS`, `BUSINESS_INTEREST`, `EXISTING_WILL`.

### Document Generation Contract
- Input: `generateDocument(caseId: string, actorId: string): Promise<{ documentId: string, filePath: string }>`
- Template constraint: Template version must be `LAWYER_APPROVED` or `LOCKED`.
- Storage: Saved to `storage/documents/{caseId}_{timestamp}.docx`.
- Audit: Emits `DOCUMENT_GENERATED` event with `actorId`, `caseId`, UTC timestamp.

### Audit Log Contract
- Function: `createAuditLog({ actorId?: string, action: string, entity: string, entityId: string, metadata?: any }): Promise<AuditLog>`
- Immutable: No update or delete APIs exist.

---

## Code Layout
- `src/app/`: Next.js App Router pages and routes
  - `page.tsx`: Preserved Landing Page with Aqua/Retro Apple styling
  - `login/page.tsx`: Secure login with proper role routing
  - `register/page.tsx`: Customer registration
  - `customer/`: Customer portal (`dashboard`, `questionnaire`, `checkout`, `document`)
  - `lawyer/`: Lawyer portal (`dashboard`, `case/[id]`)
  - `admin/`: Admin portal (`dashboard`, `users`, `cases`, `templates`, `audit-logs`)
  - `api/`: Authenticated and guarded API endpoints
- `src/lib/`:
  - `prisma.ts`: Singleton PrismaClient with global instance caching
  - `auth.ts`: NextAuth configuration with bcryptjs comparison
  - `questionnaire.ts`: Declarative questionnaire JSON configuration and schemas
  - `audit.ts`: Centralized audit logging utility
- `src/server/`:
  - `legal-workflows/`: Deterministic workflow engine and real automated tests
  - `document-generator.ts`: DOCX document compiler and file persistence
- `src/components/`:
  - `QuestionnaireEngine.tsx`: Debounced, resilient client questionnaire component
  - `Navbar.tsx`, `Footer.tsx`: Consistent navigation with user session status
  - `ui/`: Reusable Aqua / skeuomorphic UI components (buttons, badges, inputs, cards)
- `prisma/`:
  - `schema.prisma`: Hardened relational schema with indexes and relations
  - `seed.ts`: Seed script with bcrypt-hashed demo credentials and sample clauses
- `tests/`:
  - Unit, integration, security, and E2E test suites
- `storage/`:
  - `documents/`: Persisted DOCX documents
