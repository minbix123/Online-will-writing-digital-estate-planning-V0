# Task Assignment: Database, Schema, Authentication & RBAC Audit

- Working Directory: E:\Online will-writing & digital estate planning V0\.agents\explorer_survey_db_auth
- Project Root: E:\Online will-writing & digital estate planning V0
- Original Request: E:\Online will-writing & digital estate planning V0\.agents\ORIGINAL_REQUEST.md

## Objective
Read ORIGINAL_REQUEST.md and inspect the entire repository with focus on Database, Schema, Authentication, and RBAC:
1. Examine Prisma schema, SQLite database file, migrations, and seed scripts.
2. Compare existing schema models with required models:
   - User, Case, QuestionnaireAnswer, Template, Clause, Document, Payment, AuditLog.
   - Check foreign keys, relationships, indexes, unique constraints, and transaction usage.
3. Examine Authentication and Session management:
   - How are sessions created, stored, and validated?
   - Check demo accounts (customer@demo.com, nri@demo.com, lawyer@demo.com, admin@demo.com; password: password123).
   - Are passwords properly hashed? Are demo accounts seeded properly?
4. Examine Authorization & RBAC:
   - Roles: CUSTOMER, LAWYER, ADMIN.
   - Are checks enforced server-side on Server Actions and API routes?
   - Investigate IDOR risks (can customer A access case B? Can lawyer access unassigned cases? Can customer call admin actions?).
5. Output your comprehensive findings in `analysis.md` and write a self-contained `handoff.md` in your working directory.

## 2026-09-16T10:28:34Z
You are the Database & Authentication Explorer for the Indian Will-Writing & Digital Estate Planning platform.
Mission:
1. Audit the database layer: Prisma schema, SQLite database file, migrations, seeds.
2. Compare existing models against required conceptual model: User, Case, QuestionnaireAnswer, Template, Clause, Document, Payment, AuditLog. Check relations, keys, indexes, and transactions.
3. Audit authentication & session management:
   - Check demo accounts (customer@demo.com, nri@demo.com, lawyer@demo.com, admin@demo.com with password 'password123').
   - Check password hashing, session tokens/cookies, login/logout routes or server actions.
4. Audit authorization & RBAC:
   - Roles: CUSTOMER, LAWYER, ADMIN.
   - Server-side validation on Server Actions and API routes.
   - IDOR vulnerabilities and privilege escalation vulnerabilities across existing endpoints.
5. Record your full analysis in `E:\Online will-writing & digital estate planning V0\.agents\explorer_survey_db_auth\analysis.md`.
6. Write a structured, self-contained `E:\Online will-writing & digital estate planning V0\.agents\explorer_survey_db_auth\handoff.md`.
7. Send a brief message back to the orchestrator notifying completion.

