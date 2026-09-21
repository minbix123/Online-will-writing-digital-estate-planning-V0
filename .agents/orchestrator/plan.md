# Execution Plan — Online Will-Writing & Digital Estate Planning MVP

## Objective
Convert the existing V0 codebase from a proof-of-concept into a genuinely functional, secure, performant MVP matching all requirements in ORIGINAL_REQUEST.md.

## Strategy: Project Pattern (Dual Track)
1. **Phase 0: Survey & Initial Codebase Audit**
   - Spawn 3 parallel Explorers:
     - Explorer 1: Performance, Next.js build/compilation, dependencies, server/client components, async params.
     - Explorer 2: Database architecture, Prisma schema, SQLite, migrations, seed data, auth & RBAC implementation.
     - Explorer 3: Feature audit: Customer Portal, Questionnaire Engine, Legal Workflow, Lawyer/Admin portals, Document Generation, Payment, Audit Logs.
   - Aggregate explorer reports into `PROJECT.md § Feature Inventory` and synthesize root causes of severe slowness.

2. **Phase 1: Performance Optimization & Clean Build (Milestone 1)**
   - Eliminate dev and prod compilation bottlenecks, excessive client re-renders, PrismaClient multi-instantiation, blocking I/O, Next.js 15 async params issues.
   - Ensure clean build, rapid page loads, landing page preserved.

3. **Phase 2: Database, Schema & Authentication (Milestones 2 & 3)**
   - Clean, comprehensive relational schema (User, Case, QuestionnaireAnswer, Template, Clause, Document, Payment, AuditLog) with indexes and relations.
   - Real authentication and RBAC with verified demo accounts (customer, nri, lawyer, admin), server-side authorization guards, IDOR protection.

4. **Phase 3: Core Customer Experience & Questionnaire Engine (Milestones 4 & 5)**
   - Customer dashboard, case lifecycle, JSON-driven questionnaire engine with debounced autosave, conditional branching, section navigation, and resume support.

5. **Phase 4: Legal Workflow & Document Generation (Milestones 6 & 9)**
   - Isolated deterministic rule engine (GUARDIAN_REQUIRED, NRI, BUSINESS_INTEREST, EXISTING_WILL).
   - Template & clause lifecycle (DRAFT -> UNDER_REVIEW -> LAWYER_APPROVED -> LOCKED/ARCHIVED).
   - Server-side DOCX generation from approved templates with data merging and audit logging.

6. **Phase 5: Professional Portals, Payment & Audit Logging (Milestones 7, 8, 10)**
   - Lawyer portal: case reviews, questionnaire viewing, flags, review notes, approve/reject.
   - Admin portal: statistics, user/case management, template management, audit log inspection.
   - Mock payment system with tier selection, transaction boundaries, persisted status.
   - UTC timestamped audit logging across all critical actions.

7. **Phase 6: Testing Track, Security Hardening & Victory Claim (Milestones 11 & 12)**
   - E2E testing track with 4 tiers (Feature, Boundary, Combination, Real-World Scenarios) + Tier 5 adversarial coverage hardening.
   - Full security audit (OWASP, IDOR, privilege escalation, injection, CSRF, validation).
   - Final production verification: typecheck, lint, build, seed, tests 100% pass.
   - Submit Victory Claim report to Sentinel.
