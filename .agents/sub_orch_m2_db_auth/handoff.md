# Sub-Orchestrator Handoff Report: Milestone 2 — Database Schema, Relational Integrity & Secure Authentication

**Author**: Milestone 2 Sub-Orchestrator (`sub_orch_m2_db_auth`)  
**Target Recipient**: Project Orchestrator (`parent`, id: `f45b3edc-5fc5-413a-9706-3d4843297f01`) & Successor Milestones (Milestone 3 Sub-Orchestrator)  
**Working Directory**: `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m2_db_auth`  
**Date**: 2026-09-16  
**Handoff Type**: Hard Handoff (Milestone Complete)  

---

## 1. Observation

All objectives for Milestone 2 have been implemented by `worker_m2`, independently reviewed and stress-tested by two Reviewers (`reviewer_m2_1`, `reviewer_m2_2`) and two Challengers (`challenger_m2_1`, `challenger_m2_2`), and rigorously verified for anti-cheating by the Forensic Auditor (`auditor_m2`):

### 1.1 Database Schema Hardening (`prisma/schema.prisma` & `dev.db`)
- **Compound Unique Constraints**:
  - `QuestionnaireAnswer`: `@@unique([caseId, questionId])` prevents concurrent autosave collisions and duplicate answer records.
  - `TemplateVersion`: `@@unique([templateId, version])` ensures immutable version numbering per template.
  - `ClauseVersion`: `@@unique([clauseId, version])` ensures immutable version numbering per clause.
  - Runtime verification: Live duplicate insertion tests threw Prisma `P2002` (`Unique constraint failed`) across all three models.
- **Relational Integrity & Foreign Keys**:
  - `LawyerReview` references `caseId` (onDelete: Cascade) and `lawyerId` (User.id).
  - Reverse relations `User.lawyerReviews` and `Case.reviews` enable clean bidirectional navigation.
  - Cascade deletion empirically confirmed: deleting a test Case automatically purges related questionnaire answers, lawyer reviews, and documents without leaving orphaned records.
- **Secondary Indexes**:
  - 19 explicit Prisma secondary indexes covering all foreign keys and query search paths: `customerId`, `lawyerId`, `caseId`, `status`, `createdAt`, `sectionId`, `actorId`, `[entity, entityId]`.
  - Confirmed 35 physical SQLite index structures in `prisma/dev.db`.
- **Enums & Lifecycle States**:
  - `Template` & `TemplateVersion`: statuses `DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`.
  - `Clause` & `ClauseVersion`: statuses `DRAFT`, `UNDER_REVIEW`, `LAWYER_APPROVED`, `LOCKED`, `ARCHIVED`.
- **Document & Audit Metadata**:
  - `Document`: fields `filePath`, `fileSize`, `fileHash` added.
  - `AuditLog`: fields `entity`, `entityId`, `metadata`, `createdAt` added with compound index on `[entity, entityId]`.

### 1.2 Password Hashing & Seed Script (`package.json`, `prisma/seed.ts`)
- Installed `bcryptjs` (`^2.4.3`) and `@types/bcryptjs` (`^2.4.6`).
- `prisma/seed.ts` hashes passwords dynamically using `bcrypt.hashSync('password123', 10)`.
- All 4 demo accounts seeded and empirically verified with valid 60-character `$2a$10$` hashes:
  - `customer@demo.com` (role: CUSTOMER)
  - `nri@demo.com` (role: CUSTOMER)
  - `lawyer@demo.com` (role: LAWYER)
  - `admin@demo.com` (role: ADMIN)
- Seeded 5 legal clauses (`STANDARD_DECLARATION`, `EXECUTORS`, `GUARDIAN`, `NRI_ASSETS`, `BUSINESS_SUCCESSION`) each with Version 1 in `LAWYER_APPROVED` status.
- Seeded base legal template ("Comprehensive Indian Last Will & Testament") with Version 1 in `LAWYER_APPROVED` status.
- Seed script is completely idempotent (verified via multiple runs without unique constraint violations).

