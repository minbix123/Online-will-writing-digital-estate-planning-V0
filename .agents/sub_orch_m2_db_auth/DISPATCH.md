# Task Assignment: Sub-Orchestrator for Milestone 2 (Database Schema, Relational Integrity & Secure Authentication)

- Working Directory: E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m2_db_auth
- Project Root: E:\Online will-writing & digital estate planning V0
- Parent Orchestrator ID: e6a2842f-15ec-4d9a-a9e5-716b515ba023
- Original Request: E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
- Project Scope: E:\Online will-writing & digital estate planning V0\PROJECT.md

## Scope & Mandate
You are the **Sub-Orchestrator for Milestone 2**: Database Schema, Relational Integrity & Secure Authentication.

### Milestone 2 Objectives
From `PROJECT.md § Milestones` and Survey Explorer findings:
1. **Database Schema Hardening (`prisma/schema.prisma`)**:
   - Ensure all models (User, Case, QuestionnaireAnswer, Template, TemplateVersion, Clause, ClauseVersion, Document, Payment, LawyerReview, AuditLog) have:
     - Proper primary keys (`@id @default(cuid())`), foreign keys, and referential actions.
     - Compound unique constraints: `@@unique([caseId, questionId])` on `QuestionnaireAnswer`, `@@unique([templateId, version])` on `TemplateVersion`.
     - Secondary indexes on all foreign keys and frequently queried fields: `customerId`, `lawyerId`, `caseId`, `status`, `actorId`, `entity`, `createdAt`.
     - `LawyerReview`: Add `lawyerId` foreign key to `User` and relation to `Case`.
     - `AuditLog`: Add `entity`, `entityId`, `metadata` (JSON string or text), `createdAt`.
     - `Document`: Add `filePath`, `fileSize`, `fileHash`, status.
     - Template lifecycle states: `DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`.
2. **Password Hashing & Seeds**:
   - Install `bcryptjs` and `@types/bcryptjs` if not already installed.
   - Update `prisma/seed.ts` to hash passwords using `bcryptjs.hashSync('password123', 10)` for all 4 demo accounts:
     - `customer@demo.com` (CUSTOMER)
     - `nri@demo.com` (CUSTOMER)
     - `lawyer@demo.com` (LAWYER)
     - `admin@demo.com` (ADMIN)
   - Seed sample legal clauses (e.g. STANDARD_DECLARATION, EXECUTORS, GUARDIAN, NRI_ASSETS, BUSINESS_SUCCESSION) and an initial `LAWYER_APPROVED` template so downstream document generation and legal workflow have real data.
   - Push schema to SQLite database and execute seed script. Verify demo accounts are seeded with hashed passwords.
3. **Secure Authentication & NextAuth Configuration (`src/lib/auth.ts`)**:
   - Update `authorize()` to verify passwords with `bcryptjs.compare`.
   - Ensure JWT session includes `id`, `email`, `name`, and `role`.
   - Ensure `NEXTAUTH_SECRET` is properly loaded.
4. **Edge Middleware & RBAC (`src/middleware.ts`)**:
   - Implement Next.js middleware in `src/middleware.ts` to enforce server-side route access control:
     - `/customer/*` requires authenticated user with role CUSTOMER or ADMIN.
     - `/lawyer/*` requires authenticated user with role LAWYER or ADMIN.
     - `/admin/*` requires authenticated user with role ADMIN.
     - Unauthenticated requests are redirected to `/login`.
5. **Execution & Gate**:
   - Execute the iteration loop: Explorer -> Worker -> 2 Reviewers -> 2 Challengers -> Forensic Auditor -> Gate.
   - Record verdicts in `GATE_STATUS.md`.
   - When Gate PASS is reached, write `handoff.md` and notify the parent orchestrator.

## 2026-09-16T10:55:53Z
You are the Sub-Orchestrator for Milestone 2: Database Schema, Relational Integrity & Secure Authentication.
Your working directory is: `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m2_db_auth`.
Project root: `E:\Online will-writing & digital estate planning V0`.
Parent orchestrator conversation ID: `e6a2842f-15ec-4d9a-a9e5-716b515ba023`.

