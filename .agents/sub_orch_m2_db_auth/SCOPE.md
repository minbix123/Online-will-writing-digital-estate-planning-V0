# Scope: Milestone 2 — Database Schema, Relational Integrity & Secure Authentication

## Architecture
- Prisma ORM with SQLite backend (`prisma/schema.prisma`).
- Models: User, Case, QuestionnaireAnswer, Template, TemplateVersion, Clause, ClauseVersion, Document, Payment, LawyerReview, AuditLog.
- Foreign keys, cascading behaviors, compound unique constraints, and explicit secondary indexes.
- NextAuth Credentials provider with bcryptjs password comparison and JWT token enrichment (`id`, `name`, `email`, `role`).
- Next.js edge middleware (`src/middleware.ts`) enforcing role-based access control.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 6 | Database Schema Hardening | Add compound unique constraints, foreign keys, secondary indexes on all relations in Prisma schema | M2 | Survey (DB Explorer) & R2 |
| 7 | Password Hashing (bcryptjs) | Replace plaintext password storage and comparison with bcryptjs hashing in seed and auth | M2 | Survey (DB Explorer) & R3 |
| 8 | Secure Authentication & Demo Accounts | Verify customer, nri, lawyer, admin demo accounts with bcrypt password123, enforce NEXTAUTH_SECRET | M2 | Survey (DB Explorer) & R3 |
| 9 | Edge Middleware & RBAC | Implement `src/middleware.ts` for route protection and server-side role validation | M2 | Survey (DB Explorer) & R3 |
| 10 | Fix Login Redirect | Eliminate `window.location.href = "/api/auth/session"`, route users to role dashboard | M2 | Survey (DB/Perf) & R3 |

## Milestones / Sub-Tasks
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M2.1 | Prisma Schema Hardening | Compound unique constraints, foreign keys, secondary indexes, lifecycle enums/states | none | DONE |
| M2.2 | Dependencies & Seed Script | Install bcryptjs & @types/bcryptjs, update seed.ts with bcrypt hashing & legal clauses | M2.1 | DONE |
| M2.3 | Database Push & Migration | Apply schema push, run seed, verify DB records | M2.2 | DONE |
| M2.4 | Secure Authentication (NextAuth) | Update auth.ts with bcryptjs.compare, populate JWT and session fields | M2.3 | DONE |
| M2.5 | Edge Middleware & RBAC | Implement src/middleware.ts for role-based path protection | M2.4 | DONE |
| M2.6 | Verification & Build | Verify Next.js build, typecheck, authentication flow, and test assertions | M2.5 | DONE |

## Interface Contracts
- NextAuth Session: `session.user: { id: string, name: string, email: string, role: "CUSTOMER" | "LAWYER" | "ADMIN" }`
- Password Hash: `bcryptjs.hashSync('password123', 10)`
- Route Guards:
  - `/customer/*` -> `CUSTOMER` or `ADMIN`
  - `/lawyer/*` -> `LAWYER` or `ADMIN`
  - `/admin/*` -> `ADMIN`
  - Unauthenticated -> redirect to `/login`

## Code Layout (Exclusive Write Ownership)
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/auth.ts`
- `src/middleware.ts`
- `src/app/login/page.tsx`
- `package.json`