### 1.3 Secure Authentication & Session Enrichment (`src/lib/auth.ts`)
- CredentialsProvider `authorize()` uses `await bcrypt.compare(credentials.password, user.password)`.
- Email input is normalized via `.toLowerCase().trim()`.
- Password is wiped from session payload and never exposed to the client.
- JWT and session callbacks enrich both `token` and `session.user` with `id`, `name`, `email`, and `role`.
- Secret fallback handles development while supporting `process.env.NEXTAUTH_SECRET`.

### 1.4 Edge Middleware & Server-Side RBAC (`src/middleware.ts`)
- Implemented with NextAuth `withAuth` covering route prefixes: `['/customer/:path*', '/lawyer/:path*', '/admin/:path*']`.
- Enforces strict role access:
  - Unauthenticated requests: redirected to `/login` with `callbackUrl`.
  - `/admin/*`: strictly requires `ADMIN`. Non-admins redirected to their specific dashboard.
  - `/lawyer/*`: requires `LAWYER` or `ADMIN`. Unauthorized roles redirected to `/customer/dashboard`.
  - `/customer/*`: requires `CUSTOMER` or `ADMIN`. Unauthorized roles redirected to `/lawyer/dashboard`.
- 36 permutation test matrix executed by Challenger 2: 100% pass rate, zero infinite redirect loops.

### 1.5 Client Login Navigation Fix (`src/app/login/page.tsx`)
- Obsolete `window.location.href = "/api/auth/session"` redirect was completely eliminated.
- Replaced with direct role evaluation and `router.push`:
  - `CUSTOMER` -> `/customer/dashboard`
  - `LAWYER` -> `/lawyer/dashboard`
  - `ADMIN` -> `/admin/dashboard`
- User-visible error feedback banner displayed on invalid credentials.
- 1-click quick-fill buttons added for demo accounts.

---

## 2. Logic Chain

1. **Relational Constraints Guarantee State Hygiene**:
   - In SQLite/Prisma architectures without database-level compound keys, autosave operations inevitably generate duplicate records when network retries occur.
   - Adding `@@unique([caseId, questionId])`, `@@unique([templateId, version])`, and `@@unique([clauseId, version])` blocks collisions at the engine level (P2002), enabling atomic upserts for Milestone 3's debounced questionnaire engine.
2. **Cryptographic Salting Eliminates Credential Vulnerabilities**:
   - Storing plaintext credentials exposed all user accounts to trivial database extraction.
   - By hashing passwords with `bcryptjs` using 10 salt rounds and comparing via constant-time cryptographic functions, credentials in `dev.db` are secure against offline dictionary attacks.
3. **Edge Middleware Halts Unauthorized Access at Network Boundary**:
   - Hiding navigation links in client components is insufficient for security (direct URL entry previously allowed cross-role viewing).
   - Next.js edge middleware evaluates JWT role tokens before page rendering or server action execution, guaranteeing strict customer, lawyer, and administrative isolation.
4. **Independent Gate Verification Confirms Zero Regressions**:
   - All 5 gate checks (Worker, 2 Reviewers, 2 Challengers, Forensic Auditor) passed unanimously with 0 failures across over 200 automated empirical tests, zero TypeScript errors (`tsc --noEmit`), and clean production builds (`next build`).

---

## 3. Caveats

- **Mock Payment Architecture**: Payments remain configured with `mode: "MOCK"`, which is explicitly authorized for this MVP by `ORIGINAL_REQUEST.md` line 24. Transactional wrapping of mock payments with `prisma.$transaction` is scheduled for Milestone 5.
- **Per-Route Case Ownership Checks**: Edge middleware enforces route spaces by user role (`CUSTOMER`, `LAWYER`, `ADMIN`). Fine-grained per-resource ownership verification (e.g. `case.customerId === session.user.id` on `/api/questionnaire/save`) is scheduled for implementation in Milestone 3.

---

## 4. Conclusion & Gate Evaluation

### Gate Verdict Summary (`GATE_STATUS.md`)
| Agent | Role | Verdict | Source |
|-------|------|---------|--------|
| worker_m2 | teamwork_preview_worker | DONE (build passed) | handoff.md |
| reviewer_m2_1 | teamwork_preview_reviewer | APPROVE (75/75 checks passed) | handoff.md |
| reviewer_m2_2 | teamwork_preview_reviewer | APPROVE (57/57 passed, 131/131 tests passed) | handoff.md |
| challenger_m2_1 | teamwork_preview_challenger | APPROVE (24/24 passed) | handoff.md |
| challenger_m2_2 | teamwork_preview_challenger | APPROVE (111/111 passed) | handoff.md |
| auditor_m2 | teamwork_preview_auditor | CLEAN (0 integrity violations) | handoff.md |