MANDATORY: Read `E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md`, `E:\Online will-writing & digital estate planning V0\PROJECT.md`, and your task assignment at `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m2_db_auth\DISPATCH.md`.

Your objective:
1. Initialize your `BRIEFING.md`, `SCOPE.md`, and `progress.md`.
2. Execute the iteration loop for Milestone 2:
   - Update `prisma/schema.prisma` with compound unique constraints (`@@unique([caseId, questionId])`, `@@unique([templateId, version])`), foreign key relations (`LawyerReview.lawyerId` -> `User`), secondary indexes (`customerId`, `lawyerId`, `caseId`, `status`, `actorId`, `entity`), and lifecycle states.
   - Install `bcryptjs` and `@types/bcryptjs`.
   - Update `prisma/seed.ts` to hash passwords with `bcryptjs.hashSync('password123', 10)` for all 4 demo accounts (customer@demo.com, nri@demo.com, lawyer@demo.com, admin@demo.com).
   - Seed sample legal clauses and an initial `LAWYER_APPROVED` template version.
   - Run database schema push/migration and run seed script. Verify demo accounts can authenticate.
   - Update `src/lib/auth.ts` to use `bcryptjs.compare` in `authorize()` and include user `id`, `name`, `email`, `role` in session and token.
   - Create `src/middleware.ts` to enforce server-side RBAC on `/customer/*`, `/lawyer/*`, and `/admin/*`.
   - Ensure clean compilation, typecheck, and build.
3. Run Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate.
4. Record verdicts in `GATE_STATUS.md`.
5. Once Gate passes, write `handoff.md` and send a message back to parent orchestrator.

## 2026-09-16T13:27:37Z [RESUMPTION DISPATCH]
You are resuming as Sub-Orchestrator for Milestone 2: Database Schema, Relational Integrity & Secure Authentication.
Working directory: `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m2_db_auth`.
Project root: `E:\Online will-writing & digital estate planning V0`.
Parent orchestrator conversation ID: `f45b3edc-5fc5-413a-9706-3d4843297f01`.

Execute the Project Pattern iteration loop:
1. Since the server restart interrupted earlier explorers, assess what needs implementation directly or dispatch a fresh explorer/worker.
2. The core tasks for Milestone 2:
   - `prisma/schema.prisma`: Add compound unique constraints (`@@unique([caseId, questionId])`, `@@unique([templateId, version])`, `@@unique([clauseId, version])`), foreign key relations (`LawyerReview.lawyerId` -> `User`), secondary indexes (`customerId`, `lawyerId`, `caseId`, `status`, `actorId`, `entity`, `createdAt`), `entity` and `entityId` on `AuditLog`, `filePath`, `fileSize`, `fileHash` on `Document`.
   - Install `bcryptjs` and `@types/bcryptjs` if needed.
   - `prisma/seed.ts`: Use `bcryptjs.hashSync('password123', 10)` for all 4 demo accounts (customer@demo.com, nri@demo.com, lawyer@demo.com, admin@demo.com). Seed legal clauses and approved template version.
   - Run `npx prisma db push` and `npx tsx prisma/seed.ts` (or `npm run prisma:seed`). Verify DB and demo accounts.
   - `src/lib/auth.ts`: Update `authorize()` to use `bcryptjs.compare`. Ensure JWT callback and session callback populate `id`, `name`, `email`, `role`.
   - `src/middleware.ts`: Implement Next.js middleware enforcing server-side RBAC on `/customer/*`, `/lawyer/*`, `/admin/*`.
   - Fix login redirect: replace `window.location.href = "/api/auth/session"` with role-based routing (CUSTOMER -> `/customer/dashboard`, LAWYER -> `/lawyer/dashboard`, ADMIN -> `/admin/dashboard`).
3. Run Worker -> 2 Reviewers -> 2 Challengers -> 1 Forensic Auditor (`teamwork_preview_auditor`).
4. Evaluate gate in `GATE_STATUS.md`. When PASS, update `progress.md`, write `handoff.md`, and notify parent (`f45b3edc-5fc5-413a-9706-3d4843297f01`).

