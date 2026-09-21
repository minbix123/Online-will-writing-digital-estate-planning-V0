## 2026-09-16T13:31:17Z
You are worker_m2, the implementer for Milestone 2: Database Schema, Relational Integrity & Secure Authentication.
Your working directory is: E:\Online will-writing & digital estate planning V0\.agents\worker_m2
Your project root is: E:\Online will-writing & digital estate planning V0
Your parent conversation ID is: 894e2a30-8730-42e3-9e4c-ea5656318368

MANDATORY FIRST ACTIONS:
1. Read the verbatim user request: E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md
2. Read the project scope: E:\Online will-writing & digital estate planning V0\PROJECT.md
3. Read the milestone scope: E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m2_db_auth\SCOPE.md
4. Read the survey explorer handoff: E:\Online will-writing & digital estate planning V0\.agents\explorer_survey_db_auth\handoff.md

EXCLUSIVE WRITE OWNERSHIP:
You have exclusive write ownership over:
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/auth.ts`
- `src/middleware.ts`
- `src/app/login/page.tsx`
- `package.json`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

DETAILED OBJECTIVES:
1. Database Schema Hardening (`prisma/schema.prisma`):
   - Add compound unique constraints:
     - `@@unique([caseId, questionId])` on `QuestionnaireAnswer`
     - `@@unique([templateId, version])` on `TemplateVersion`
     - `@@unique([clauseId, version])` on `ClauseVersion` (if model exists)
   - Add foreign key relation in `LawyerReview`: `lawyerId` referencing `User(id)` and `caseId` referencing `Case(id)`. Update User and Case models with the corresponding reverse relations.
   - Add secondary indexes on foreign keys and frequently queried fields:
     - User: index on `[email]`, `[role]`
     - Case: indexes on `[customerId]`, `[lawyerId]`, `[status]`, `[createdAt]`
     - QuestionnaireAnswer: indexes on `[caseId]`, `[sectionId]`
     - AuditLog: indexes on `[actorId]`, `[entity, entityId]`, `[createdAt]`
     - Document: indexes on `[caseId]`, `[status]`
     - Payment: indexes on `[caseId]`, `[status]`
   - In `AuditLog`: add `entity String?`, `entityId String?`, `metadata String?` (JSON string or text), and index on `[entity, entityId]`.
   - In `Document`: add `filePath String?`, `fileSize Int?`, `fileHash String?`.
   - Ensure `TemplateVersion` and `Template` support lifecycle states: `DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`.

2. Password Hashing & Verified Demo Accounts:
   - Check if `bcryptjs` and `@types/bcryptjs` are installed; install if needed via `npm install bcryptjs` and `npm install -D @types/bcryptjs`.
   - In `prisma/seed.ts`:
     - Hash passwords using `bcryptjs.hashSync('password123', 10)` for all 4 demo accounts:
       - `customer@demo.com` (role CUSTOMER)
       - `nri@demo.com` (role CUSTOMER)
       - `lawyer@demo.com` (role LAWYER)
       - `admin@demo.com` (role ADMIN)
     - Seed sample legal clauses (STANDARD_DECLARATION, EXECUTORS, GUARDIAN, NRI_ASSETS, BUSINESS_SUCCESSION) with initial versions.
     - Seed an initial Template with a version in `LAWYER_APPROVED` status.
     - Run `npx prisma db push` and `npx tsx prisma/seed.ts` (or `npm run prisma:seed` / `npm run push`). Verify that records are inserted cleanly.

3. Secure Authentication (`src/lib/auth.ts`):
   - Update CredentialsProvider `authorize()` to verify candidate password with `bcryptjs.compare` against `user.password`.
   - Ensure the JWT callback and session callback populate `id`, `name`, `email`, and `role` onto `token` and `session.user`.
   - Ensure `NEXTAUTH_SECRET` is supported (with fallback or env validation).

4. Edge Middleware & Server-Side RBAC (`src/middleware.ts`):
   - Implement Next.js middleware in `src/middleware.ts` using `withAuth` from `next-auth/middleware` or NextRequest with `getToken({ req, secret })`.
   - Protect `/customer/*`, `/lawyer/*`, `/admin/*`.
   - Require authentication; redirect unauthenticated users to `/login`.
   - Check role:
     - `/admin/*` requires `ADMIN` role.
     - `/lawyer/*` requires `LAWYER` or `ADMIN` role.
     - `/customer/*` requires `CUSTOMER` or `ADMIN` role.
     - If authorized, allow request to proceed. If unauthorized role, redirect to appropriate role dashboard or `/login`.
   - Define matcher config: `matcher: ['/customer/:path*', '/lawyer/:path*', '/admin/:path*']`.

5. Fix Login Redirect:
   - In `src/app/login/page.tsx`:
     - Eliminate the broken `window.location.href = "/api/auth/session"`.
     - After successful `signIn("credentials", { redirect: false, ... })`, fetch session or redirect directly based on role:
       - CUSTOMER -> `/customer/dashboard`
       - LAWYER -> `/lawyer/dashboard`
       - ADMIN -> `/admin/dashboard`
     - Handle login errors gracefully with user-visible alert/feedback.

6. Verification & Hand-off:
   - Run `npx prisma generate` to update Prisma Client types.
   - Run `npx tsc --noEmit` and `npm run build` to verify clean build without TypeScript or bundling errors.
   - Write your complete findings, execution logs, and changed files in `E:\Online will-writing & digital estate planning V0\.agents\worker_m2\handoff.md`.
   - Send a message to your parent (`894e2a30-8730-42e3-9e4c-ea5656318368`) with summary of changes and verification results.