**Gate Result: PASS**

All acceptance criteria for Milestone 2 are fully satisfied. The database schema, seed data, authentication provider, edge middleware, and login flow are robust, verified, and production-ready.

---

## 5. Verification Method

To independently verify Milestone 2 deliverables:

1. **Verify TypeScript Compilation**:
   ```bash
   node "node_modules/typescript/bin/tsc" --noEmit
   ```
   *Expected*: Code 0, 0 errors.

2. **Verify Next.js Production Build**:
   ```bash
   node "node_modules/next/dist/bin/next" build
   ```
   *Expected*: Code 0, all 14 routes compiled cleanly.

3. **Verify Seed Data & Demo Accounts**:
   ```bash
   node .agents/worker_m2/verify_seed.js
   ```
   *Expected*: All 4 demo accounts return `Bcrypt: true` and `Password valid: true`.

4. **Verify Relational Constraints & Stress Tests**:
   ```bash
   node .agents/challenger_m2_1/stress_test.js
   ```
   *Expected*: 24/24 tests pass, 0 failures.

5. **Verify Auth Logic & Edge RBAC Matrix**:
   ```bash
   npx tsx ".agents/challenger_m2_2/auth_challenge.ts"
   ```
   *Expected*: 111/111 tests pass, 0 failures.

6. **Verify Forensic Audit Anti-Cheating Suite**:
   ```bash
   node .agents/auditor_m2/forensic_test.js
   node .agents/auditor_m2/auth_middleware_test.js
   ```
   *Expected*: Live database confirms 35 indexes, P2002 error enforcement, and CLEAN integrity verdict.

---

## 6. Milestone State & Transition

| Milestone | Scope | Status |
|-----------|-------|--------|
| M1 | Codebase Audit, Performance Optimization & UI Foundation | DONE |
| **M2** | **Database Schema, Relational Integrity & Secure Authentication** | **DONE** |
| M3 | Customer Portal, Case Lifecycle & Debounced Questionnaire Engine | NEXT (Ready for Dispatch) |
| M4 | Deterministic Legal Workflow, Template/Clause System & DOCX Gen | PLANNED |
| M5 | Lawyer Portal, Admin Portal, Mock Payment & Audit Logging | PLANNED |
| M6 | Security Hardening, E2E Test Suite Pass (Tiers 1-4) & Adversarial Coverage (Tier 5) | PLANNED |

### Active Subagents
- None (all subagents completed and retired).

### Pending Decisions
- None.

### Remaining Work for Milestone 3
1. Implement Customer Registration (`/register`) and Case Creation (`/api/cases/create`).
2. Build Customer Dashboard (`/customer/dashboard`) with active cases, status badges, and resume links.
3. Build debounced questionnaire engine (`src/components/QuestionnaireEngine.tsx`) with 500ms debounce and autosave state indicators (`Saving...`, `Saved`, `Failed`).
4. Support conditional question branching (fix `hasMinorChildren` and child guardian prompt).
5. Enforce ownership verification (`case.customerId === session.user.id`) in `/api/questionnaire/save` to eliminate IDOR.

### Key Artifacts
- `prisma/schema.prisma`: Hardened schema with compound unique constraints and secondary indexes.
- `prisma/seed.ts`: Seed script with bcrypt-hashed demo accounts and sample legal clauses.
- `src/lib/auth.ts`: NextAuth CredentialsProvider with bcrypt.compare and role enrichment.
- `src/middleware.ts`: Edge middleware enforcing server-side RBAC on `/customer/*`, `/lawyer/*`, `/admin/*`.
- `src/app/login/page.tsx`: Role-based login routing with error display and 1-click demo buttons.
- `E:\Online will-writing & digital estate planning V0\.agents\sub_orch_m2_db_auth\GATE_STATUS.md`: Gate status report (PASS).
